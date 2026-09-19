// Narrowing helpers for untrusted JSON. `prefix` makes the thrown message caller-specific.
export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function guards(prefix: string) {
  function fail(path: string): never { throw new Error(`${prefix}${path}`) }
  function obj(v: unknown, path: string): Record<string, unknown> {
    if (!isPlainObject(v)) fail(path)
    return v
  }
  function arr(v: unknown, path: string): unknown[] {
    if (!Array.isArray(v)) fail(path)
    return v
  }
  function str(v: unknown, path: string): string {
    if (typeof v !== 'string') fail(path)
    return v
  }
  function num(v: unknown, path: string): number {
    if (typeof v !== 'number' || !Number.isFinite(v)) fail(path)
    return v
  }
  return { fail, obj, arr, str, num }
}
