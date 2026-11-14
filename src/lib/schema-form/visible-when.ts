/**
 * `ui:visible_when`, the hub's one condition grammar for settings fields.
 *
 * A port of FiestaBoard `web/src/lib/visible-when.ts` (Python twin:
 * `src/plugins/settings_ui.py`). `visible-when.cases.json` beside this file is
 * a verbatim copy of the hub's shared vectors (hub `91018934a`); the test runs
 * every one, so the three evaluators cannot drift apart silently.
 *
 *     Condition := { "<field>": <scalar> }          field equals the scalar
 *                | { "<field>": [<scalar>, ...] }   field is one of them
 *                | { "<f1>": ..., "<f2>": ... }     every pair holds (AND)
 *                | { "not": Condition }             negation ("not" alone)
 *                | { "any": [Condition, ...] }      at least one holds ("any" alone)
 *
 * Scalars compare as JSON with no coercion. An absent field reads as its
 * schema `default`, else `null`. A malformed condition is visible. A field
 * named `@device_type` / `@device_model` reads the BOARD facts, not a sibling.
 */

type Scalar = string | number | boolean | null;

/** The board facts a condition reads by `@` names. */
export interface SchemaBoardFacts {
  /** `flagship` | `note` | `note_array` | `panel` (the hub's display shapes). */
  device_type?: string | null;
  /** The output plugin's model id, e.g. `pixoo64`, `ulanzi_tc001`. */
  device_model?: string | null;
  [fact: string]: unknown;
}

/** Kleene three-valued result: `undefined` is "depends on the board" (only in board-blind mode). */
type Tri = boolean | undefined;
const MALFORMED = Symbol("malformed");
type Result = Tri | typeof MALFORMED;

function isScalar(value: unknown): value is Scalar {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function jsonEqual(actual: unknown, expected: Scalar): boolean {
  return isScalar(actual) && typeof actual === typeof expected && actual === expected;
}

function own(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

interface Scope {
  values: Record<string, unknown>;
  properties: Record<string, unknown>;
  facts: Record<string, unknown>;
  /** Treat every `@` pair as unknown instead of reading the facts. */
  boardBlind: boolean;
}

function valueOf(field: string, scope: Scope): unknown {
  if (field.startsWith("@")) {
    const key = field.slice(1);
    return own(scope.facts, key) ? (scope.facts[key] ?? null) : null;
  }
  if (own(scope.values, field)) return scope.values[field];
  const prop = scope.properties[field];
  if (prop && typeof prop === "object" && "default" in prop) return (prop as { default?: unknown }).default ?? null;
  return null;
}

function evaluate(cond: unknown, scope: Scope): Result {
  if (!cond || typeof cond !== "object" || Array.isArray(cond)) return MALFORMED;
  const record = cond as Record<string, unknown>;
  const entries = Object.entries(record);
  if (entries.length === 0) return MALFORMED;
  if (own(record, "not") || own(record, "any")) {
    if (entries.length !== 1) return MALFORMED;
    if (own(record, "not")) {
      const inner = evaluate(record.not, scope);
      return inner === MALFORMED || inner === undefined ? inner : !inner;
    }
    const branches = record.any;
    if (!Array.isArray(branches) || branches.length === 0) return MALFORMED;
    const results = branches.map((branch) => evaluate(branch, scope));
    if (results.includes(MALFORMED)) return MALFORMED;
    if (results.includes(true)) return true;
    return results.includes(undefined) ? undefined : false;
  }
  // Pair by pair, in order, returning at the first that fails, exactly as
  // the hub does (a malformed pair AFTER a failing one is never reached).
  let result: Tri = true;
  for (const [field, expected] of entries) {
    if (Array.isArray(expected) ? !expected.every(isScalar) : !isScalar(expected)) return MALFORMED;
    if (scope.boardBlind && field.startsWith("@")) {
      result = undefined;
      continue;
    }
    const actual = valueOf(field, scope);
    const holds = Array.isArray(expected)
      ? (expected as Scalar[]).some((e) => jsonEqual(actual, e))
      : jsonEqual(actual, expected as Scalar);
    if (!holds) return false;
  }
  return result;
}

function scopeOf(
  values: Record<string, unknown> | null | undefined,
  properties: Record<string, unknown> | null | undefined,
  facts: SchemaBoardFacts | null | undefined,
  boardBlind: boolean,
): Scope {
  return {
    values: values ?? {},
    properties: properties ?? {},
    facts: (facts ?? {}) as Record<string, unknown>,
    boardBlind,
  };
}

/**
 * Whether a field with `ui:visible_when` *cond* shows, given the values of the
 * object it lives in, that object's property schemas (for defaults) and the
 * board's facts.
 */
export function isSchemaFieldVisible(
  cond: unknown,
  values?: Record<string, unknown> | null,
  properties?: Record<string, unknown> | null,
  facts?: SchemaBoardFacts | null,
): boolean {
  if (cond === undefined || cond === null) return true;
  const result = evaluate(cond, scopeOf(values, properties, facts, false));
  return result === MALFORMED ? true : result !== false;
}

/**
 * The field is hidden, and the BOARD is why: with the board's facts it is
 * hidden, and with them unknown the condition is no longer decided. A field
 * that sibling values hide (Cloud mode hides the local key) is not
 * "unavailable on this display"; it is just not relevant yet.
 */
export function hiddenByBoard(
  cond: unknown,
  values?: Record<string, unknown> | null,
  properties?: Record<string, unknown> | null,
  facts?: SchemaBoardFacts | null,
): boolean {
  if (cond === undefined || cond === null) return false;
  if (isSchemaFieldVisible(cond, values, properties, facts)) return false;
  return evaluate(cond, scopeOf(values, properties, facts, true)) === undefined;
}
