/**
 * Character sets — which glyphs a board can draw.
 *
 * A Vestaboard has one set: the 72 flap codes, uppercase, with one flap that
 * is a degree sign on boards built before 2026 and a heart on boards built
 * since. That is two *versions* of one set, and `code62Glyph` /
 * `resolveCode62Glyph` (./board-characters) is how a caller says which one a
 * board carries. An LED matrix intersects with the flap set and goes past it
 * — lowercase, icons, colour spans, block spans — while a 3×5 face loses the
 * icons a tiny cell cannot draw. So a set is a first-class thing: a device
 * declares one (./devices), a renderer draws what it says, an editor offers
 * only what it contains and warns about the rest, and a specimen shows what
 * one set adds or lacks against another.
 *
 * Sets have lineage (`extends`) for documentation and for computing diffs;
 * membership is always spelled out in full, so a lookup never walks a chain.
 *
 * A set is **plain, JSON-serialisable data** — arrays and strings, no
 * functions, no class instances — because a FiestaBoard *output plugin* may
 * declare its own ({@link validateCharacterSet}, {@link materializeCharacterSet}):
 * the built-ins are defaults, not the universe. A set that adds characters
 * its face does not have carries their bitmaps in `glyphs`, as `#`/`.` rows.
 *
 * Tokens are never rewritten on the way through here: a colour tile keeps
 * the spelling it was parsed with (`"red"` or `"63"`), and a typed `♥` stays
 * `♥`. Projecting to numeric codes is the split-flap renderer's job
 * (`getCharIndex`), and FiestaBoard core does the same at its CellFrame
 * boundary.
 */

import { BOARD_CHARS, type BoardToken, type Code62Glyph, parseLine, resolveCode62Glyph } from "./board-characters";
import { BOARD_ICON_NAMES, BOARD_ICONS, type BoardIconName } from "./board-icons";
import { LED_FONTS, type LedFontId } from "./led-fonts";

/** The built-in sets. A plugin's set has an id of its own choosing. */
export type CharacterSetId = "vestaboard_v1" | "vestaboard_v2" | "led_5x7" | "led_3x5";

export interface CharacterSet {
  /** A built-in id, or a plugin's own (`"acme_sign_v1"`). */
  id: string;
  label: string;
  /**
   * Bumps whenever the set's content changes (the heart replaced the
   * degree). A plugin must bump it with every change to its set, because
   * consumers cache by (`id`, `version`). It is never inherited through
   * `extends`: a declaration that leaves it out is version 1.
   */
  version: number;
  /** The set this one was derived from, for lineage, diffs and
   *  {@link materializeCharacterSet}'s inheritance. */
  extends?: string;
  /** Every printable character the set draws, including `°` and/or `♥`. */
  chars: readonly string[];
  /** Colour tiles (`{red}`, codes 63–71). */
  tiles: boolean;
  /** Icons (`{icon:sun}`) the set draws as glyphs. Others draw their fallback. */
  icons: readonly BoardIconName[];
  /** Lowercase letters are drawn as themselves rather than uppercased. */
  mixedCase: boolean;
  /** Colour spans (`{red:HOT}`) colour their letters. */
  colorSpans: boolean;
  /** Block spans (`{black/white:OPEN}`) light the cell background. */
  blockSpans: boolean;
  /** What code 62 draws when the hardware fixes it. Unset: the device can
   *  draw either `°` and `♥` as written. */
  code62Glyph?: Code62Glyph;
  /** The bitmap face an LED set is drawn in. Unset for a split-flap set. */
  font?: LedFontId;
  /**
   * Bitmaps for characters in `chars` that `font` does not carry (a plugin's
   * `€`, a logo): `glyphHeight` rows of `glyphWidth` `#`/`.` characters,
   * exactly like ./led-fonts. A character here that the face also has wins.
   */
  glyphs?: Readonly<Record<string, readonly string[]>>;
}

/** Every key a set may carry; anything else is a typo the validators reject. */
const CHARACTER_SET_KEYS = new Set([
  "id",
  "label",
  "version",
  "extends",
  "chars",
  "tiles",
  "icons",
  "mixedCase",
  "colorSpans",
  "blockSpans",
  "code62Glyph",
  "font",
  "glyphs",
]);

/** Set-backed lookups for a set's arrays, built once per set object. */
const lookups = new WeakMap<CharacterSet, { chars: Set<string>; icons: Set<string> }>();
function lookup(set: CharacterSet) {
  let l = lookups.get(set);
  if (!l) {
    l = { chars: new Set(set.chars), icons: new Set(set.icons) };
    lookups.set(set, l);
  }
  return l;
}
/** Does the set draw this character? */
export function charsetHasChar(set: CharacterSet, char: string): boolean {
  return lookup(set).chars.has(char);
}
/** Does the set draw this icon as a glyph? */
export function charsetHasIcon(set: CharacterSet, icon: string): boolean {
  return lookup(set).icons.has(icon);
}

/** The printable flap characters, codes 1–61: letters, digits, punctuation. */
const FLAP_CHARS = BOARD_CHARS.slice(1, 62).filter((c) => c !== " ");
const LOWERCASE = [..."abcdefghijklmnopqrstuvwxyz"];

function ledSet(id: CharacterSetId, label: string, font: LedFontId, extendsId: CharacterSetId): CharacterSet {
  const glyphs = LED_FONTS[font];
  return {
    id,
    label,
    version: 1,
    extends: extendsId,
    chars: Object.keys(glyphs.glyphs),
    font,
    tiles: true,
    icons: BOARD_ICON_NAMES.filter((name) => glyphs.icons[name] !== undefined),
    mixedCase: true,
    colorSpans: true,
    blockSpans: true,
  };
}

export const CHARACTER_SETS: Readonly<Record<CharacterSetId, CharacterSet>> = {
  vestaboard_v1: {
    id: "vestaboard_v1",
    label: "Vestaboard (degree flap)",
    version: 1,
    chars: [...FLAP_CHARS, "°"],
    tiles: true,
    icons: [],
    mixedCase: false,
    colorSpans: false,
    blockSpans: false,
    code62Glyph: "degree",
  },
  vestaboard_v2: {
    id: "vestaboard_v2",
    label: "Vestaboard (heart flap)",
    version: 2,
    extends: "vestaboard_v1",
    chars: [...FLAP_CHARS, "♥"],
    tiles: true,
    icons: [],
    mixedCase: false,
    colorSpans: false,
    blockSpans: false,
    code62Glyph: "heart",
  },
  led_5x7: ledSet("led_5x7", "LED matrix, 5×7 face", "5x7", "vestaboard_v2"),
  led_3x5: ledSet("led_3x5", "LED matrix, 3×5 face", "3x5", "led_5x7"),
};

export const CHARACTER_SET_IDS = Object.keys(CHARACTER_SETS) as CharacterSetId[];

export function isCharacterSetId(value: unknown): value is CharacterSetId {
  return typeof value === "string" && Object.hasOwn(CHARACTER_SETS, value);
}

/** The fields a whole set carries; a declaration missing any is partial. */
const WHOLE_SET_FIELDS = [
  "label",
  "version",
  "chars",
  "tiles",
  "icons",
  "mixedCase",
  "colorSpans",
  "blockSpans",
] as const;

/** Is this object a whole {@link CharacterSet}, or a declaration still to be made whole? */
function isWholeCharacterSet(set: CharacterSetInput): set is CharacterSet {
  return WHOLE_SET_FIELDS.every((field) => set[field] !== undefined);
}

/**
 * Partial declarations made whole, one per declaration object: a model that
 * embeds `{ id, extends: "led_3x5" }` resolves to the same set every time,
 * so WeakMap-keyed lookups ({@link charsetHasChar}) and memoised consumers
 * see one identity.
 */
const materializedByInput = new WeakMap<CharacterSetInput, CharacterSet>();

/**
 * A set by built-in id, or the object itself (a plugin's). An unknown id is
 * an error, loudly: nothing here coerces a stranger to a Vestaboard. A
 * partial declaration (`{ id, extends }`, as a device model may embed) is
 * made whole with {@link materializeCharacterSet} — never handed back raw,
 * so every set-level helper can read its `chars` and `icons` — and throws
 * as that does when it cannot be.
 */
export function resolveCharacterSet(set: CharacterSetId | CharacterSet | CharacterSetInput | string): CharacterSet {
  if (typeof set !== "string") {
    if (isWholeCharacterSet(set)) return set;
    let whole = materializedByInput.get(set);
    if (!whole) {
      whole = materializeCharacterSet(set);
      materializedByInput.set(set, whole);
    }
    return whole;
  }
  if (isCharacterSetId(set)) return CHARACTER_SETS[set];
  throw new Error(
    `Unknown character set "${set}". Built-ins: ${CHARACTER_SET_IDS.join(", ")}; a plugin's set must be passed as an object.`,
  );
}

/** {@link resolveCharacterSet} without the throw: the set, or why not. */
export function tryResolveCharacterSet(
  set: CharacterSetId | CharacterSet | CharacterSetInput | string,
): { set: CharacterSet; error?: undefined } | { set?: undefined; error: string } {
  try {
    return { set: resolveCharacterSet(set) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** What a plugin manifest declares: a full set, or a partial one over `extends`. */
export type CharacterSetInput = Partial<Omit<CharacterSet, "id">> & { id: string };

/**
 * A declared set made whole. The merge rule, field by field:
 *
 * - A field the declaration gives **replaces** the parent's. That includes
 *   the arrays and `glyphs`, which are replaced **wholesale**, never merged:
 *   a plugin that says `chars: ["A", "B"]` over `led_3x5` draws A and B,
 *   and one that gives `glyphs` gives all of them.
 * - A field it leaves out is **inherited** from the set it `extends` (a
 *   built-in, or one of `known`).
 * - `version` is **not inherited**: it is the declaration's own, default 1.
 *   A plugin bumps it whenever its set's content changes, because consumers
 *   cache by (`id`, `version`).
 * - `extends` is kept on the result as lineage; the chain is one level deep
 *   at materialisation (the parent is already whole).
 *
 * Throws on an invalid declaration — a malformed field, or a key that is not
 * a set field (a typo is a field the author meant, never silently dropped;
 * the schema's `additionalProperties: false` says the same) — on an unknown
 * or circular `extends`, and when the whole result does not validate. A set
 * that extends nothing must be complete.
 */
export function materializeCharacterSet(input: CharacterSetInput, known: readonly CharacterSet[] = []): CharacterSet {
  // The declaration is checked as given — whole when it extends nothing,
  // partial over `extends` — before anything is inherited.
  const declared = validateCharacterSet(input);
  if (!declared.ok) throw new Error(`Character set "${input.id}" is invalid: ${declared.errors.join("; ")}`);
  const seen = new Set<string>([input.id]);
  let parent: CharacterSet | undefined;
  if (input.extends !== undefined) {
    const found =
      known.find((k) => k.id === input.extends) ??
      (isCharacterSetId(input.extends) ? CHARACTER_SETS[input.extends] : undefined);
    if (!found) throw new Error(`Character set "${input.id}" extends unknown set "${input.extends}".`);
    if (seen.has(found.id)) throw new Error(`Character set "${input.id}" extends itself.`);
    parent = found;
  }
  const set: CharacterSet = {
    id: input.id,
    label: input.label ?? parent?.label ?? input.id,
    version: input.version ?? 1,
    chars: input.chars ?? parent?.chars ?? [],
    tiles: input.tiles ?? parent?.tiles ?? false,
    icons: input.icons ?? parent?.icons ?? [],
    mixedCase: input.mixedCase ?? parent?.mixedCase ?? false,
    colorSpans: input.colorSpans ?? parent?.colorSpans ?? false,
    blockSpans: input.blockSpans ?? parent?.blockSpans ?? false,
  };
  if (input.extends !== undefined) set.extends = input.extends;
  const code62 = input.code62Glyph ?? parent?.code62Glyph;
  if (code62 !== undefined) set.code62Glyph = code62;
  const font = input.font ?? parent?.font;
  if (font !== undefined) set.font = font;
  const glyphs = input.glyphs ?? parent?.glyphs;
  if (glyphs !== undefined) set.glyphs = glyphs;
  const { ok, errors } = validateCharacterSet(set);
  if (!ok) throw new Error(`Character set "${input.id}" is invalid: ${errors.join("; ")}`);
  return set;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

/**
 * Check that a value is a well-formed {@link CharacterSet} — the contract a
 * FiestaBoard output plugin's manifest is validated against (mirrored by
 * scripts/ci/tests/fixtures/character-set.schema.json, and tested to agree
 * with it). Pure; never throws.
 */
export function validateCharacterSet(json: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof json !== "object" || json === null || Array.isArray(json)) return { ok: false, errors: ["not an object"] };
  const s = json as Record<string, unknown>;
  for (const key of Object.keys(s)) if (!CHARACTER_SET_KEYS.has(key)) errors.push(`${key}: not a character set field`);
  // A declaration over `extends` may leave fields out: they are inherited by
  // materializeCharacterSet, which validates the whole result again.
  const partial = typeof s.extends === "string";
  const missing = (field: string) => partial && s[field] === undefined;
  if (typeof s.id !== "string" || !/^[a-z][a-z0-9_]*$/.test(s.id))
    errors.push("id: a lowercase identifier (letters, digits, _)");
  if (!missing("label") && (typeof s.label !== "string" || s.label.length === 0))
    errors.push("label: a non-empty string");
  if (!missing("version") && (typeof s.version !== "number" || !Number.isInteger(s.version) || s.version < 1))
    errors.push("version: a positive integer");
  if (s.extends !== undefined && typeof s.extends !== "string") errors.push("extends: a set id");
  if (!missing("chars") && (!isStringArray(s.chars) || s.chars.some((c) => [...c].length !== 1 || c === " ")))
    errors.push("chars: an array of single printable characters");
  for (const flag of ["tiles", "mixedCase", "colorSpans", "blockSpans"]) {
    if (!missing(flag) && typeof s[flag] !== "boolean") errors.push(`${flag}: a boolean`);
  }
  if (
    !missing("icons") &&
    (!isStringArray(s.icons) || s.icons.some((i) => !BOARD_ICON_NAMES.includes(i as BoardIconName)))
  ) {
    errors.push(`icons: an array of registered icon names (${BOARD_ICON_NAMES.join(", ")})`);
  }
  if (s.code62Glyph !== undefined && s.code62Glyph !== "degree" && s.code62Glyph !== "heart")
    errors.push('code62Glyph: "degree" or "heart"');
  if (s.font !== undefined && !Object.hasOwn(LED_FONTS, s.font as string))
    errors.push(`font: one of ${Object.keys(LED_FONTS).join(", ")}`);
  if (s.glyphs !== undefined) {
    if (typeof s.glyphs !== "object" || s.glyphs === null || Array.isArray(s.glyphs))
      errors.push("glyphs: an object of char → rows");
    else {
      if (s.font === undefined && !partial) errors.push("glyphs: need a font to size against");
      const face = Object.hasOwn(LED_FONTS, s.font as string) ? LED_FONTS[s.font as LedFontId] : undefined;
      for (const [char, rows] of Object.entries(s.glyphs as Record<string, unknown>)) {
        if ([...char].length !== 1) errors.push(`glyphs.${char}: key must be one character`);
        if (!isStringArray(rows) || rows.length === 0 || rows.some((r) => !/^[#.]+$/.test(r))) {
          errors.push(`glyphs.${char}: rows of '#'/'.' characters`);
        } else if (
          face &&
          (rows.length !== face.glyphHeight || rows.some((r) => !new RegExp(`^[#.]{${face.glyphWidth}}$`).test(r)))
        ) {
          errors.push(`glyphs.${char}: ${face.glyphHeight} rows of ${face.glyphWidth} '#'/'.' characters`);
        }
        if (isStringArray(s.chars) && !s.chars.includes(char)) errors.push(`glyphs.${char}: not in chars`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * The set a split-flap board carries. This is {@link resolveCode62Glyph}
 * expressed as a set: Note, note-array and panel boards are heart-flap
 * hardware; a Flagship is whichever version its owner says.
 */
export function characterSetForDevice(deviceType: string, code62Glyph?: Code62Glyph): CharacterSet {
  return resolveCode62Glyph(deviceType, code62Glyph) === "heart"
    ? CHARACTER_SETS.vestaboard_v2
    : CHARACTER_SETS.vestaboard_v1;
}

/** Why a token is outside a set — the editor's warning text keys off it. */
export type CharsetIssue = "char" | "case" | "tile" | "icon" | "colorSpan" | "blockSpan";

/** The first reason a set cannot draw `token` as written, or `null` if it can. */
export function charsetIssue(
  set: CharacterSetId | CharacterSet | CharacterSetInput,
  token: BoardToken,
): CharsetIssue | null {
  const s = resolveCharacterSet(set);
  if (token.icon !== undefined && !charsetHasIcon(s, token.icon)) return "icon";
  // An icon the set draws never reaches its fallback tile, so a set without
  // tiles keeps it; only the span colours around it can be lost, as around
  // a letter. A plain tile is a tile.
  if (token.type === "color" && token.icon === undefined) return s.tiles ? null : "tile";
  if (token.background !== undefined && !s.blockSpans) return "blockSpan";
  if (token.color !== undefined && !s.colorSpans) return "colorSpan";
  // What is left of a supported icon is its glyph, whatever its fallback.
  if (token.type === "color" || token.icon !== undefined) return null;
  if (token.value === " ") return null;
  if (charsetHasChar(s, token.value)) return null;
  if (token.value !== token.value.toUpperCase() && charsetHasChar(s, token.value.toUpperCase())) {
    return s.mixedCase ? "char" : "case";
  }
  return "char";
}

export function charsetSupports(set: CharacterSetId | CharacterSet | CharacterSetInput, token: BoardToken): boolean {
  return charsetIssue(set, token) === null;
}

/**
 * The token a set draws in place of one it cannot: an icon's registered
 * fallback, lowercase uppercased, a span's colours dropped, `°` ↔ `♥` across
 * Vestaboard versions, and blank for anything else — the same rules the
 * renderers apply, so an editor can show the user exactly what will appear.
 *
 * An icon degrades to its fallback *with the span's colours still on it*,
 * whether the fallback is a character or a colour tile — exactly the token
 * `parseLine` emits for the icon (FiestaBoard B1 finding 5). A tile keeps
 * them as informational fields; a character then goes through the set's
 * span rules like any other character.
 */
export function charsetFallback(set: CharacterSetId | CharacterSet | CharacterSetInput, token: BoardToken): BoardToken {
  const s = resolveCharacterSet(set);
  let t: BoardToken = token;
  if (t.icon !== undefined && charsetHasIcon(s, t.icon)) {
    // The set draws the glyph itself, so the fallback tile or character is
    // never reached — even where the set has no tiles. Span colours the set
    // cannot draw are dropped, as they are around a letter.
    if ((t.color === undefined || s.colorSpans) && (t.background === undefined || s.blockSpans)) return t;
    const kept: BoardToken = { ...t };
    if (!s.colorSpans) delete kept.color;
    if (!s.blockSpans) delete kept.background;
    return kept;
  }
  if (t.icon !== undefined) {
    const { fallback } = BOARD_ICONS[t.icon];
    const degraded: BoardToken =
      fallback !== null && /^\d\d$/.test(fallback)
        ? { type: "color", code: fallback }
        : { type: "char", value: fallback ?? " " };
    if (t.color !== undefined) degraded.color = t.color;
    if (t.background !== undefined) degraded.background = t.background;
    t = degraded;
  }
  if (t.type === "color") return s.tiles ? t : { type: "char", value: " " };
  if (t.icon !== undefined) return t;
  const out: BoardToken = { type: "char", value: t.value };
  if (t.color !== undefined && s.colorSpans) out.color = t.color;
  if (t.background !== undefined && s.blockSpans) out.background = t.background;
  if (!charsetHasChar(s, out.value)) {
    const upper = out.value.toUpperCase();
    if (charsetHasChar(s, upper)) out.value = upper;
    else if (out.value === "°" && charsetHasChar(s, "♥")) out.value = "♥";
    else if (out.value === "♥" && charsetHasChar(s, "°")) out.value = "°";
    else if (out.value !== " ") out.value = " ";
  }
  return out;
}

export interface CharsetValidationIssue {
  row: number;
  col: number;
  token: BoardToken;
  reason: CharsetIssue;
  /** What the board will draw there instead. */
  fallback: BoardToken;
}

export interface CharsetValidation {
  ok: boolean;
  issues: CharsetValidationIssue[];
}

/**
 * Check a message against a set, position by position. Parses with the
 * extended markup on, because this is the authoring side: the question is
 * "will this board draw what I wrote", and the answer for a flap board is
 * that spans and icons degrade. Case is preserved when the set has it, so a
 * lowercase letter on an uppercase set is reported as a `case` issue.
 */
export function validateMessage(
  message: string,
  set: CharacterSetId | CharacterSet | CharacterSetInput,
): CharsetValidation {
  const s = resolveCharacterSet(set);
  const issues: CharsetValidationIssue[] = [];
  message.split("\n").forEach((line, row) => {
    parseLine(line, Infinity, { extendedMarkup: true, preserveCase: true }).forEach((token, col) => {
      const reason = charsetIssue(s, token);
      if (reason) issues.push({ row, col, token, reason, fallback: charsetFallback(s, token) });
    });
  });
  return { ok: issues.length === 0, issues };
}

/** The icons a set draws, in registry order. */
export function iconsInSet(set: CharacterSetId | CharacterSet | CharacterSetInput): BoardIconName[] {
  const s = resolveCharacterSet(set);
  return BOARD_ICON_NAMES.filter((name) => charsetHasIcon(s, name));
}

/** `chars` filtered to what the set draws, order kept. */
export function charsInSet(set: CharacterSetId | CharacterSet | CharacterSetInput, chars: readonly string[]): string[] {
  const s = resolveCharacterSet(set);
  return chars.filter((c) => charsetHasChar(s, c));
}

export interface CharsetDiff {
  addedChars: string[];
  removedChars: string[];
  addedIcons: BoardIconName[];
  removedIcons: BoardIconName[];
  /** Feature flags that differ: `[name, inSet, inBase]`. */
  features: Array<[keyof Pick<CharacterSet, "tiles" | "mixedCase" | "colorSpans" | "blockSpans">, boolean, boolean]>;
}

/** What `set` adds to and lacks against `base`. */
export function charsetDiff(
  set: CharacterSetId | CharacterSet | CharacterSetInput,
  base: CharacterSetId | CharacterSet | CharacterSetInput,
): CharsetDiff {
  const a = resolveCharacterSet(set);
  const b = resolveCharacterSet(base);
  const features: CharsetDiff["features"] = [];
  for (const f of ["tiles", "mixedCase", "colorSpans", "blockSpans"] as const) {
    if (a[f] !== b[f]) features.push([f, a[f], b[f]]);
  }
  return {
    addedChars: a.chars.filter((c) => !charsetHasChar(b, c)),
    removedChars: b.chars.filter((c) => !charsetHasChar(a, c)),
    addedIcons: BOARD_ICON_NAMES.filter((i) => charsetHasIcon(a, i) && !charsetHasIcon(b, i)),
    removedIcons: BOARD_ICON_NAMES.filter((i) => charsetHasIcon(b, i) && !charsetHasIcon(a, i)),
    features,
  };
}

/** The lineage of a set, root first. */
export function charsetLineage(set: CharacterSetId | CharacterSet | CharacterSetInput): CharacterSet[] {
  const chain: CharacterSet[] = [];
  let current: CharacterSet | undefined = resolveCharacterSet(set);
  while (current) {
    chain.unshift(current);
    current = current.extends && isCharacterSetId(current.extends) ? CHARACTER_SETS[current.extends] : undefined;
  }
  return chain;
}

/** Lowercase letters, for pickers that offer them when a set has mixed case. */
export const LOWERCASE_CHARS: readonly string[] = LOWERCASE;
