/* @flow */

/**
 * Represents any mathematical relation that maps
 * real-numbers to an arbitrary type (generally numbers).
 *
 * @see Polynomial, Spline, BasisPolynomial
 */
export interface Evaluable {
  evaluate(point: number) : any;

  /**
   * Converts this expression into MathJAX format.
   */
  toJAXString(): string;
}
