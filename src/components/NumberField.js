/* @flow */

import Box from '@material-ui/core/Box';
import FormLabel from '@material-ui/core/FormLabel';
import IconButton from '@material-ui/core/IconButton';
import KeyboardArrowDown from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUp from '@material-ui/icons/KeyboardArrowUp';
import PropTypes from 'prop-types';
import * as React from 'react';
import TextField from '@material-ui/core/TextField';

type Props = {
  buttonStyle: any,
  onChange: (value: number) => void,
  editable: boolean,
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
};

type State = {
  rawText: string,
  value: number
};

/**
 * Input for a number that can be increased/decreased or edited
 * directly.
 *
 * This component propagates changes to the value, when the user
 * inputs a valid number; in other words, parent components will
 * never recieve an NaN value.
 */
export class NumberField extends React.Component<Props, State> {
  static defaultProps = {
    buttonStyle: {},
    editable: true,
    min: 1,
    max: 10,
    step: 1,
    value: 0,
  };

  state = {
    /**
     * Unedited string value of this field. This may be different
     * than the coerced string of {@code this.state.value}, due
     * to formatting.
     */
    rawText: this.props.value ? `${ this.props.value }` : '0',
    /**
     * Current value corresponding to {@code this.state.rawText},
     * which may be NaN.
     */
    value: this.props.value ? this.props.value : 0,
  };

  /**
   * Clips {@code value} in the inclusive range of min and
   * max.
   *
   * @param {number} value - value to clip
   * @return clipped value that is in the range
   */
  clipValue(value: number) {
    if (value < this.props.min) {
      return this.props.min;
    } else if (value > this.props.max) {
      return this.props.max;
    }
    return value;
  }

  /**
   * Handles the {@code InputEvent} when the value is
   * directly edited in the {@code TextField}.
   *
   * @param {InputEvent} event
   */
  onRawChange = (event: any) => {
    const rawText = event.target.value;
    let value = parseFloat(rawText);

    if (!isNaN(value)) {
      this.props.onChange(value);
    }

    value = this.clipValue(value);

    this.setState({
      rawText: `${ value }`,
      value,
    });
  }

  /**
   * Handles a change in the value via indirect means, e.g.
   * click the increase/decrease button.
   *
   * @param {number} newValue - updated value of the field.
   */
  onStepChange = (newValue: number) => {
    newValue = this.clipValue(newValue);

    this.props.onChange(newValue);

    this.setState({
      rawText: `${ newValue }`,
      value: newValue,
    });
  }

  render = () => (
    <Box flexDirection="row" display="flex" alignItems="center"
      padding="8px" flexGrow="1">
      <Box display="flex" flexDirection="column">
        <FormLabel style={{
          fontSize: '14px',
          fontWeight: 'bold',
          padding: '8px',
          margin: '8px',
        }}>
          {this.props.label}
        </FormLabel>
        <TextField disabled={!this.props.editable}
          value={this.state.rawText}
          inputProps= {{ style: { textAlign: 'center' } }}
          onChange={this.onRawChange} />
      </Box>
      <Box display="flex" flexDirection="column">
        <IconButton key="up" onClick={
          () => this.onStepChange(this.state.value + this.props.step)
        } style={this.props.buttonStyle}>
          <KeyboardArrowUp fontSize="small" />
        </IconButton>
        <IconButton key="down" onClick={
          () => this.onStepChange(this.state.value - this.props.step)
        } style={this.props.buttonStyle}>
          <KeyboardArrowDown fontSize="small"/>
        </IconButton>
      </Box>
    </Box>
  )
}

NumberField.propTypes = {
  buttonStyle: PropTypes.object,
  /**
   * Invoked when the field is edited.
   */
  onChange: PropTypes.func.isRequired,
  /**
   * If false, the field cannot be edited directly.
   */
  editable: PropTypes.bool,
  /**
   * Optional label for the field.
   */
  label: PropTypes.string,
  /**
   * Minimum value for the field.
   *
   * @default 0
   */
  min: PropTypes.number,
  /**
   * Maximum value for the field.
   *
   * @default 10
   */
  max: PropTypes.number,
  /**
   * Amount to increase/decrease the value by when using
   * buttons.
   *
   * @default 1
   */
  step: PropTypes.number,
  /**
   * Value of the field for controlled components.
   *
   * @default 0
   */
  value: PropTypes.number,
};

export default NumberField;
