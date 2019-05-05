/* @flow */

import { type StrictTupleVector, Vector } from '../graphs/Vector';

/**
 * Inverts the vertical component of position vectors for points
 * to draw so that they are displayed correctly in canvas-coordinates.
 *
 * Inversion is required because the ordinate used by the canvas
 * is the distance from the top-border and not the bottom-border.
 *
 * Modifies the array directly
 *
 * @param {Array<TupleVector>} vectors - array of position vectors
 * @param {number} height - height of the canvas
 * @return the vectors array
 */
export function canvasInvert(vectors: Array<StrictTupleVector>, height: number) {
  for (let i = 0; i < vectors.length; i++) {
    vectors[i] = Vector(vectors[i].x, height - vectors[i].y);
  }

  return vectors;
}

export default canvasInvert;
