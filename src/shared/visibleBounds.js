/* @flow */

import { type StrictTupleVector } from '../graphs/Vector';

/**
 * Finds the smallest rectangle in which all given 2-D
 * position vectors lie, plus any fractional padding. If
 * the position vectors are connected to form a convex curve,
 * it should fit into this rectangle.
 *
 * @param {Array<TupleVector>} planarPoints - 2-D position vectors
 * @param {number} padding - fractional padding to expand the
 *    visible rectangle's borders outward.
 * @return { minX, minY, maxX, maxY }, the bounds of the
 *    visible rectangle.
 */
export function visibleBounds(
  planarPoints: Array<StrictTupleVector>,
  padding: number = 0
) {
  let pminX = planarPoints[0].x;
  let pminY = planarPoints[0].y;
  let pmaxX = planarPoints[0].x;
  let pmaxY = planarPoints[0].y;
  for (let pidx = 1; pidx < planarPoints.length; pidx++) {
    const { x, y } = planarPoints[pidx];

    pminX = Math.min(pminX, x);
    pmaxX = Math.max(pmaxX, x);
    pminY = Math.min(pminY, y);
    pmaxY = Math.max(pmaxY, y);
  }

  const padx = (pmaxX - pminX) * padding;
  const pady = (pmaxY - pminY) * padding;
  /* Add some padding */
  pminY -= pady / 2;
  pmaxY += pady / 2;
  pminX -= padx / 2;
  pmaxX += padx / 2;

  return {
    minX: pminX, minY: pminY,
    maxX: pmaxX, maxY: pmaxY,
  };
}

export default visibleBounds;
