export function is(a, b) {
  if (a === b) {
    return;
  }
  throw Error(`Expected ${a} to equal ${b}`);
}
