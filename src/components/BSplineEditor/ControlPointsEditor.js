/* @flow */

import { Add, Remove } from '@material-ui/icons';
import Box from '@material-ui/core/Box';
import FormLabel from '@material-ui/core/FormLabel';
import MathJax from 'react-mathjax';
import IconButton from '@material-ui/core/IconButton';
import * as React from 'react';
import TextField from '@material-ui/core/TextField';
import {
  type TupleVector,
  mapVector,
  safeUpdateComponent,
} from '../../algebra/Vector';

type Props = {
  controlPoints: Array<TupleVector | number>,
  enforcedDimensions: number,
  onPublishComponentChange: (index: number, comp: number, val: number) => void,
  onInsertControlPoint: (count: number, index: number) => void,
  onDeleteControlPoint: (index: number) => void
};

type State = {
  localControlPoints: Array<TupleVector | number>
};

export class ControlPointsEditor extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      localControlPoints: props.controlPoints,
    };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.controlPoints !== prevProps.controlPoints) {
      this.setState({
        localControlPoints: this.props.controlPoints,
      });
    }
  }

  onLocalChangeComponent = (index: number, comp: number, val: number) => {
    this.setState((prevState) => {
      const newControlPoint = safeUpdateComponent(
        prevState.localControlPoints[index], comp,
        val, this.props.enforcedDimensions
      );

      const newControlPoints = prevState.localControlPoints.slice(0);
      newControlPoints[index] = newControlPoint;
      return {
        localControlPoints: newControlPoints,
      };
    });
  }

  render = () => (
    <React.Fragment>
      <FormLabel style={{
        padding: '8px',
        margin: '8px',
        fontWeight: 'bold',
        fontSize: '14px',
      }}>
         Vectors
      </FormLabel>
      <MathJax.Provider>
      {
        this.state.localControlPoints.map((point, index) => (
          <Box display="flex" flexDirection="row"
            justifyContent="center" key={index}
            margin="8px" padding="8px" alignItems="baseline">
            <MathJax.Node formula={'\\langle'} />
            {
              mapVector(point, (val, idx) => (
                <React.Fragment key={idx}>
                  <span>{(idx !== 0) ? '|' : ''}</span>
                  <TextField value={val}
                    inputProps = {{ style: {
                      textAlign: 'center',
                      width: '48px',
                      margin: '8px'
                      } }}
                    onChange={(event) => {
                      const newVal = parseFloat(event.target.value);
                      if (isNaN(newVal)) {
                        this.onLocalChangeComponent(index, idx, event.target.value);
                      } else {
                        this.props.onPublishComponentChange(index, idx, newVal);
                      }
                  }}/>
                </React.Fragment>
              ), this.props.enforcedDimensions)
            }
            <MathJax.Node formula={'\\rangle'} />
            <div>
              <IconButton onClick={() => {
                this.props.onInsertControlPoint(1, index + 1);
              }} style={{ padding: '8px' }}>
                <Add />
              </IconButton>
              <IconButton onClick={() => {
                this.props.onDeleteControlPoint(index);
              }} style={{ padding: '8px' }}>
                <Remove />
              </IconButton>
            </div>
          </Box>
        ))
      }
      </MathJax.Provider>
    </React.Fragment>
  )
}

export default ControlPointsEditor;
