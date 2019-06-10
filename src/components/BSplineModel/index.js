/* @flow */

import { BSpline } from '../../algebra/BSpline';
import canvasInvert from '../../shared/canvasInvert';
import concat from 'lodash/concat';
import { ControlPointIndicator } from './ControlPointIndicator';
import { Evaluable } from '../../algebra/Evaluable';
import LinearProgress from '@material-ui/core/LinearProgress';
import * as PIXI from 'pixi.js';
import PropTypes from 'prop-types';
import * as React from 'react';
import reduceDimens from '../../shared/reduceDimens';
import round from 'lodash/round';
import shiftAndScaleVectors from '../../shared/shiftAndScaleVectors';
import times from 'lodash/times';
import Tracer from './Tracer';
import TraceEmitter from './TraceEmitter';
import {
  add, Vector,
  type StrictTupleVector, type TupleVector,
  safeOneDValue,
} from '../../algebra/Vector';
import visibleBounds from '../../shared/visibleBounds';

/**
 * Fraction of the B-Spline width that is added into the
 * visible-bounds as padding for the canvas.
 */
const VISIBLE_PADDING = 0.1;

/**
 * Thickness of lower-degree basis-splines.
 */
const BASIS_SPLINE_THICKNESS = 2;

/**
 * Thickness of the actual B-Spline.
 */
const MAIN_SPLINE_THICKNESS = 3;

/**
 * Precision used in BSpline evaluations.
 */
const PREC = 4;

/**
 * Converts the progress returned by {@code Tracer}
 * into a percentage (used by material-ui's progress bar).
 */
const TO_PERCENT_SCALE = 100;

/**
 * Rounds a number to {@code PREC} precision.
 *
 * @param {number} roundee - number to be rounded
 * @return rounded roundee
 * @see PREC
 */
function roundPrec(roundee: number) {
  return round(roundee, PREC);
}

/**
 * Spawns multiple tracers on all basis-splines and returns
 * a {@code Promise} that resolves with an ordered array
 * of each spline's evaluations.
 *
 * @param {number} minKnot
 * @param {number} maxKnot
 * @param {number} queryStep
 * @param {number} enforcedDimensions
 * @param {Array<Evaluable>} splines
 * @return promise that resolves with ordered array of results
 */
function traceAllAsync(/* eslint-disable-line */
  minKnot: number, maxKnot: number,
  queryStep: number, enforcedDimensions: number,
  splines: $ReadOnlyArray<Evaluable>,
  onUpdateProgress: (number) => void
): Promise<Array<Array<StrictTupleVector>>> {
  return Promise.all(splines.map((spline) => new Tracer(
    minKnot, maxKnot, queryStep, enforcedDimensions, spline,
    onUpdateProgress
  ).run()));
}

type Props = {
  colors: Array<number>,
  curveDegree: number,
  controlPoints: Array<number | TupleVector>,
  knotVector: StrictTupleVector,
  enforcedDimensions: number
};

type State = {
  isGraphReady: boolean,
  graphProgress: number,
  graphLoading: boolean,
  minKnot: number,
  maxKnot: number,
  spline: Evaluable
};

export class BSplineModel extends React.Component<Props, State> {
  basisEmitter: TraceEmitter;

  /**
   * Reference to the canvas element used by this component. It
   * is used in {@code pixi.app}.
   *
   * @name BSplineModel#canvasRef
   */
  canvasRef: {
    current: ?React.ElementRef<'canvas'>
  } = React.createRef();

  /**
   * PIXI.js related state. This is a shared pool of data
   * used during one render. Any modifications should not
   * need another render.
   */
  pixi: {
    app: PIXI.Application,
    controlPointsProjections: Array<StrictTupleVector>,
    controlPointIndicators: Array<ControlPointIndicator>,
    graphPaper: PIXI.Graphics,
    height: number,
    planarPoints: Array<StrictTupleVector>,
    visibleBounds: {
      minX: number, maxX: number,
      minY: number, maxY: number
    },
    basisPoints: Array<Array<StrictTupleVector>>,
    width: number,
    queryStep: number
  };

  state = {
    isGraphReady: false,
    graphProgress: 100,
    graphLoading: false,
    minKnot: 0,
    maxKnot: 1,
    spline: { evaluate: () => {
      throw new Error('Doesn\'t exist.');
    } },
  };

  constructor(props: Props) {
    super(props);
    this.basisEmitter = new TraceEmitter(this.onTracedBasis);
  }

  componentDidMount() {
    const dimens = reduceDimens(null,
      [/* eslint-disable */
        { width: 0, height: 0, margin: 0.1 },
        { width: 768, height: 1024, margin: 0.33 },
        { width: 960, height: 560, marginX: 0.5, marginY: 0.5 },
      ], false);
      /* eslint-enable */

    const pixiApp = new PIXI.Application({
      antialias: true,
      backgroundColor: 0xffffff,
      height: dimens.height,
      view: this.canvasRef.current,
      resolution: 2,
      width: dimens.width,
    });
    pixiApp.stage.sortableChildren = true;

    const graphPaper = new PIXI.Graphics();
    graphPaper.x = 0;
    graphPaper.y = 0;
    graphPaper.height = dimens.height;
    graphPaper.width = dimens.width;

    this.pixi = {
      app: pixiApp,
      controlPointsProjections: [],
      controlPointIndicators: [],
      graphPaper,
      height: dimens.height,
      planarPoints: [],
      queryStep: 0.005,
      basisPoints: [],
      visibleBounds: {},
      width: dimens.width,
    };

    this.forceUpdate();
  }

  componentWillUnmount() {
    this.pixi.app.stage.removeChildren();
    this.pixi.app.stage.destroy({
      children: true,
    });

    this.pixi.app.stage = null;
    this.pixi.app.renderer.destroy(true);
    this.pixi.app.renderer = null;
  }

  /**
   * Recalculates the step at which B-splines are
   * evaluated.
   */
  adjustQueryStep(
    minKnot: number, maxKnot: number,
    height?: number, width?: number = this.pixi.width
  ) {
    if (this.props.enforcedDimensions === 1) {
      this.pixi.queryStep = (maxKnot - minKnot) * 1 / width;
    }

    return this.pixi.queryStep;
  }

  /**
   * Transforms the B-Spline coordinates into actual
   * pixel coordinates.
   *
   * @param {Array<StrictTupleVector>} planarPoints - position
   *    vectors in two-dimensions.
   * @param {boolean} newVisibleBounds - whether to create a
   *    new visible boundary (or to use the existing one).
   */
  transformToCanvas(
    planarPoints: Array<StrictTupleVector>, newVisibleBounds: boolean = false
  ) {
    const vBounds = newVisibleBounds ?
      visibleBounds(planarPoints, VISIBLE_PADDING) :
      this.pixi.visibleBounds;
    const { minX, minY, maxX, maxY } = vBounds;

    shiftAndScaleVectors(planarPoints, Vector(-minX, -minY),
      this.pixi.width / (maxX - minX),
      this.pixi.height / (maxY - minY));
    canvasInvert(planarPoints, this.pixi.height);

    if (newVisibleBounds) {
      this.pixi.visibleBounds = vBounds;
    }

    return planarPoints;
  }

  projectControlPoints() {
    const { minKnot, maxKnot } = this.state;

    let controlPointsProjections: Array<StrictTupleVector> = [];
    if (this.props.enforcedDimensions === 1) {
      for (let i = 0; i < this.props.controlPoints.length; i++) {
        controlPointsProjections.push(
          Vector(round(
            minKnot + (i * (maxKnot - minKnot) / (this.props.controlPoints.length - 1)), PREC),
          safeOneDValue(this.props.controlPoints[i])));
      }
    } else if (this.props.enforcedDimensions === 2) {
      controlPointsProjections = (this.props.controlPoints.slice(0): any);
    }

    return controlPointsProjections;
  }

  pixify(
    mainTrace: Array<StrictTupleVector>,
    basesTrace: Array<Array<StrictTupleVector>>,
    controlPointsProjections: Array<StrictTupleVector>
  ) {
    const darr = (this.props.enforcedDimensions === 1) ?
     [Vector(0,0), Vector(1,0)] : [];

    this.pixi.visibleBounds = visibleBounds(
      concat(mainTrace, controlPointsProjections, darr), VISIBLE_PADDING);
    this.pixi.planarPoints = this.transformToCanvas(mainTrace, false);
    this.pixi.basisPoints = basesTrace;
    basesTrace.forEach((channel) => {
      this.transformToCanvas(channel, false);
    });
    this.pixi.controlPointsProjections =
      this.transformToCanvas(controlPointsProjections, false);
  }

  onTracedBasis = (basisTraces: Array<Array<StrictTupleVector>>) => {
    const planarPoints: Array<StrictTupleVector> = [];
    const { minKnot, maxKnot } = this.state;

    /* Sum up basis spline curves to form main curve. */
    if (this.props.enforcedDimensions === 1) {
      for (let param = minKnot, idx = 0; param <= maxKnot;
        param = roundPrec(param + this.pixi.queryStep), idx++) {
        let sum = 0;
        for (let bsIdx = 0; bsIdx < basisTraces.length; bsIdx++) {
          sum += basisTraces[bsIdx][idx].y;
        }
        planarPoints.push(Vector(param, round(sum, PREC)));
      }
    } else {
      for (let param = minKnot, idx = 0; param <= maxKnot;
        param = roundPrec(param + this.pixi.queryStep), idx++) {
        let sum = 0;
        for (let bsIdx = 0; bsIdx < basisTraces.length; bsIdx++) {
          sum = add(sum, basisTraces[bsIdx][idx]);
        }
        planarPoints.push((sum: any));
      }
    }

    this.pixify(planarPoints, basisTraces, this.projectControlPoints());
    this.setState({ isGraphReady: true, graphLoading: false });
  }

  onUpdateGraphProgress = (progress: number) => {
    this.setState({
      graphProgress: progress * TO_PERCENT_SCALE,
    });
  }

  graph = () => {
    const spline = BSpline(this.props.knotVector,
      this.props.controlPoints, this.props.curveDegree, true);
    const minKnot = spline.curveRange.lowerBoundary;
    const maxKnot = spline.curveRange.upperBoundary;
    this.adjustQueryStep(minKnot, maxKnot);
    const { queryStep } = this.pixi;

    this.setState({
      graphProgress: 0,
      graphLoading: true,
      minKnot, maxKnot,
    });

    this.basisEmitter.run(spline.basis.map((basisPoly) =>
      new Tracer(minKnot, maxKnot, queryStep,
        this.props.enforcedDimensions, basisPoly,
        this.onUpdateGraphProgress)
    ));
  }

  /**
   * Evaluates all required position vectors that are needed
   * by {@code BSplineModel#draw} to execute.
   *
   * These include: basis points, main-spline points, control
   * point projections (mapped in the 2D canvas plane).
   *
   * This an expensive computation that (should) be executed
   * in background.
   */
  graphDeprecated = () => {
    this.setState({
      graphProgress: 0,
      graphLoading: true,
    });

    const spline = BSpline(this.props.knotVector,
      this.props.controlPoints, this.props.curveDegree, true);
    const minKnot = spline.curveRange.lowerBoundary;
    const maxKnot = spline.curveRange.upperBoundary;
    this.adjustQueryStep(minKnot, maxKnot);
    const { queryStep } = this.pixi;

    /* planarPoints is the 2-D projection of the spline */
    const planarPoints: Array<StrictTupleVector> = [];

    traceAllAsync(minKnot, maxKnot, queryStep,
      this.props.enforcedDimensions, spline.basis,
      this.onUpdateGraphProgress).then((basisPoints: any) => {
      /* Sum up basis spline curves to form main curve. */
      if (this.props.enforcedDimensions === 1) {
        for (let param = minKnot, idx = 0; param <= maxKnot;
          param = roundPrec(param + this.pixi.queryStep), idx++) {
          let sum = 0;
          for (let bsIdx = 0; bsIdx < basisPoints.length; bsIdx++) {
            sum += basisPoints[bsIdx][idx].y;
          }
          planarPoints.push(Vector(param, round(sum, PREC)));
        }
      } else {
        for (let param = minKnot, idx = 0; param <= maxKnot;
          param = roundPrec(param + this.pixi.queryStep), idx++) {
          let sum = 0;
          for (let bsIdx = 0; bsIdx < basisPoints.length; bsIdx++) {
            sum = add(sum, basisPoints[bsIdx][idx]);
          }
          planarPoints.push((sum: any));
        }
      }

      /* Calculate positions of control-points. */
      let controlPointsProjections: Array<StrictTupleVector> = [];
      if (this.props.enforcedDimensions === 1) {
        for (let i = 0; i < this.props.controlPoints.length; i++) {
          controlPointsProjections.push(
            Vector(round(
              minKnot + (i * (maxKnot - minKnot) / (this.props.controlPoints.length - 1)), PREC),
            safeOneDValue(this.props.controlPoints[i])));
        }
      } else if (this.props.enforcedDimensions === 2) {
        controlPointsProjections = (this.props.controlPoints.slice(0): any);
      }

      this.pixi.visibleBounds = visibleBounds(
        concat(planarPoints, controlPointsProjections), VISIBLE_PADDING);
      this.pixi.planarPoints = this.transformToCanvas(planarPoints, false);
      this.pixi.basisPoints = basisPoints;
      basisPoints.forEach((channel) => {
        this.transformToCanvas(channel, false);
      });
      this.pixi.controlPointsProjections =
        this.transformToCanvas(controlPointsProjections, false);

      this.setState({
        isGraphReady: true,
        graphProgress: 100,
        graphLoading: false,
      });
    });
  }

  /**
   * Draws this component using PIXI. It expects that {@code graph}
   * has been run already.
   */
  draw() {
    this.pixi.app.stage.removeChildren();
    this.pixi.graphPaper.clear();

    if (this.pixi.basisPoints) {
      let i = 1;
      this.pixi.basisPoints.forEach((channel) => {
        this.pixi.graphPaper.lineStyle(BASIS_SPLINE_THICKNESS, this.props.colors[i]);
        this.pixi.graphPaper.moveTo(channel[0].x, channel[0].y);
        channel.forEach((point) => {
          this.pixi.graphPaper.lineTo(point.x, point.y);
        });
        ++i;
      });
    }
    this.pixi.graphPaper.lineStyle(MAIN_SPLINE_THICKNESS);
    this.pixi.graphPaper.moveTo(this.pixi.planarPoints[0].x,
      this.pixi.planarPoints[0].y);
    this.pixi.planarPoints.forEach((point) => {
      this.pixi.graphPaper.lineTo(point.x, point.y);
    });

    const ctlPts = [];
    this.pixi.controlPointIndicators = ctlPts;
    this.pixi.controlPointsProjections.forEach((point) => {
      ctlPts.push(ControlPointIndicator(point.x, point.y));
    });

    this.pixi.app.stage.addChild(
      this.pixi.graphPaper,
      ...ctlPts
    );
  }

  drawLoading() {
    this.pixi.app.stage.removeChildren();
    this.pixi.app.stage.addChild(
      new PIXI.Text('Loading', {
        fontFamily: 'Arial',
        fontSize: 64,
      })
    );
  }

  render() {
    if (this.state.isGraphReady) {
      this.draw();
      /* eslint-disable-next-line react/no-direct-mutation-state */
      this.state.isGraphReady = false;
    } else if (this.pixi && !this.state.graphLoading) {
      requestIdleCallback(() => this.graph());
      this.drawLoading();
    }

    const style: any = {
      border: '1px solid black',
      margin: '24px',
    };

    if (this.pixi) {
      style.height = `${ this.pixi.height }px`;
      style.width = `${ this.pixi.width }px`;
    }

    return (
      <div style={{ flexGrow: '1', textAlign: 'center' }}>
        <canvas ref={this.canvasRef} style={style} />
        {(this.state.graphLoading) ?
          <LinearProgress
            value={this.state.graphProgress}
            variant="determinate"/> :
          null
        }
      </div>
    );
  }
}

BSplineModel.propTypes = {
  colors: PropTypes.array,
  curveDegree: PropTypes.number,
  controlPoints: PropTypes.array,
  knotVector: PropTypes.array,
};

export default BSplineModel;
