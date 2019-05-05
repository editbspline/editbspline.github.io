/* @flow */

import factorizer from '../factorizer';

function reduceDirect (num, den) {
  let numFactors = factorizer(num);
  let denFactors = factorizer(den);

  for (let i = 0; i < numFactors.length && i < denFactors.length;) {
    if (denFactors.includes(numFactors[i])) {
      num /= numFactors[i];
      den /= denFactors[denFactors.indexOf(numFactors[i])];
      denFactors.splice(denFactors.indexOf(numFactors[i]), 1);
      numFactors.splice(i, 1);
    } else {
      ++i;
    }
  }

  return {
    num: num,
    den: den
  };
}

function reduce (value, round) {
  let num = value * Math.pow(10, round);
  let den = Math.pow(10, round);

  let powdown = 0;
  while (num % 10 === 0 && den % 10 === 0) {
    num /= 10;
    den /= 10;
    ++powdown;
  }

  let numFactors = factorizer(num);
  let denFactors = [];
  for (let i = 0; i < round - powdown; i++) {
    denFactors.push(2);
    denFactors.push(5);
  }

  for (let i = 0; i < numFactors.length && i < denFactors.length;) {
    if (denFactors.includes(numFactors[i])) {
      num /= numFactors[i];
      den /= denFactors[denFactors.indexOf(numFactors[i])];
      denFactors.splice(denFactors.indexOf(numFactors[i]), 1);
      numFactors.splice(i, 1);
    } else {
      ++i;
    }
  }

  return {
    num: num,
    den: den
  };
}

function fractionalizeRepeatingDecimal (value: number, repeatOffset: number, repeatSize: number) {
  const value$num = value * Math.pow(10, repeatOffset + repeatSize);
  const value$den = value * Math.pow(10, repeatOffset);

  const num = Math.round(value$num - value$den);
  const den = Math.pow(10, repeatOffset + repeatSize) - Math.pow(10, repeatOffset);
  return reduceDirect(num, den);
}

const fixedTo = function (number, n) {
  var k = Math.pow(10, n);
  return (Math.round(number * k) / k);
};

/**
 * Converts a decimal into a fraction
 */
export default function fractionalize (value: number, round: number = 7): number {
  value = fixedTo(value, round);
  const integer = Math.floor(value);
  const decimal = value - integer;

  const dstring = '' + decimal;
  let isRepeating = true;
  for (let i = 3; i < round; i++) {
    if (dstring[i] !== dstring[i - 1]) {
      isRepeating = false;
    }
  }

  if (isRepeating) {
    return fractionalizeRepeatingDecimal(value, 0, 1);
  }

  return reduce(value, round);
}
