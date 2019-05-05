/* @flow */

/**
 * Prevents out-of-bound array accesses by returning a default
 * value for un-indexed locations.
 *
 * @param {Array} arr - array to access
 * @param {number} index - index of {@code arr} to access
 * @param {Object}[outOfBoundsValue=0] - value to return for un-indexed
 *    locations.
 * @return the value at index in arr; if index is out-of-bounds, then
 *    the default value is returned.
 */
export function clippedArrayAccess<T>(
  arr: Array<T>,
  index: number,
  outOfBoundsValue: T = ((0: any): T)
): T {
  if (index < 0 || index >= arr.length) {
    return outOfBoundsValue;
  }

  return arr[index];
}

export default clippedArrayAccess;
