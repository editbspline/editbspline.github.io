/* @flow */

import { SimpleBasisPolynomial } from './BasisPolynomial';
import { Evaluable } from './Evaluable';
import { Polynomial } from './Polynomial';
import { add, type TupleVector, type StrictTupleVector } from './Vector';

/**
 * Returns the sum of the given evaluations.
 */
export function linearCombiner(
  // $FlowFixMe
  ...dataPoints: Array<number | StrictTupleVector>
) {
  return add(...dataPoints);
}

/**
 * A spline is a combination of basis-polynomials that
 * give support only in specified ranges.
 */
export interface Spline extends Evaluable {
}

/**
 * A basic spline is described by an array of basis
 * polynomials (its basis) and a combiner function. This
 * spline is evaluated using the combiner function on all
 * individual evaluations of the basis polynomials.
 *
 * The basis can also include basic splines themselves,
 * which ultimately manifest a group of basis polynomials.
 */
export class BasicSpline implements Spline {
  /**
   * Array of basis evaluable functions.
   *
   * @name BasicSpline#basis
   * @type Array<Evaluable>
   */
  basis: Array<BasicSpline | SimpleBasisPolynomial>;

  /**
   * Combiner function which takes all the evaluations
   * of each individual basis functions and reduces into
   * one result.
   *
   * @name BasicSpline#basis
   * @type Array<Evaluable>
   */
  combiner: (Array<number | TupleVector>) => number | TupleVector;

  /**
   * @param {Array<BasicSpline | SimpleBasisPolynomial>} basis
   * @param {function}[combiner=linearCombiner]
   */
  constructor(
    basis: Array<BasicSpline | SimpleBasisPolynomial> = [],
    combiner: (Array<number | TupleVector>) => number | TupleVector = linearCombiner
  ) {
    if (arguments.length > 2 ||
      combiner instanceof SimpleBasisPolynomial) {
      throw new Error('BasicSpline not constructed with intended ' +
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
  multiply(scale: number | Polynomial) {
    const newBasis = this.basis.slice(0);

    for (let basisOff = 0; basisOff < newBasis.length; basisOff++) {
      newBasis[basisOff] = newBasis[basisOff].multiply(scale);
    }

    return new BasicSpline(newBasis, this.combiner);
  }

  evaluate(point: number) {
    return this.combiner.apply(null, this.basis.map((basisPoly) => (
      basisPoly.evaluate(point)
    )));
  }
}

// $FlowFixMe
export class FlattenerBasicSpline extends BasicSpline {
  basis: Array<SimpleBasisPolynomial> = [];

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
   * @param {BasisPolynomial | BasicSpline} basisPoly
   */
  flatAdd(basisPoly: SimpleBasisPolynomial | BasicSpline) {
    if (basisPoly instanceof BasicSpline) {
      basisPoly.basis.forEach((componentPoly) => {
        this.flatAdd(componentPoly);
      }, this);
    } else if (basisPoly instanceof SimpleBasisPolynomial) {
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
   * @see FlattenerBasicSpline#flatAdd
   */
  static flatten(spline: BasicSpline): FlattenerBasicSpline {
    const fbs = new FlattenerBasicSpline();
    fbs.flatAdd(spline);
    return fbs;
  }
}
