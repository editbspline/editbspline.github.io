/* @flow */

import {
  BSpline, type StdBSpline,
  UniformKnotVector,
} from '../../graphs/BSpline';
import canvasInvert from '../../shared/canvasInvert';
import concat from 'lodash/concat';
import { ControlPointIndicator } from './ControlPointIndicator';
import * as PIXI from 'pixi.js';
import PropTypes from 'prop-types';
import * as React from 'react';
import reduceDimens from '../../shared/reduceDimens';
import round from 'lodash/round';
import shiftAndScaleVectors from '../../shared/shiftAndScaleVectors';
import {
  add,
  safeDimens, Vector,
  type StrictTupleVector, type TupleVector,
  safeOneDValue,
  operandDimens
} from '../../graphs/Vector';
import visibleBounds from '../../shared/visibleBounds';

export type BSplineModelProps = {
  curveDegree: ?number,
  controlPoints: Array<number | TupleVector>,
  knotVector?: StrictTupleVector
};

type BSplineModelState = {
  controlPoints: Array<number | TupleVector>,
  curveDegree: number,
  domId: string,
  doNotFlattenSpline: boolean,
  dimensions: number,
  knotVector: TupleVector,
  pixiDirty: boolean,
  queryStep: number
};

/** Precision used in BSplineModel */
const PREC = 4;

export class BSplineModel extends React.Component<BSplineModelProps, BSplineModelState> {
  canvasRef: {
    current: ?React.ElementRef<'canvas'>
  };

  pixi: {
    app: PIXI.Application,
    controlPointsProjections: Array<StrictTupleVector>,
    graphPaper: PIXI.Graphics,
    height: number,
    planarPoints: Array<StrictTupleVector>,
    visibleBounds: {
      minX: number,
      maxX: number,
      minY: number,
      maxY: number
    },
    width: number
  };

  constructor(props: BSplineModelProps) {
    super(props);

    const curveDegree = (props.curveDegree) ?
      props.curveDegree : 1;

    const knotVector: StrictTupleVector = (props.knotVector) ?
      props.knotVector :
      UniformKnotVector(props.controlPoints.length + curveDegree + 1);

    this.state = {
      controlPoints: props.controlPoints,
      curveDegree,
      doNotFlattenSpline: false,
      domId: String(Math.random()),
      dimensions: operandDimens(...props.controlPoints),
      knotVector,
      pixiDirty: false,
      queryStep: 0.005,// will be recalculated
    };

    this.canvasRef = React.createRef();
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
      graphPaper,
      height: dimens.height,
      planarPoints: [],
      width: dimens.width,
    };

    this.setState({
      pixiDirty:true
      });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.curveDegree !== this.props.curveDegree &&
        this.props.curveDegree) {
      const knotVector = this.props.knotVector ?
        this.props.knotVector :
        UniformKnotVector(this.props.controlPoints.length + this.props.curveDegree + 1);
      this.setState({
        curveDegree: this.props.curveDegree,
        knotVector: knotVector
      });
    } else if (prevProps.controlPoints !== this.props.controlPoints) {
      const knotVector = UniformKnotVector(this.props.controlPoints.length + this.props.curveDegree + 1);
      this.setState({
        controlPoints: this.props.controlPoints,
        knotVector: knotVector,
        dimensions: operandDimens(...this.props.controlPoints)
      });
    } else if (prevProps.knotVector !== this.props.knotVector) {
      this.setState({
        knotVector: this.props.knotVector
      });
    }
  }

  componentWillUnmount() {
    this.pixi.app.stage.removeChildren();
    this.pixi.app.stage.destroy({
      children: true,
    });

    this.pixi.app.stage = null;
    this.pixi.renderer.destroy(true);
    this.pixi.renderer = null;
  }

  #adjustQueryStep(minKnot, maxKnot, height=this.pixi.height, width=this.pixi.width) {
    if (this.state.dimensions === 1) {
      this.state.queryStep = (maxKnot - minKnot) * 1 / width;
    }

    return this.state.queryStep;
  }

  #transformToCanvas(planarPoints, newVisibleBounds=false) {
    const vBounds = newVisibleBounds ? visibleBounds(planarPoints, 0.1) :
                      this.pixi.visibleBounds;
    const { minX, minY, maxX, maxY, } = vBounds;

    shiftAndScaleVectors(planarPoints, Vector(-minX, -minY),
      this.pixi.width / (maxX - minX),
      this.pixi.height / (maxY - minY));
    canvasInvert(planarPoints, this.pixi.height);

    if (newVisibleBounds)
      this.pixi.visibleBounds = vBounds;

    return planarPoints;
  }

  graph = () => {
    const spline = BSpline(this.state.knotVector, this.state.controlPoints, this.state.curveDegree, true);
    console.log(this.state.knotVector);
    const minKnot= spline.curveRange.lowerBoundary;
    const maxKnot= spline.curveRange.upperBoundary;
    this.#adjustQueryStep(minKnot, maxKnot);

    /* planarPoints is the 2-D projection of the spline */
    const planarPoints = [];

    const sideChannels = [];

    if (this.state.dimensions === 1) {
      spline.basis.forEach(bpoly => {
        const basisPoints = [];
        for (let i = minKnot; i <= maxKnot;
          i = round(i + this.state.queryStep, PREC)) {
          basisPoints.push(Vector(i, round(bpoly.evaluate(i), PREC)));
        }
        sideChannels.push(basisPoints);
      });

      for (let i = minKnot, idx = 0; i <= maxKnot;
        i = round(i + this.state.queryStep, PREC), idx++) {
        const sum = 0;
        for (let j = 0; j < sideChannels.length; j++) {
          sum += sideChannels[j][idx].y;
        }
        planarPoints.push(Vector(i, round(sum, PREC)));
      }
    } else if(this.state.dimensions === 2) {
      spline.basis.forEach(bpoly => {
        const basisPoints = [];
        for (let i = minKnot; i <= maxKnot;
          i = round(i + this.state.queryStep, PREC)) {
          basisPoints.push(bpoly.evaluate(i));
        }
        sideChannels.push(basisPoints);
      });


      for (let i = minKnot, idx = 0; i <= maxKnot;
        i = round(i + this.state.queryStep, PREC), idx++) {
        const sum = 0;
        for (let j = 0; j < sideChannels.length; j++) {
          sum = add(sum, sideChannels[j][idx]);
        }
        planarPoints.push(sum);
      }
    } else {
      throw new Error('invalid path');
    }

    let controlPointsProjections = [];
    if (this.state.dimensions === 1) {
      for (let i = 0; i < this.state.controlPoints.length; i++) {
        controlPointsProjections.push(
          Vector(round(minKnot + (i * (maxKnot - minKnot) / (this.state.controlPoints.length-1)), PREC),
            safeOneDValue(this.state.controlPoints[i])));
      }
    } else if (this.state.dimensions === 2) {
      controlPointsProjections = this.state.controlPoints.slice(0);
    }

    this.pixi.visibleBounds = visibleBounds(
      concat(planarPoints, controlPointsProjections), .1);

    this.pixi.planarPoints = this.#transformToCanvas(planarPoints, false);
    this.pixi.sideChannels = sideChannels;
    sideChannels.forEach(channel => {
        this.#transformToCanvas(channel, false);
      });

    this.pixi.controlPointsProjections =
      this.#transformToCanvas(controlPointsProjections, false);
  }

  draw() {
    this.pixi.app.stage.removeChildren();
    this.pixi.graphPaper.clear();

    if (this.pixi.sideChannels) {
      let i = 1;
      this.pixi.sideChannels.forEach(channel => {
        this.pixi.graphPaper.lineStyle(2, this.props.colors[i]);
        this.pixi.graphPaper.moveTo(channel[0].x, channel[0].y);
        channel.forEach(point => {
          this.pixi.graphPaper.lineTo(point.x, point.y);
        });
        ++i;
      });
    }
    this.pixi.graphPaper.lineStyle(3);
    this.pixi.graphPaper.moveTo(this.pixi.planarPoints[0].x,
      this.pixi.planarPoints[0].y);
    this.pixi.planarPoints.forEach((point) => {
      this.pixi.graphPaper.lineTo(point.x, point.y);
    });

    const ctlPts = this.pixi.controlPointIndicators = [];
    this.pixi.controlPointsProjections.forEach((point) => {
      ctlPts.push(ControlPointIndicator(point.x, point.y))
    });

    this.pixi.app.stage.addChild(
        this.pixi.graphPaper,
        ...ctlPts
      );
    // further rendering shouldn't happen
    /* eslint-disable-next-line react/no-direct-mutation-state */
    this.state.pixiDirty = false;
  }

  render() {
    if (this.pixi && this.state.pixiDirty) {
      this.graph();
      this.draw();
    }

    const style = {
      border: '1px solid black',
      margin: '24px'
    };

    if (this.pixi) {
      style.height = `${this.pixi.height}px`;
      style.width = `${this.pixi.width}px`;
    }

    return (
      <div style={{ flexGrow: '1', textAlign: 'center'}}>
        <canvas ref={this.canvasRef} style={style} />
      </div>
    );
  }

  static getDerivedStateFromProps(props: BSplineEditorProps) {
    return {
      pixiDirty: true
    };
  }
}

BSplineModel.propTypes = {
  colors: PropTypes.array,
  curveDegree: PropTypes.number,
  controlPoints: PropTypes.array,
  knotVector: PropTypes.array,
};

export default BSplineModel;
