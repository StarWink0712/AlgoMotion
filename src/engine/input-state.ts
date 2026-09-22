function sameJsonValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, i) => sameJsonValue(value, right[i]));
  }
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
  return Object.keys(a).length === Object.keys(b).length && Object.keys(b).every((key) => Object.hasOwn(a, key) && sameJsonValue(a[key], b[key]));
}

// Compare values, not formatting or object-key order; never rerun an algorithm while typing.
export function inputMatchesExecution(draft: string, executedInput: unknown): boolean {
  try { return sameJsonValue(JSON.parse(draft), executedInput); } catch { return false; }
}
