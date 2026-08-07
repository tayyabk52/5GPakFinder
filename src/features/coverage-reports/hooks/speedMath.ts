export function mbpsFromTransfer(bytes: number, ms: number): number {
  if (ms <= 0) {
    return 0;
  }

  const bits = bytes * 8;
  const seconds = ms / 1000;
  return bits / seconds / 1_000_000;
}

export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}
