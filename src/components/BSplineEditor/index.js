/* @flow */

import Box from '@material-ui/core/Box';
import { BSplineModel } from '../BSplineModel';
import ControlPointsEditor from './ControlPointsEditor';
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

export type BSplineEditorProps = {
  controlPoints: Array<TupleVector | number>,
  curveDegree: number
};

type BSplineEditorState = {
  controlPoints: Array<TupleVector | number>,
  curveDegree: number,
  dimensions: number,
  knotVector: StrictTupleVector
};

export class BSplineEditor extends React.Component<BSplineEditorProps, BSplineEditorState> {
  // $FlowFixMe: BSplineModel is a react component (flow doesn't agree).
  modelRef: { current: ?React.ElementRef<BSplineModel> };
  sliderRef: { current: ?React.ElementRef<MultiSlider> };
  colors: Array<number>;
  stringColors: Array<string>;

  constructor(props: BSplineEditorProps) {
    super(props);

    const knotVector = UniformKnotVector(props.controlPoints.length + props.curveDegree + 1);
    this.state = {
      controlPoints: props.controlPoints,
      curveDegree: props.curveDegree,
      dimensions: operandDimens(...props.controlPoints),
      knotVector,
      displayedKnotVector: knotVector,
    };

    this.sliderRef = React.createRef();
    this.modelRef = React.createRef();
  }

  diffKnots() {
    const diffs = new Array(this.state.knotVector.length + 1);

    diffs[0] = 0;
    for (let i = 1; i < this.state.knotVector.length; i++) {
      diffs[i] = (this.state.displayedKnotVector[i] - this.state.displayedKnotVector[i - 1]) * 100;
    }

    diffs[this.state.knotVector.length] = 100 * (1 - this.state.displayedKnotVector[this.state.knotVector.length - 1]);

    return diffs;
  }

  cumulateDiffs(diffs) {
    const knots = new Array(diffs.length - 1);
    let val = 0;

    for (let i = 0; i < knots.length; i++) {
      val += diffs[i];
      knots[i] = val / 100;
    }

    return Vector(...knots);
  }

  onPublishComponentChange = (index: number, comp: number, val: number) => {
    this.setState((prevState) => {
      const newControlPoints = prevState.controlPoints.slice(0);
      newControlPoints[index] = safeUpdateComponent(newControlPoints[index], comp, val, this.state.dimensions);

      return {
        controlPoints: newControlPoints,
      };
    });
  }

  onInsertControlPoint = (count: number, index: number = this.state.controlPoints.length - 1) => {
    this.setState((prevState) => {
      const newControlPoints = prevState.controlPoints.slice(0);
      newControlPoints.splice(index, 0, ...times(count, () => Vector(...times(this.state.dimensions, () => 0))));


      const knotVector = UniformKnotVector(newControlPoints.length + this.state.curveDegree + 1);
      return {
        controlPoints: newControlPoints,
        knotVector,
        displayedKnotVector: knotVector,
      };
    });
  }

  onDeleteControlPoint = (index: number) => {
    if (this.state.controlPoints.length - 1 === this.state.curveDegree) {
      return;
    }

    this.setState((prevState) => {
      const newControlPoints = prevState.controlPoints.slice(0);
      newControlPoints.splice(index, 1);

      const knotVector = UniformKnotVector(newControlPoints.length + this.state.curveDegree + 1);
      return {
        controlPoints: newControlPoints,
        knotVector,
        displayedKnotVector: knotVector,
      };
    });
  }

  onChangeDegree = (curveDegree: number) => {
    if (curveDegree >= this.state.controlPoints.length) {
      return;
    }

    const knotVector = UniformKnotVector(this.state.controlPoints.length + curveDegree + 1);
    this.setState({
      curveDegree,
      knotVector,
      displayedKnotVector: knotVector,
    });
  }

  onChangeDimensions = (dimensions: number) => {
    this.setState((prevState) => {
      const controlPoints = times(prevState.controlPoints.length,
        (idx) => (
          safeUpdateDimensions(prevState.controlPoints[idx], dimensions)
        ));

      console.log(controlPoints);

      return {
        controlPoints,
        dimensions,
      };
    });
  }

  onChangeKnot = (diffs) => {
    const knotVector = this.cumulateDiffs(diffs);

    this.setState({
      knotVector,
      displayedKnotVector: knotVector,
    });
  }

  render() {
    if (!this.colors || this.colors.length !== this.state.knotVector.length + 2) {
      this.colors = new Array(this.state.knotVector.length + 2);
      this.stringColors = new Array(this.colors.length);
      for (let i = 0; i < this.colors.length; i++) {
        this.colors[i] = Math.round(Math.random() * 0xffffff);
        this.stringColors[i] = `#${ String((`00000${ (this.colors[i] | 0).toString(16) }`).substr(-6)) }`;
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
              knotVector={this.state.knotVector}
              ref={this.modelRef} />
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
              ref={this.sliderRef}
              trackSize={3}
              values={this.diffKnots()} />
          </Box>
        </Box>
      </div>
    );
  }
}

export default BSplineEditor;
