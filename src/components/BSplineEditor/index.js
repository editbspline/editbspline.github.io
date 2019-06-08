/* @flow */

import Box from '@material-ui/core/Box';
import { BSplineModel } from '../BSplineModel';
import ControlPointsEditor from './ControlPointsEditor';
import constant from 'lodash/constant';
import Divider from '@material-ui/core/Divider';
import MultiSlider from 'multi-slider/src';
import NumberField from '../NumberField';
import * as React from 'react';
import times from 'lodash/times';
import { UniformKnotVector } from '../../algebra/BSpline';
import {
  type TupleVector, type StrictTupleVector,
  safeUpdateComponent,
  operandDimens,
  safeUpdateDimensions,
  Vector,
} from '../../algebra/Vector';

/**
 * Scaling factor between the knot-vector and the
 * values used in the {@code MultiSlider} component.
 */
const KV_TO_MS = 100;

const HEX_BASE = 16;

const CSS_LEN = 6;

const MAX_COLOR = 0xffffff;

type BSplineEditorProps = {
  controlPoints: Array<TupleVector | number>,
  curveDegree: number
};

type BSplineEditorState = {
  controlPoints: Array<TupleVector | number>,
  curveDegree: number,
  dimensions: number,
  knotVector: StrictTupleVector,
  /* should be used to build a feature where knotVector is
     is changed only when the user finally lifts the mouse
     button while dragging on multi-slider to change the
     knot vector to prevent continuous re-calculations. */
  modifiedKnotVector: StrictTupleVector
};

/**
 * Full-fledged B-Spline editing component. It provides all the
 * tools to manipulate and view B-Splines.
 */
export class BSplineEditor extends React.Component<BSplineEditorProps, BSplineEditorState> {
  /**
   * Cache of colors used by {@code this.render} to pass on
   * to the {@code MultiSlider} and {@code BSplineModel}
   * components; these colors correspond b-spline basis
   * polynomials to their section of the knot-vector.
   */
  colors: Array<number>;

  /**
   * Cache of the CSS color string version of {@code this.colors}
   * used by {@code this.render}.
   */
  stringColors: Array<string>;

  constructor(props: BSplineEditorProps) {
    super(props);

    const knotVector = UniformKnotVector(
      props.controlPoints.length + props.curveDegree + 1);
    this.state = {
      controlPoints: props.controlPoints,
      curveDegree: props.curveDegree,
      dimensions: operandDimens(...props.controlPoints),
      knotVector,
      modifiedKnotVector: knotVector,
    };
  }

  /**
   * Builds an array that calculates the differences between
   * elements of the array {@code [0, ...this.state.modifiedKnotVector, 1]}
   * scaled 100 times, which can then be used as the {@code values}
   * prop in the corresponding {@code MultiSlider} component to
   * control the modified knot-vector.
   *
   * @return {@code values} props corresponding to the modified
   *    knot-vector for a {@code MultiSlider} component.
   */
  diffKnots(): Array<number> {
    const { modifiedKnotVector } = this.state;
    const diffs: Array<number> = new Array(this.state.knotVector.length + 1);

    diffs[0] = 0;
    for (let i = 1; i < modifiedKnotVector.length; i++) {
      diffs[i] = KV_TO_MS *
        (modifiedKnotVector[i] - modifiedKnotVector[i - 1]);
    }

    diffs[modifiedKnotVector.length] = KV_TO_MS *
      (1 - modifiedKnotVector[modifiedKnotVector.length - 1]);

    return diffs;
  }

  /**
   * Reverse of {@code this.diffKnots}. It calculates a knot
   * vector from the differences of elements in the array
   * [0, ...storedKnotVector, 1] scaled x100 times.
   *
   * @return knot-vector encoded in diff-formated as described
   */
  cumulateDiffs = (diffs: Array<number>) => {
    const knots = new Array(diffs.length - 1);
    let val = 0;

    for (let i = 0; i < knots.length; i++) {
      val += diffs[i];
      knots[i] = val / KV_TO_MS;
    }

    return Vector(...knots);
  }

  /**
   * Handles a request to modify a single vector component
   * of a control-point. It modifies the state.
   *
   * @param {number} index - index of control point
   * @param {number} comp - index of vector component to modify
   * @param {number} val - new value of vector component
   */
  onPublishComponentChange = (index: number, comp: number, val: number) => {
    this.setState((prevState) => {
      const newControlPoints = prevState.controlPoints.slice(0);
      newControlPoints[index] = safeUpdateComponent(
        newControlPoints[index], comp, val, prevState.dimensions);

      return {
        controlPoints: newControlPoints,
      };
    });
  }

  /**
   * Handles a request to insert control-point(s) at an
   * optional index. These control-points will be
   * {@code StrictTupleVector} zero vectors. This method
   * updates the state.
   *
   * @param {number} count - no. of control-points to add
   * @param {number} index - where to add in the control-points array
   */
  onInsertControlPoint = (
    count: number, index: number = this.state.controlPoints.length - 1
  ) => {
    this.setState((prevState) => {
      const newControlPoints = prevState.controlPoints.slice(0);
      newControlPoints.splice(index, 0, ...times(count,
        constant(Vector(...times(this.state.dimensions, constant(0))))
      ));

      const knotVector = UniformKnotVector(
        newControlPoints.length + this.state.curveDegree + 1);
      return {
        controlPoints: newControlPoints,
        knotVector,
        modifiedKnotVector: knotVector,
      };
    });
  }

  /**
   * Handles a request to delete a control-point at the
   * specified index.
   *
   * @param {number} index - index in the control-points' array
   *    to delete the control-point at.
   */
  onDeleteControlPoint = (index: number) => {
    const { controlPoints, curveDegree } = this.state;

    if (controlPoints.length - 1 === curveDegree) {
      return;
    }

    this.setState((prevState) => {
      const newControlPoints = prevState.controlPoints.slice(0);
      newControlPoints.splice(index, 1);

      const knotVector = UniformKnotVector(
        newControlPoints.length + prevState.curveDegree + 1);
      return {
        controlPoints: newControlPoints,
        knotVector,
        modifiedKnotVector: knotVector,
      };
    });
  }

  /**
   * Handles a change in the requested curve degree. It
   * updates the state.
   *
   * @param {number} curveDegree - new requested curve degree
   */
  onChangeDegree = (curveDegree: number) => {
    const { controlPoints } = this.state;
    if (curveDegree >= controlPoints.length) {
      return;
    }

    const knotVector =
      UniformKnotVector(controlPoints.length + curveDegree + 1);
    this.setState({
      curveDegree,
      knotVector,
      modifiedKnotVector: knotVector,
    });
  }

  /**
   * Handles a change in the requested control-point/curve
   * dimensions. It updates the state.
   *
   * @param {number} dimensions - new dimensions requested
   */
  onChangeDimensions = (dimensions: number) => {
    this.setState((prevState) => {
      const controlPoints = times(prevState.controlPoints.length,
        (idx) => (
          safeUpdateDimensions(prevState.controlPoints[idx], dimensions)
        ));

      return {
        controlPoints,
        dimensions,
      };
    });
  }

  /**
   * Handles a change in the knot-vector editing
   * {@code MultiSlider} component. It updates the
   * state.
   *
   * @param {Array<number>} diffs - new values as given
   *    by {@code MultiSlider}.
   * @see {BSplineEditor#diffKnots}
   */
  onChangeKnot = (diffs: Array<number>) => {
    const knotVector = this.cumulateDiffs(diffs);

    this.setState({
      knotVector,
      modifiedKnotVector: knotVector,
    });
  }

  render() {
    if (!this.colors || this.colors.length !== this.state.knotVector.length + 2) {
      this.colors = new Array(this.state.knotVector.length + 2);
      this.stringColors = new Array(this.colors.length);
      for (let i = 0; i < this.colors.length; i++) {
        this.colors[i] = Math.round(Math.random() * MAX_COLOR);
        this.stringColors[i] = `#${ String((`00000${
          (this.colors[i]).toString(HEX_BASE)
        }`).substr(-CSS_LEN)) }`;
      }
    }

    return (
      <div style={{ width: '100%', height: '75%',
        padding: '0px', margin: '0px' }}>
        <Box display="flex" flexDirection="row" justifyContent="space-between"
          style={{ height: '100%' }}>
          <div style={{
            borderRight: '1px solid black',
            height: '100vh',
            overflow: 'auto',
          }}>
            <Box display="flex" flexDirection="column">
              <NumberField buttonStyle={{ color: 'gray' }}
                editable={false}
                label="B-Spline Degree"
                max={this.state.controlPoints.length - 1}
                onChange={this.onChangeDegree}
                value={this.state.curveDegree} />
              <Divider />
              <NumberField buttonStyle={{ color: 'gray' }}
                editable={false}
                label="Dimensions"
                max={2}
                onChange={this.onChangeDimensions}
                value={this.state.dimensions} />
              <Divider />
              <div style={{ padding: '8px' }}>
                <ControlPointsEditor controlPoints={this.state.controlPoints}
                  onPublishComponentChange={this.onPublishComponentChange}
                  enforcedDimensions={1}
                  onInsertControlPoint={this.onInsertControlPoint}
                  onDeleteControlPoint={this.onDeleteControlPoint} />
              </div>
            </Box>
          </div>
          <Box alignItems="center"
            display="flex"
            flexDirection="column"
            flexGrow="1"
          >
            <BSplineModel
              colors={this.colors}
              controlPoints={this.state.controlPoints}
              curveDegree={this.state.curveDegree}
              enforcedDimensions={this.state.dimensions}
              knotVector={this.state.knotVector} />
            <span style={{
              fontWeight: 'bold',
              fontSize: '14px',
              alignSelf: 'flex-start',
              margin: '8px',
            }}>
              Edit Knot Vector (slow)
            </span>
            <MultiSlider
              colors={this.stringColors}
              handleStrokeSize={1}
              handleInnerDotSize={2}
              handleSize={7}
              height={36}
              onChange={this.onChangeKnot}
              trackSize={3}
              values={this.diffKnots()} />
          </Box>
        </Box>
      </div>
    );
  }
}

export default BSplineEditor;
