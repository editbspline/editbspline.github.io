/* @flow */

import clippedArrayAccess from '../shared/clippedArrayAccess';
import concat from 'lodash/concat';
import constant from 'lodash/constant';
import isArray from 'lodash/isArray';
import times from 'lodash/times';

/* eslint-disable no-use-before-define */
export type StrictTupleVector = Array<number> & {
  dimensions: number,
  add: (TupleVector) => TupleVector,
  scaleVector: (number) => TupleVector,
  dotProduct: (TupleVector) => number,
  scalarProduct: (TupleVector) => number,
  safeProduct: (TupleVector | number) => number | TupleVector,
  x: number,
  y: number,
  z: number
};

export type TupleVector = StrictTupleVector | 0;
/* eslint-enable no-use-before-define */

export function Vector(...tuple: Array<number>): StrictTupleVector {
  const tupleArr = ((tuple.slice(0): any): StrictTupleVector);

  tupleArr.dimensions = tupleArr.length;

  /* eslint-disable no-use-before-define */
  tupleArr.add = add.bind(null, tupleArr);
  tupleArr.scaleVector = scaleVector.bind(null, tupleArr);
  tupleArr.dotProduct = dotProduct.bind(null, tupleArr);
  tupleArr.scalarProduct = tupleArr.dotProduct;
  tupleArr.safeProduct = safeProduct.bind(null, tupleArr);
  /* eslint-enable no-use-before-define */

  tupleArr.x = clippedArrayAccess<number>(tupleArr, 0);
  tupleArr.y = clippedArrayAccess<number>(tupleArr, 1);
  tupleArr.z = clippedArrayAccess<number>(tupleArr, 2);

  return Object.freeze(tupleArr);
}

export function isVector(arg: any): boolean %checks {
  return arg === 0 || (isArray(arg) && arg.dimensions &&
    Object.isFrozen(arg));
}

/**
 * Safely returns the dimensions of vector {@code args}.
 *
 * @param {TupleVector | number} args - vector to get dimensions ofs
 * @return dimensions of args
 */
export function safeDimens(args: any) {
  return (args.dimensions) ? args.dimensions : 1;
}

/* eslint-disable-next-line id-match */
export function safeOneDValue(arg: any) {
  return (arg.dimensions) ? arg[0] : arg;
}

/**
 * Sets the component of a vector and returns the result. It
 * doesn't mutate the original vector object.
 *
 * @param {TupleVector | number} arg - vector to modify
 * @param {number} comp - index/component to change
 * @param {number} val - value of component
 * @param {dimensions} dimensions - number of dimensions enforced
 */
export function safeUpdateComponent(arg: TupleVector | number, comp: number,
  val: number, dimensions: number
): TupleVector | number {
  if (arg === 0) {
    const arr = times(dimensions, () => 0);
    arr[comp] = val;
    return Vector(...arr);
  } else if (isArray(arg)) {
    // $FlowFixMe
    arg = arg.slice(0);
    arg[comp] = val;
    return Vector(...arg);
  }
  return comp;
}

export function safeUpdateDimensions(
  arg: TupleVector | number, dimens: number
): TupleVector {
  if (dimens <= 0) {
    throw new Error('Negative/zero dimensions not allowed');
  }

  if (arg === 0) {
    return Vector(...times(dimens, constant(0)));
  }

  if (Array.isArray(arg)) {
    if (arg.length < dimens) {
      return Vector(...concat(arg, times(dimens - arg.length, constant(0))));
    } else if (arg.length > dimens) {
      return Vector(...arg.slice(0, dimens));
    }
    return arg;
  }

  return Vector(...concat([ arg ], times(dimens - 1, constant(0))));
}

export function operandDimens(...args: Array<TupleVector | number>) {
  for (let i = 0; i < args.length; i++) {
    if (!isVector(args[i])) {
      return 1;
    }
    if (args[i] !== 0) {
      return ((args[i]: any): StrictTupleVector).dimensions;
    }
  }

  return 1;
}

export function add(...args: Array<number | StrictTupleVector>) {
  const dimensions = operandDimens(...args);

  if (dimensions === 1) {
    // $FlowFixMe
    return args.reduce((acc, val) => acc + safeOneDValue(val), 0);
  }

  const sum = times(dimensions, constant(0));
  for (let i = 0; i < args.length; i++) {
    if (args[i] === 0) {
      continue;
    }

    const vector: StrictTupleVector = (args[i]: any);
    if (vector.dimensions !== dimensions) {
      throw new Error('Incompatible vector cannot be added.');
    }

    for (let j = 0; j < dimensions; j++) { /* eslint-disable-line id-length */
      sum[j] += vector[j];
    }
  }

  return Vector(...sum);
}

export function scaleVector(vector: TupleVector, scale: number) {
  if (scale === 0 && vector === 0) {
    return 0;
  }

  // $FlowFixMe
  return Vector(...times(vector.dimensions, (i) => vector[i] * scale));
}

/* eslint-disable-next-line id-match, id-length */
export function dotProduct(v1: TupleVector, v2: TupleVector) {
  if (v1 === 0 || v2 === 0) {
    return 0;
  }

  let dpSum = 0;
  for (let i = 0; i < v1.dimensions && i < v2.dimensions; i++) {
    dpSum += v1[i] * v2[i];
  }
  return dpSum;
}

export const scalarProduct = dotProduct;

export function safeProduct(
  a: StrictTupleVector | number, // eslint-disable-line id-length
  b: StrictTupleVector | number // eslint-disable-line id-length
) {
  if (a === 0 || b === 0) {
    return 0;
  }

  const isVectorA = isVector(a);
  const isVectorB = isVector(b);

  if (isVectorA && isVectorB) {
    // $FlowFixMe
    return dotProduct(a, b);
  } else if (isVectorA && !isVectorB) {
    // $FlowFixMe
    return scaleVector(a, b);
  } else if (!isVectorA && isVectorB) {
    // $FlowFixMe
    return scaleVector(b, a);
  }

  // $FlowFixMe
  return a * b;
}

export function iterateVector(vector: number | StrictTupleVector,
  call: (value: number, index: number, vector: TupleVector) => any,
  forceDimensionOnZero: number = 1
) {
  if (vector === 0) {
    times(forceDimensionOnZero, (index) => {
      // $FlowFixMe
      call(vector, index, vector);
    });
  } else if (Number.isFinite(vector)) {
    // $FlowFixMe
    call(vector, 0, vector);
  } else if (isVector(vector)) {
    // $FlowFixMe
    for (let i = 0; i < vector.dimensions; i++) {
      // $FlowFixMe
      call(vector[i], i, vector);
    }
  } else {
    throw new Error('Illegal vector argument');
  }
}

export function mapVector(vector: number | TupleVector,
  call: (value: number, index: number, vector: TupleVector) => any,
  forceDimensionOnZero: number = 1
): Array<any> {
  const arr = [];
  iterateVector(vector, (val, idx, vec) => {
    arr.push(call(val, idx, vec));
  }, forceDimensionOnZero);
  return arr;
}

export default Vector;
