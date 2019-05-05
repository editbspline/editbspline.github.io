/* @flow */

import { type StrictTupleVector, Vector } from '../graphs/Vector';

/**
 * Shifts and scales each vector in the {@code vectors}
 * array. Modifies the array directly.
 *
 * @param {Array<TupleVector>} vector - the vectors to shift & scale
 * @param {TupleVector} shift - displacment vector that is added to
 *    each vector to "shift" them.
 * @param {number} scaleX - magnification along x-axis
 * @param {number} scaleY - magnification along y-axis
 * @return the vectors array
 */
export function shiftAndScaleVectors(
  vectors: Array<StrictTupleVector>,
  shift: StrictTupleVector,
  scaleX: number,
  scaleY: number
) {
  for (let i = 0; i < vectors.length; i++) {
    const newX = (vectors[i].x + shift.x) * scaleX;
    const newY = (vectors[i].y + shift.y) * scaleY;
    vectors[i] = Vector(newX, newY);
  }

  return vectors;
}

export default shiftAndScaleVectors;
