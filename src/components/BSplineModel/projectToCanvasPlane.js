/* @flow */

import { type StrictTupleVector, type TupleVector, Vector } from '../../algebra/Vector';

/**
 * Projects an evaulated B-Spline position vector onto a
 * 2D plane.
 *
 * @param {number} input - parameter in knot-vector domain
 * @param {StrictTupleVector} positionVector - evaluation
 * @return {StrictTupleVector} projection of {@code positionVector}
 *    onto 2D plane.
 */
export function projectToCanvasPlane(
  input: number,
  enforcedDimensions: number,
  positionVector: StrictTupleVector | number
): TupleVector {
  if (typeof positionVector === 'number' && positionVector !== 0) {
    return Vector(input, positionVector);
  }

  if (enforcedDimensions === 1) {
    return Vector(input, 0);
  } else if (enforcedDimensions === 2) {
    return positionVector;
  }

  throw new Error(`Support for higher dimensions than 2 isn't complete.
    ${ positionVector === 0 ? 0 : positionVector.dimensions }`);
}

export default projectToCanvasPlane;
