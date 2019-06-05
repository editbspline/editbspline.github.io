/* @flow */

import { BasisPolynomial } from './BasisPolynomial';
import { Evaluable } from './Evaluable';
import { Polynomial } from './Polynomial';
import { add, type TupleVector } from './Vector';

/**
 * Returns the sum of the given evaluations.
 */
export function linearCombiner(
  ...dataPoints: Array<number | TupleVector>
): number | TupleVector {
  return add(...dataPoints);
}

/**
 * A spline is a combination of basis-polynomials that
 * give support in specific ranges. It is evalulated by
 * combining (usually adding) the results of those bases.
 */
export class Spline implements Evaluable {
  /**
   * Array of basis evaluable functions.
   *
   * @name Spline#basis
   * @type Array<Evaluable>
   */
  basis: Array<Spline | BasisPolynomial>;

  /**
   * Combiner function which takes all the evaluations
   * of each individual basis functions and reduces into
   * one result.
   *
   * @name Spline#basis
   * @type Array<Evaluable>
   */
  combiner: (...Array<number | TupleVector>) => number | TupleVector;

  /**
   * @param {Array<Spline | BasisPolynomial>} basis
   * @param {function}[combiner=linearCombiner]
   */
  constructor(
    basis: Array<Spline | BasisPolynomial> = [],
    combiner: (...args: Array<number | TupleVector>) => number | TupleVector = linearCombiner
  ) {
    if (arguments.length > 2 ||
      combiner instanceof BasisPolynomial) {
      throw new Error('Spline not constructed with intended ' +
        'arguments. Did you forget to wrap the basis-polynomials in ' +
        'an array?');
    }

    this.basis = basis;
    this.combiner = combiner;
  }

  /**
   * @param {number | Polynomial} scale - multiplier
   * @return the product of this spline and {@code scale}
   */
  multiply(scale: number | TupleVector | Polynomial) {
    const newBasis = this.basis.slice(0);

    for (let basisOff = 0; basisOff < newBasis.length; basisOff++) {
      newBasis[basisOff] = newBasis[basisOff].multiply(scale);
    }

    return new Spline(newBasis, this.combiner);
  }

  evaluate(point: number) {
    return this.combiner.apply(null, this.basis.map((basisPoly) => (
      basisPoly.evaluate(point)
    )));
  }
}

// $FlowFixMe
export class FlattenerSpline extends Spline {
  basis: Array<BasisPolynomial> = [];

  /**
   * Adds a basis-element to this basic-spline, but removes
   * duplicate basis polynomials with the same support
   * ranges.
   *
   * It also doesn't add a basic-spline; instead, it adds
   * all the basis-polynomials of the basic-spline.
   *
   * This "flattening" is a one-time cost; however, evaluations
   * are much faster.
   *
   * @param {BasisPolynomial | Spline} basisPoly
   */
  flatAdd(basisPoly: BasisPolynomial | Spline) {
    if (basisPoly instanceof Spline) {
      basisPoly.basis.forEach((componentPoly) => {
        this.flatAdd(componentPoly);
      }, this);
    } else if (basisPoly instanceof BasisPolynomial) {
      for (let polyIdx = 0; polyIdx < this.basis.length; polyIdx++) {
        if (this.basis[polyIdx].supportRange.equals(basisPoly.supportRange)) {
          this.basis[polyIdx].evaluator =
            this.basis[polyIdx].evaluator.add(basisPoly.evaluator);
          return;
        }
      }

      this.basis.push(basisPoly);
    } else {
      throw new Error('Invalid polynomial type given to flatAdd');
    }
  }

  /**
   * Flattens a basic-spline; removes any duplicate basis
   * polynomials with the same support range. Also removes
   * basic-spline children by pulling their basis into its
   * own basis.
   *
   * @see FlattenerSpline#flatAdd
   */
  static flatten(spline: Spline): FlattenerSpline {
    const fbs = new FlattenerSpline();
    fbs.flatAdd(spline);
    return fbs;
  }
}
