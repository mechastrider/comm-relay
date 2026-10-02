/** Storage can be disabled at the getter level by an embedded/private browser. */
export function preferenceStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
