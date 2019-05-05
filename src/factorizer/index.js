export default function factorize (n) {
  n = Math.floor(n);
  let factors = [];

  console.log('Factorize: ' + n);

  for (let f = 2; n !== 1;) {
    if (n % f === 0) {
      factors.push(f);
      n /= f;
      n = Math.round(n);
    } else {
      ++f;
    }
  }

  return factors;
}
