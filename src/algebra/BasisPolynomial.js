/* @flow */

import { Evaluable } from './Evaluable';
import { Polynomial } from './Polynomial';
import { Range } from './Range';
import { type TupleVector } from './Vector';

/**
 * A basis polynomial is a function that gives support
 * in a certain interval (or evaluates to non-zero values). It
 * is zero outside of that range.
 */
export class BasisPolynomial implements Evaluable {
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

  multiply(scale: number | TupleVector | Polynomial) {
    return new BasisPolynomial(
      this.evaluator.multiply(scale), this.supportRange);
  }

  toJAXString(variable: string = 'x') {
    return `${ this.evaluator.toJAXString() },\\mspace{4mu}` +
      `${ variable } \\in${ this.supportRange.toJAXString() }`;
  }
}
