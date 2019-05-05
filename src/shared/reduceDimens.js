/* @flow */

const screenHeight = screen.height;
const screenWidth = screen.width;

type Margins = {
  margin: number
} | {
  marginX: number,
  marginY: number
};

export type DimensionSwitch = {
  height: number,
  width: number
} & Margins;

function filterResponsiveSwitches(
  switches: Array<DimensionSwitch>,
  isRotatable: boolean
): {
   realSwitch: Margins,
   toRotate: boolean
} {
  let realSwitch: ?Margins = null;
  let toRotate = false;

  if (switches) {
    for (let i = switches.length - 1; i >= 0; i--) {
      // $FlowFixMe
      realSwitch = switches[i];

      if (screenWidth >= realSwitch.width &&
          screenHeight >= realSwitch.height) {
        break;
      } else if (isRotatable && screenHeight >= realSwitch.width &&
          screenWidth >= realSwitch.height) {
        toRotate = true;
        break;
      }
    }
  } else {
    realSwitch = {
      margin: 0.1,
    };
  }

  return {
    realSwitch: ((realSwitch: any): Margins),
    toRotate,
  };
}

/**
 * Calculates the dimensions
 */
export function reduceDimens(
  hwRatio: ?number,
  switches: Array<DimensionSwitch>,
  isRotatable: boolean
) {
  const {
    realSwitch, toRotate,
  // $FlowFixMe
  } = filterResponsiveSwitches(switches, isRotatable);

  // $FlowFixMe
  const marginX: number = realSwitch.marginX ? realSwitch.marginX : realSwitch.margin;
  // $FlowFixMe
  const marginY = realSwitch.marginY ? realSwitch.marginY : realSwitch.margin;

  let height = screenHeight * (1 - marginY);
  let width = screenWidth * (1 - marginX);
  if (toRotate) {
    const copy = width;
    width = height;
    height = copy;
  }

  if (hwRatio) {
    if (height * hwRatio > width) {
      height = width / hwRatio;
    } else {
      width = height * hwRatio;
    }
  }

  return { height, width };
}

export default reduceDimens;
