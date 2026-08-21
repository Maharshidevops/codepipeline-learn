// caseMapper (Phase 16) — pure recursive key transforms for the FastAPI seam. A real FastAPI returns
// snake_case JSON; the typed reads in this app are camelCase. These convert between the two so, at
// integration time, http.ts can camelize responses + snakeize request bodies in ONE place (replacing
// the per-service hand-mapping). NOT yet wired — see Phases/BACKEND-INTEGRATION.md (deliberate
// deferral: wiring it before a live backend exists is speculative risk on the working mock app).
//
// Behavior: recurses arrays + plain objects, leaves everything else (primitives, Date, File,
// FormData, Map, class instances) untouched. camelizeKeys is idempotent on already-camel keys, so
// it's safe to apply even before the swap.

function toCamel(key: string): string {
  return key.replace(/_+([a-z0-9])/g, (_match, c: string) => c.toUpperCase());
}

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

// Only transform "plain" objects (object literals / null-prototype). Dates, Files, FormData, Maps,
// and class instances are left as-is so we never mangle non-data values.
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === Object.prototype || proto === null;
}

function mapKeysDeep(value: unknown, mapKey: (key: string) => string): unknown {
  if (Array.isArray(value)) return value.map((item) => mapKeysDeep(item, mapKey));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[mapKey(key)] = mapKeysDeep(val, mapKey);
    }
    return out;
  }
  return value;
}

export function camelizeKeys<T = unknown>(value: unknown): T {
  return mapKeysDeep(value, toCamel) as T;
}

export function snakeizeKeys<T = unknown>(value: unknown): T {
  return mapKeysDeep(value, toSnake) as T;
}
