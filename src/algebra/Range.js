/* @flow */

/**
 * A range represents a subset of the real-number set. It
 * is described by boolean function that tells if a number
 * lies in this range.
 *
 * Ranges can also be checked for equality; however, inequality
 * cannot be guaranteed.
 *
 * @typedef {Object} Range
 */
export interface Range {
  isIn(point: number): boolean;
  equals(otherRange: Range): boolean;
  toJAXString(): string;
}

/**
 * @const { }
 */
export type RangeOperator = 'intersection' | 'union';

function rangeOperatorToJAXSymbol(opr: RangeOperator) {
  return (opr === 'intersection') ? '\\cap' : '\\cup';
}

/**
 * A simple range is one continuous subset of real-numbers,
 * which is described by a lower and upper boundary. Both
 * boundaries may or may not be inclusive.
 *
 * A complementary simple range may be formed, which contains
 * all real-numbers but the ones contained in the boundaries.
 *
 * @param {number} lowerBoundary
 * @param {number} upperBoundary
 * @param {boolean}[isInclusiveLower=true]
 * @param {boolean}[isInclusiveUpper=true]
 * @class
 */
export class SimpleRange implements Range {
  /**
   * Lower boundary of this range.
   *
   * @name SimpleRange#lowerBoundary
   * @type number
   */
  lowerBoundary: number;

  /**
   * Upper boundary of this range.
   *
   * @name SimpleRange#upperBoundary
   * @type number
   */
  upperBoundary: number;

  /**
   * If {@code this.lowerBoundary} is inclusive or not.
   *
   * @name SimpleRange#isInclusiveLower
   * @type boolean
   * @default true
   */
  isInclusiveLower: boolean;

  /**
   * If {@code this.upperBoundary} is inclusive or not.
   *
   * @name SimpleRange#isInclusiveUpper
   * @type boolean
   * @default true
   */
  isInclusiveUpper: boolean;

  /**
   * If this range is a complement of the range described
   * by the other four properties.
   *
   * @name SimpleRange#isComplement
   * @type boolean
   */
  isComplement: boolean;

  constructor(lowerBoundary: number, upperBoundary: number,
    isInclusiveLower: boolean = true, isInclusiveUpper: boolean = true,
    isComplement: boolean = false
  ) {
    this.lowerBoundary = lowerBoundary;
    this.upperBoundary = upperBoundary;
    this.isInclusiveLower = isInclusiveLower;
    this.isInclusiveUpper = isInclusiveUpper;
    this.isComplement = isComplement;
  }

  isIn(point: number) {
    let isIn = false;

    if (point > this.lowerBoundary && point < this.upperBoundary) {
      isIn = true;
    } else if ((this.isInclusiveLower && point === this.lowerBoundary) ||
        (this.isInclusiveUpper && point === this.upperBoundary)) {
      isIn = true;
    }

    return (this.isComplement) ? !isIn : isIn;
  }

  /**
   * Does a 'shallow' comparision of this and the other
   * range. If both were created by the same process,
   * then it will return true. However, this cannot be
   * guaranteed for composite ranges.
   *
   * @param {Range} otherRange - range to compare with
   * @return whether this and otherRange are equivalent
   */
  equals(otherRange: Range) {
    if (!(otherRange instanceof SimpleRange)) {
      return false;
    }

    return (this.lowerBoundary === otherRange.lowerBoundary &&
      this.upperBoundary === otherRange.upperBoundary &&
      this.isInclusiveLower === otherRange.isInclusiveLower &&
      this.isInclusiveUpper === otherRange.isInclusiveUpper &&
      this.isComplement === otherRange.isComplement);
  }

  toJAXString(): string {
    return `${ this.isInclusiveLower ? '[' : '(' }` +
      `${ this.lowerBoundary }, ${ this.upperBoundary }` +
      `${ this.isInclusiveUpper ? ']' : ')' }` +
      `${ this.isComplement ? '\'' : '' }`;
  }
}

/**
 * A composite range is formed by joining an array of child
 * ranges using a {@code RangeOperator}.
 */
export class CompositeRange implements Range {
  /**
   * Child ranges
   *
   * @name CompositeRange#rangeChildren
   * @type Array<Range>
   */
  rangeChildren: Array<Range>;

  /**
   * @name CompositeRange#operator
   * @type RangeOperator
   */
  operator: RangeOperator;

  /**
   * Setting this to {@code true}, will represent the
   * complementary set of otherwise.
   *
   * @name CompositeRange#isComplement
   * @type boolean
   */
  isComplement: boolean;

  constructor(rangeChildren: Array<Range>, operator: RangeOperator = 'union',
    isComplement: boolean = false
  ) {
    this.rangeChildren = rangeChildren;
    this.operator = operator;
    this.isComplement = isComplement;
  }

  isIn(point: number) {
    const { operator } = this;
    let isIn = operator !== 'union';

    this.rangeChildren.forEach((range) => {
      const isInChild = range.isIn(point);

      switch (operator) {
        case 'union':
          isIn = isIn || isInChild;
          break;
        case 'intersection':
          isIn = isIn && isInChild;
          break;
        default:
          throw new Error('Only union & intersection operators allowed');
      }
    });

    return (this.isComplement) ? !isIn : isIn;
  }

  /**
   * Shallow equality check. Doesn't guarantee that both sets
   * aren't equivalent.
   *
   * @param {Range} otherRange - range to compare with
   * @return whether {@code otherRange} is equal to this
   */
  equals(otherRange: Range | CompositeRange): boolean {
    if (otherRange instanceof CompositeRange) {
      return (this.operator === otherRange.operator &&
        this.isComplement === otherRange.isComplement &&
        // $FlowFixMe
        this.rangeChildren.reduce((acc, value) => acc &&
        // $FlowFixMe
        otherRange.rangeChildren.includes(value)));
    }
    return false;
  }

  toJAXString(): string {
    return `(${
      this.rangeChildren.map((child) => child.toJAXString()).join(
        rangeOperatorToJAXSymbol(this.operator)
      )
    })${
      (this.isComplement) ? '\'' : ''
    }`;
  }
}
