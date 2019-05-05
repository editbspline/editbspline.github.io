/* @flow */

import { Evaluable } from './Evaluable';
import { Polynomial } from './Polynomial';
import { Range } from './Range';
import { type TupleVector } from './Vector';

/**
 * A basis polynomial evaluates only in a specific
 * support range, outside of which it is zero.
 */
export interface BasisPolynomial extends Evaluable {
  /**
   * The underlying polynomial that is evaluated in
   * the support range.
   */
  evaluator: Polynomial;

  /**
   * The range outside of which this basis polynomial
   * will be zero.
   */
  supportRange: Range;
}

export class SimpleBasisPolynomial implements BasisPolynomial {
  evaluator: Polynomial;
  supportRange: Range;

  constructor(evaluator: Polynomial, supportRange: Range) {
    this.evaluator = evaluator;
    this.supportRange = supportRange;
  }

  evaluate(param: number): number | TupleVector {
    if (!this.supportRange.isIn(param)) {
      return 0;
    }

    return this.evaluator.evaluate(param);
  }

  multiply(scale: number | Polynomial) {
    return new SimpleBasisPolynomial(
      this.evaluator.multiply(scale), this.supportRange);
  }
}
