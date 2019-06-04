/* @flow */

import { SimpleRange } from './Range';

/**
 * Splits the range [lowerBoundary, upperBoundary] into
 * {@code segments} number of child, non-overlapping simple
 * ranges. Except the last, the upper-boundary of each child
 * is exclusive.
 *
 * @return segment-number of equal sized ranges between
 *    lowerBoundary and upperBoundary
 */
export function uniformSplit(
  lowerBoundary: number, upperBoundary: number, segments: number
): Array<SimpleRange> {
  const internalKnots = segments - 1;
  const knotCoords = [ lowerBoundary ];

  for (let knot = 1; knot <= internalKnots; knot++) {
    const lowerWeight = lowerBoundary * (segments - knot);
    const upperWeight = upperBoundary * knot;
    const knotCoord = (lowerWeight + upperWeight) / segments;

    knotCoords.push(knotCoord);
  }

  const ranges = [];
  for (let knot = 0; knot < knotCoords.length - 1; knot++) {
    const lBound = knotCoords[knot];
    const uBound = knotCoords[knot + 1];

    ranges.push(new SimpleRange(lBound, uBound, true, false));
  }

  ranges.push(new SimpleRange(knotCoords[knotCoords.length - 1], upperBoundary));
  return ranges;
}

export default {
  uniformSplit,
};
