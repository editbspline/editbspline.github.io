/* @flow */

import { type StrictTupleVector, Vector } from '../../algebra/Vector';

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
  positionVector: StrictTupleVector | number
): StrictTupleVector {
  if (typeof positionVector === 'number') {
    return Vector(input, positionVector);
  }

  if (positionVector.dimensions === 1) {
    return Vector(input, positionVector[0]);
  } else if (positionVector.dimensions === 2) {
    return positionVector;
  }

  throw new Error(`Support for higher dimensions than 2 isn't complete.
    ${ positionVector.dimensions }`);
}

export default projectToCanvasPlane;
