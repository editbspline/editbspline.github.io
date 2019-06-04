/* @flow */

import clippedArrayAccess from '../shared/clippedArrayAccess';
import { Polynomial } from './Polynomial';
import { BasisPolynomial } from './BasisPolynomial';
import { Spline, FlattenerSpline } from './Spline';
import { SimpleRange } from './Range';
import { Vector, type StrictTupleVector, type TupleVector } from './Vector';

const CONSTANT_ONE = new Polynomial([ 1 ]);

export type StdBSpline = Spline & {
  controlPoints: Array<TupleVector>,
  knotVector: StrictTupleVector,
  order: number,
  curveRange: SimpleRange
}

/**
 * @param {number} knots - number of knots/elements in
 *    the returned knot-vector.
 * @return an uniformly spaced knot-vector that lies
 *    between 0 and 1.
 */
export function UniformKnotVector(knots: number): StrictTupleVector {
  const knotVector = [];

  for (let i = 0; i < knots; i++) {
    knotVector.push(i / (knots - 1));
  }

  return Vector(...knotVector);
}

export function StepBSpline(
  knotVector: StrictTupleVector,
  controlPoints: ?Array<TupleVector | number>
): StdBSpline | Array<BasisPolynomial> {
  if (controlPoints && knotVector.length !== controlPoints.length + 1) {
    /* eslint-disable no-new-wrappers */
    throw new String('Order Zero B-Spline requires that the knot-vector ' +
      'have atleast control-points + 1 number of knots.');
    /* eslint-enable no-new-wrappers */
  }

  const basisPolys: Array<BasisPolynomial> = [];

  for (let knotOff = 0; knotOff < knotVector.length - 1; knotOff++) {
    let basisPoly = new BasisPolynomial(CONSTANT_ONE,
      new SimpleRange(
        clippedArrayAccess(knotVector, knotOff),
        clippedArrayAccess(knotVector, knotOff + 1),
        true, (knotOff === knotVector.length - 1)
      ));

    if (controlPoints) {
      basisPoly = basisPoly.multiply(controlPoints[knotOff]);
    }

    basisPolys.push(basisPoly);
  }

  if (controlPoints) {
    // $FlowFixMe: https://github.com/facebook/flow/issues/7763
    const stepBasisSpline = new Spline(basisPolys);
    stepBasisSpline.controlPoints = controlPoints;
    stepBasisSpline.knotVector = knotVector;
    stepBasisSpline.order = 1;
    stepBasisSpline.curveRange = new SimpleRange(
      knotVector[0], knotVector[controlPoints.length], true, false);
    return stepBasisSpline;
  }
  return basisPolys;
}

export function UniformStepBSpline(controlPoints: Array<TupleVector | number>) {
  return StepBSpline(UniformKnotVector(controlPoints.length + 1),
    controlPoints);
}

export function BSpline(
  knotVector: StrictTupleVector, controlPoints: Array<number | TupleVector>,
  curveDegree: number, doNotFlatten: boolean = false
): StdBSpline {
  if (curveDegree === 0) {
    return ((StepBSpline(knotVector, controlPoints): any): StdBSpline);
  }
  if (!(curveDegree < controlPoints.length)) {
    throw new Error('Degree of spline must be less than number of ' +
      'control points.');
  }

  const splineOrder = curveDegree + 1;

  let lowerBasisPolys = ((StepBSpline(knotVector): any): Array<BasisPolynomial>);
  let buildOrder = 2;

  while (buildOrder <= splineOrder) {
    const higherBasisPolys = [];

    for (let i = 0; i < lowerBasisPolys.length - 1; i++) {
      const knoti = clippedArrayAccess(knotVector, i);
      const knotiplusone = clippedArrayAccess(knotVector, i + 1);
      const knotiplusd = clippedArrayAccess(knotVector, i + buildOrder - 1);
      const knotipluso = clippedArrayAccess(knotVector, i + buildOrder);

      const higherBasis = new Spline([
        lowerBasisPolys[i]
          .multiply(new Polynomial([ 1, -knoti ]))
          .multiply(1 / (knotiplusd - knoti)),
        lowerBasisPolys[i + 1]
          .multiply(new Polynomial([ -1, knotipluso ]))/* eslint-disable-line no-magic-numbers */
          .multiply(1 / (knotipluso - knotiplusone)),
      ]);

      higherBasisPolys.push(higherBasis);
    }

    ++buildOrder;
    lowerBasisPolys = higherBasisPolys;
  }

  if (lowerBasisPolys.length !== controlPoints.length) {
    /* eslint-disable-next-line no-console */
    console.error(lowerBasisPolys);
    throw new Error('logic error: _{ lowerBasisPolys }');
  }

  for (let i = 0; i < lowerBasisPolys.length; i++) {
    lowerBasisPolys[i] = lowerBasisPolys[i].multiply(controlPoints[i]);
  }

  const bspline: any = (doNotFlatten) ?
    // $FlowFixMe: https://github.com/facebook/flow/issues/7763
    new Spline(lowerBasisPolys) :
    // $FlowFixMe: https://github.com/facebook/flow/issues/7763
    FlattenerSpline.flatten(new Spline(lowerBasisPolys));
  bspline.controlPoints = controlPoints;
  bspline.knotVector = knotVector;
  bspline.order = splineOrder;
  bspline.curveRange = new SimpleRange(
    knotVector[splineOrder - 1], knotVector[controlPoints.length],
    true, false
  );

  return (bspline: StdBSpline);
}

export function UniformBSpline(
  controlPoints: Array<number | TupleVector>, curveDegree: number,
  doNotFlatten: boolean = false
): StdBSpline {
  return BSpline(UniformKnotVector(controlPoints.length + curveDegree + 1),
    controlPoints, curveDegree, doNotFlatten);
}

export default {
  UniformStepBSpline,
  UniformBSpline,
  BSpline,
  UniformKnotVector,
};
