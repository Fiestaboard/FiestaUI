"use client";

/**
 * CharacterSetSpecimen — what a character set contains.
 *
 * A specimen sheet for one set (../../lib/character-sets): every character,
 * the colour tiles, every icon, a plugin's added characters, and the
 * features (mixed case, colour spans, block spans, which flap code 62
 * draws). With `compareTo` it marks what the set adds over another set and
 * lists what it lacks, so a docs page can show "LED 3×5 against LED 5×7", a
 * device picker can show what a board gives up, and the editor can explain
 * a warning.
 *
 * Every glyph is a `CharacterGlyph`: LED sets draw dots from their face (a
 * plugin set's own bitmaps included), split-flap sets draw tiles. Each cell
 * is a list item that names itself, so a screen reader gets "capital A,
 * lowercase a, sun icon" rather than ninety images.
 *
 * Sets are open data: `charset` and `compareTo` take a built-in id or a set
 * object (a plugin's). An unknown id throws, like `resolveCharacterSet`.
 */

import { memo } from "react";

import { BOARD_ICONS, type BoardIconName } from "../../lib/board-icons";
import {
  type CharacterSet,
  type CharacterSetId,
  charsetDiff,
  charsetHasChar,
  charsetLineage,
  iconsInSet,
  resolveCharacterSet,
} from "../../lib/character-sets";
import type { LedFontId } from "../../lib/led-fonts";
import { cn } from "../../lib/utils";
import { CharacterGlyph, type CharacterGlyphLabels, characterGlyphName } from "./character-glyph";

export interface CharacterSetSpecimenLabels {
  letters: string;
  digits: string;
  punctuation: string;
  /** Characters a set adds beyond the board alphabet (a plugin's own). */
  extra: string;
  tiles: string;
  icons: string;
  features: string;
  mixedCase: string;
  upperOnly: string;
  colorSpans: string;
  blockSpans: string;
  tilesFeature: string;
  code62: (glyph: "degree" | "heart" | "either") => string;
  /** Caption for the "added versus" marker. */
  adds: (base: string) => string;
  lacks: (base: string) => string;
  lineage: string;
  /** "{n} characters" for the adds line. */
  characters: (n: number) => string;
  iconsCount: (n: number) => string;
}

export const DEFAULT_CHARACTER_SET_SPECIMEN_LABELS: CharacterSetSpecimenLabels = {
  letters: "Letters",
  digits: "Digits",
  punctuation: "Punctuation",
  extra: "Added characters",
  tiles: "Colour tiles",
  icons: "Icons",
  features: "Features",
  mixedCase: "Mixed case",
  upperOnly: "Uppercase only",
  colorSpans: "Colour spans {red:TEXT}",
  blockSpans: "Block spans {black/white:TEXT}",
  tilesFeature: "Colour tiles",
  code62: (glyph) => (glyph === "either" ? "Code 62: ° or ♥" : glyph === "heart" ? "Code 62: ♥" : "Code 62: °"),
  adds: (base) => `Adds over ${base}`,
  lacks: (base) => `Lacks from ${base}`,
  lineage: "Lineage",
  characters: (n) => `${n} ${n === 1 ? "character" : "characters"}`,
  iconsCount: (n) => `${n} ${n === 1 ? "icon" : "icons"}`,
};

export interface CharacterSetSpecimenProps {
  /** The set to show: a built-in id or a set object (a plugin's). */
  charset: CharacterSetId | CharacterSet;
  /** Mark what `charset` adds over this set, and list what it lacks. */
  compareTo?: CharacterSetId | CharacterSet;
  /** Face to draw an LED set's glyphs in. Defaults to the set's own. */
  font?: LedFontId;
  size?: "sm" | "md";
  /** Labels for the glyph names (passed to each `CharacterGlyph`). */
  glyphLabels?: Partial<CharacterGlyphLabels>;
  labels?: Partial<CharacterSetSpecimenLabels>;
  className?: string;
}

const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const LOWER = [..."abcdefghijklmnopqrstuvwxyz"];
const DIGITS = [..."0123456789"];
const PUNCT = [..."!@#$()-+&=;:'\"%,./?°♥"];
const BOARD_ALPHABET = new Set([...LETTERS, ...LOWER, ...DIGITS, ...PUNCT]);
const TILE_CODES = ["63", "64", "65", "66", "67", "68", "69", "70"] as const;

type Feature = "tiles" | "mixedCase" | "colorSpans" | "blockSpans";
/** Feature flag → the label it is shown as (never the raw key). */
const FEATURE_LABEL: Record<Feature, keyof CharacterSetSpecimenLabels> = {
  tiles: "tilesFeature",
  mixedCase: "mixedCase",
  colorSpans: "colorSpans",
  blockSpans: "blockSpans",
};

interface GlyphItem {
  key: string;
  token: string;
  name: string;
}

export const CharacterSetSpecimen = memo(function CharacterSetSpecimen({
  charset,
  compareTo,
  font,
  size = "md",
  glyphLabels,
  labels,
  className,
}: CharacterSetSpecimenProps) {
  const l = { ...DEFAULT_CHARACTER_SET_SPECIMEN_LABELS, ...labels };
  const set = resolveCharacterSet(charset);
  // A `font` override draws the same set in another face.
  const drawn: CharacterSet = font && set.font && font !== set.font ? { ...set, font } : set;
  const base = compareTo ? resolveCharacterSet(compareTo) : null;
  const diff = base ? charsetDiff(set, base) : null;
  const added = new Set<string>([...(diff?.addedChars ?? []), ...(diff?.addedIcons ?? [])]);
  const glyphSize = size === "sm" ? "sm" : "md";
  const cellClass = cn(
    "flex items-center justify-center rounded-md border",
    size === "sm" ? "min-w-7 p-0.5" : "min-w-9 p-1",
  );
  const featureLabel = (f: Feature) => String(l[FEATURE_LABEL[f]]);

  /** A list of glyphs: each item names itself for assistive tech; the drawing is decorative. */
  const glyphList = (key: string, title: string, items: GlyphItem[]) =>
    items.length > 0 ? (
      <div className="flex flex-col gap-1.5" data-section={key}>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
        <ul className="flex flex-wrap gap-1" aria-label={title}>
          {items.map((item) => (
            <li
              key={item.key}
              data-added={added.has(item.key) ? "" : undefined}
              className={cn(cellClass, added.has(item.key) && "ring-2 ring-board-green")}
            >
              <span className="sr-only">{item.name}</span>
              <CharacterGlyph token={item.token} charset={drawn} size={glyphSize} decorative labels={glyphLabels} />
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const charItems = (chars: readonly string[]): GlyphItem[] =>
    chars
      .filter((c) => charsetHasChar(set, c))
      .map((c) => ({ key: c, token: c, name: characterGlyphName({ type: "char", value: c }, glyphLabels) }));
  const icons = iconsInSet(set);
  const lineage = charsetLineage(set);
  // What code 62 draws: fixed by the set, or either glyph when it carries
  // both. A set with neither (a plain sign) has no code-62 flap to describe.
  const hasDegree = charsetHasChar(set, "°");
  const hasHeart = charsetHasChar(set, "♥");
  const code62 =
    set.code62Glyph ?? (hasDegree && hasHeart ? "either" : hasHeart ? "heart" : hasDegree ? "degree" : null);
  const addedIcons = diff?.addedIcons.length ?? 0;
  const lacks = diff
    ? [
        ...diff.removedChars.map((c) => characterGlyphName({ type: "char", value: c }, glyphLabels)),
        ...diff.removedIcons.map((i) => BOARD_ICONS[i].label),
        ...diff.features.filter(([, inSet]) => !inSet).map(([f]) => featureLabel(f)),
      ]
    : [];

  return (
    <div
      data-slot="character-set-specimen"
      data-charset={set.id}
      className={cn("flex flex-col gap-4 rounded-lg border p-4", className)}
      aria-label={set.label}
      role="group"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">{set.label}</span>
        <span className="text-xs text-muted-foreground">
          {l.lineage}: {lineage.map((s) => `${s.id} v${s.version}`).join(" → ")}
        </span>
      </div>
      {glyphList("letters", l.letters, [...charItems(LETTERS), ...charItems(LOWER)])}
      {glyphList("digits", l.digits, charItems(DIGITS))}
      {glyphList("punctuation", l.punctuation, charItems(PUNCT))}
      {glyphList("extra", l.extra, charItems(set.chars.filter((c) => !BOARD_ALPHABET.has(c))))}
      {set.tiles &&
        glyphList(
          "tiles",
          l.tiles,
          TILE_CODES.map((code) => ({
            key: `tile-${code}`,
            token: `{${code}}`,
            name: characterGlyphName({ type: "color", code }, glyphLabels),
          })),
        )}
      {icons.length > 0 &&
        glyphList(
          "icons",
          l.icons,
          icons.map((name: BoardIconName) => ({
            key: name,
            token: `{icon:${name}}`,
            name: characterGlyphName({ type: "char", value: " ", icon: name }, glyphLabels),
          })),
        )}
      <div className="flex flex-col gap-1.5" data-section="features">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{l.features}</span>
        <ul className="flex flex-wrap gap-1 text-xs" aria-label={l.features}>
          <li className="rounded-full border px-2 py-0.5">{set.mixedCase ? l.mixedCase : l.upperOnly}</li>
          {code62 !== null && <li className="rounded-full border px-2 py-0.5">{l.code62(code62)}</li>}
          {set.colorSpans && <li className="rounded-full border px-2 py-0.5">{l.colorSpans}</li>}
          {set.blockSpans && <li className="rounded-full border px-2 py-0.5">{l.blockSpans}</li>}
        </ul>
      </div>
      {diff && base && (
        <div className="flex flex-col gap-2 border-t pt-3 text-xs" data-section="diff">
          {added.size > 0 && (
            <p>
              <span
                className="mr-1 inline-block h-3 w-3 rounded-sm ring-2 ring-board-green align-middle"
                aria-hidden="true"
              />
              {l.adds(base.label)}: {l.characters(diff.addedChars.length)}
              {addedIcons > 0 && `, ${l.iconsCount(addedIcons)}`}
              {diff.features
                .filter(([, inSet]) => inSet)
                .map(([f]) => `, ${featureLabel(f)}`)
                .join("")}
            </p>
          )}
          {lacks.length > 0 && (
            <p className="text-muted-foreground">
              {l.lacks(base.label)}: {lacks.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
});
