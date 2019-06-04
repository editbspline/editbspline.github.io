/* @flow */

import { type Evaluable } from './Evaluable';
import { add, safeProduct, type TupleVector } from './Vector';

/**
 * Represents a proper polynomial expression.
 */
export class Polynomial implements Evaluable {
  /**
   * List of coefficients of terms with the highest to
   * zeroth power of x.
   */
  coefList: Array<number | TupleVector>;

  /**
   * Highest power of x with non-zero coefficient.
   */
  #degree: number;

  constructor(source: Array<number | TupleVector> | Polynomial) {
    if (source instanceof Polynomial) {
      this.coefList = source.coefList.slice(0);
      this.#degree = source.degree;
      return;
    }

    this.coefList = source;

    let zeroCoefs = 0;
    for (let coefIdx = 0; coefIdx < source.length &&
          source[coefIdx] === 0; coefIdx++) {
      ++zeroCoefs;
    }
    this.#degree = this.coefList.length - 1 - zeroCoefs;
  }

  get degree(): number {
    return this.#degree;
  }

  get msCoefIndex(): number {
    return this.coefList.length - this.#degree - 1;
  }

  get lsCoefIndex(): number {
    return this.coefList.length - 1;
  }

  coef(power: number): number | TupleVector {
    const coefIdx = this.coefList.length - 1 - power;
    if (coefIdx < 0) {
      return 0;
    }
    return this.coefList[coefIdx];
  }

  evaluate(param: number): number | TupleVector {
    let value = 0;

    for (let coefIdx = this.msCoefIndex; coefIdx <= this.lsCoefIndex; coefIdx++) {
      value = safeProduct(value, param);
      value = add(value, this.coefList[coefIdx]);
    }

    return value;
  }

  add(other: number | Polynomial) {
    if (typeof other === 'number') {
      const sumCoefList = this.coefList.slice(0);
      const lastCoef = sumCoefList[this.lsCoefIndex];
      sumCoefList[this.lsCoefIndex] = add(lastCoef, other);
      return new Polynomial(sumCoefList);
    }

    const sumCoefList = new Array(Math.max(this.degree, other.degree) + 1);

    for (let coefIdx = 0; coefIdx < sumCoefList.length; coefIdx++) {
      const power = sumCoefList.length - 1 - coefIdx;
      sumCoefList[coefIdx] = add(this.coef(power), other.coef(power));
    }

    return new Polynomial(sumCoefList);
  }

  multiply(scale: number | Polynomial | TupleVector) {
    if (!(scale instanceof Polynomial)) {
      const productCoefList = this.coefList.slice(0);
      for (let coefIdx = this.msCoefIndex; coefIdx <= this.lsCoefIndex;
        coefIdx++) {
        productCoefList[coefIdx] = safeProduct(this.coefList[coefIdx], scale);
      }

      return new Polynomial(productCoefList);
    }
    const productCoefList = new Array(this.degree + scale.degree + 1);

    for (let coefIdx = 0; coefIdx < productCoefList.length; coefIdx++) {
      const power = productCoefList.length - 1 - coefIdx;
      let finalCoef = 0;

      for (let tpower = 0; tpower <= power; tpower++) {
        const scalePower = power - tpower;
        finalCoef = add(finalCoef,
          safeProduct(this.coef(tpower), scale.coef(scalePower)));
      }

      productCoefList[coefIdx] = finalCoef;
    }

    return new Polynomial(productCoefList);
  }
}

export default Polynomial;
