"use client";

/**
 * Variable Picker Content - Extensible variable list for toolbar dropdown
 * Automatically detects and renders nested arrays from plugin manifests.
 * Supports rich metadata (descriptions, previews, groups) when available.
 *
 * PORTING NOTE — the FiestaBoard version ran three react-query calls of its own
 * (`getTemplateVariables`, one `getPluginManifest` per enabled plugin, and a
 * polled `getDisplaysRawBatch`). This package does no data fetching: all three
 * arrive as already-resolved props with explicit `isLoading*` flags, so the app
 * keeps ownership of caching, retries and the 15s display poll. See
 * CONVENTIONS.md §3.
 */

import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { cn } from "../../lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../containment/accordion";
import { ScrollArea } from "../containment/scroll-area";
import { Badge } from "../feedback/badge";
import { Skeleton } from "../feedback/skeleton";
import { Input } from "../forms/input";
import { Box } from "../layout/box";
import { Flex } from "../layout/flex";
import { Stack } from "../layout/stack";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../overlays/tooltip";
import { Code } from "../typography/code";
import { Text } from "../typography/text";

// ── Data shapes ───────────────────────────────────────────────────────────────
//
// These mirror `@/lib/api` in the FiestaBoard app, narrowed to the fields this
// component actually reads. They are structural, so an app object typed by the
// full API interface satisfies them without a cast — and the app can check its
// own literals against them.

/** Rich per-variable metadata a plugin may publish alongside its variable list. */
export interface VariableMetadataEntry {
  description?: string;
  type?: "string" | "number" | "boolean";
  max_length?: number;
  group?: string;
  preview?: string;
  example?: string;
}

/** A named bucket that variables can be sorted into inside a category. */
export interface VariableGroup {
  label: string;
}

/** Response shape of the app's `getTemplateVariables`, narrowed to what is read. */
export interface TemplateVariables {
  /** Category (plugin id) → the variable names it exposes. */
  variables: Record<string, string[]>;
  /** Category → variable name → metadata. */
  variable_metadata?: Record<string, Record<string, VariableMetadataEntry>>;
  /** Category → group id → group definition. */
  variable_groups?: Record<string, Record<string, VariableGroup>>;
}

/** Schema for a keyed map nested inside an array item (e.g. a stop's lines). */
export interface PluginSubArraySchema {
  /**
   * `index` keys are positional and shown as-is; `dynamic` keys are looked up
   * through `key_field` on the item, so the template addresses them by value
   * (`lines.N.next_arrival`) rather than by position.
   */
  key_type?: "index" | "dynamic";
  key_field?: string;
  label_field?: string;
  item_fields: string[];
}

/** Schema for one indexed array a plugin exposes (e.g. `stops`). */
export interface PluginArraySchema {
  label_field?: string;
  item_fields: string[];
  sub_arrays?: Record<string, PluginSubArraySchema>;
}

/** Response shape of the app's `getPluginManifest`, narrowed to what is read. */
export interface PluginManifest {
  /** Lucide icon name in kebab or snake case, resolved via `resolveIcon`. */
  icon?: string;
  variables?: {
    arrays?: Record<string, PluginArraySchema>;
  };
}

/**
 * Raw plugin display payloads, keyed by plugin id: the `displays[id].data`
 * halves of the app's `getDisplaysRawBatch` response, already unwrapped.
 *
 * This is live plugin output, not a rendered board preview — it is what turns
 * a manifest's `stops` array schema into "Market & 3rd St, Powell Station".
 */
export type PluginDisplayData = Record<string, Record<string, unknown>>;

// ── Labels ────────────────────────────────────────────────────────────────────

export interface VariablePickerLabels {
  searchPlaceholder: string;
  noVariablesAvailable: string;
  noVariablesFound: (searchQuery: string) => string;
  itemInfo: string;
  general: string;
  indexLabel: (index: number) => string;
  configureHint: (arrayName: string) => string;
  configureExample: string;
  noMatchingVariables: string;
  /** Shown after an array's name when the plugin has nothing configured yet. */
  noneConfigured: string;
  /** Shown after an array's name when it does have items. */
  itemCount: (count: number) => string;
  /** Fallback name for an array item whose label field is empty. */
  itemFallbackLabel: (index: number) => string;
}

export const DEFAULT_VARIABLE_PICKER_LABELS: VariablePickerLabels = {
  searchPlaceholder: "Search variables...",
  noVariablesAvailable: "No variables available",
  noVariablesFound: (searchQuery) => `No variables found matching "${searchQuery}"`,
  itemInfo: "Item Info",
  general: "General",
  indexLabel: (index) => `Index: ${index}`,
  configureHint: (arrayName) => `Configure ${arrayName} in Settings to see indexed variables here.`,
  configureExample: "Example:",
  noMatchingVariables: "No matching variables found.",
  noneConfigured: "(None configured)",
  itemCount: (count) => `(${count})`,
  itemFallbackLabel: (index) => `Item ${index}`,
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface VariablePickerContentProps {
  /** Called with the full template token, e.g. `{{weather.temperature}}`. */
  onInsert: (variable: string) => void;
  /** Categories and their variables, already fetched by the app. */
  templateVariables?: TemplateVariables;
  isLoadingVariables?: boolean;
  /** Plugin id → manifest. Only categories with a manifest can show arrays. */
  pluginManifests?: Record<string, PluginManifest | undefined>;
  isLoadingManifests?: boolean;
  /**
   * Live plugin data used to enumerate array items. The app should refresh it
   * on an interval (the FiestaBoard app polls every 15s) — the picker only
   * reads it, and defers re-filtering on it so typing stays responsive.
   */
  pluginDisplayData?: PluginDisplayData;
  /**
   * Maps a manifest's icon name to an icon component. Omitted, no icons render.
   * The whole Lucide icon map is deliberately not imported here — this package
   * stays dependency-light, so the app supplies the set it already ships (see
   * `createLucideIconResolver`).
   */
  resolveIcon?: (iconName: string) => LucideIcon | null | undefined;
  maxHeight?: string;
  autoFocusSearch?: boolean;
  labels?: Partial<VariablePickerLabels>;
  /** Extra classes applied to the root div — use to override min-width in constrained layouts */
  className?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Stable identity so an omitted prop does not defeat `useDeferredValue`. */
const EMPTY_DISPLAY_DATA: PluginDisplayData = {};
const EMPTY_MANIFESTS: Record<string, PluginManifest | undefined> = {};

/**
 * Plugin display payloads arrive as untyped JSON, so array-valued fields have
 * to be narrowed before they can be indexed or measured. Returns undefined for
 * anything that is not an array, which every caller already treats as
 * "nothing configured".
 */
function asItemArray(value: unknown): Record<string, unknown>[] | undefined {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : undefined;
}

/** Same narrowing for a sub-array, which the schema models as a keyed map. */
function asItemMap(value: unknown): Record<string, Record<string, unknown>> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Record<string, unknown>>)
    : undefined;
}

/**
 * Builds a `resolveIcon` prop from a Lucide icon map (`import { icons } from
 * "lucide-react"`). Kept here because the kebab/snake → PascalCase mapping is
 * the contract plugin manifests are written against; only the icon set itself
 * belongs to the app.
 */
export function createLucideIconResolver(icons: Record<string, LucideIcon>): (iconName: string) => LucideIcon | null {
  return (iconName: string) => {
    if (!iconName) return null;
    const pascalName = iconName
      .split(/[-_]/)
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");
    return icons[pascalName] ?? null;
  };
}

function hasNestedArrays(manifest: PluginManifest | undefined): boolean {
  if (!manifest?.variables?.arrays) return false;
  return Object.keys(manifest.variables.arrays).length > 0;
}

function getArrayNames(manifest: PluginManifest | undefined): string[] {
  if (!manifest?.variables?.arrays) return [];
  return Object.keys(manifest.variables.arrays);
}

/**
 * The plugin ids whose manifests declare nested arrays — i.e. the only ones
 * whose live display data the picker can use. The app fetches display data for
 * exactly this set; exported so that scoping survives the move out of the
 * component (it used to be the `enabled` guard on the batch query).
 */
export function getPluginsWithNestedArrays(
  templateVariables: TemplateVariables | undefined,
  pluginManifests: Record<string, PluginManifest | undefined> | undefined,
): string[] {
  if (!templateVariables?.variables) return [];
  return Object.keys(templateVariables.variables).filter((pluginId) => hasNestedArrays(pluginManifests?.[pluginId]));
}

function matchesSearch(text: string, searchQuery: string): boolean {
  if (!searchQuery.trim()) return true;
  return text.toLowerCase().includes(searchQuery.toLowerCase());
}

function matchesVariablePath(category: string, variable: string, searchQuery: string): boolean {
  if (!searchQuery.trim()) return true;
  const q = searchQuery.toLowerCase();
  const c = category.toLowerCase();
  const v = variable.toLowerCase();
  return (
    c.includes(q) ||
    v.includes(q) ||
    `${c}.${v}`.includes(q) ||
    c.split(/[._-]/).some((w) => w.includes(q)) ||
    v.split(/[._-]/).some((w) => w.includes(q))
  );
}

function VariablePill({
  label,
  description,
  preview,
  onInsert,
}: {
  label: string;
  description?: string;
  preview?: string;
  onInsert: () => void;
}) {
  const pill = (
    <Badge variant="variable" asChild className="px-2.5 py-1 cursor-pointer hover:bg-tag-variable/25">
      <button type="button" onClick={onInsert}>
        {label}
        {preview && (
          <Text as="span" tone="muted" weight="normal" className="ml-1.5 text-[10px]">
            {preview.length > 12 ? preview.slice(0, 12) + "…" : preview}
          </Text>
        )}
      </button>
    </Badge>
  );

  if (description) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{pill}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          {description}
        </TooltipContent>
      </Tooltip>
    );
  }

  return pill;
}

function renderSubArraySection(
  pluginId: string,
  parentIndex: number,
  parentArrayName: string,
  subArrayName: string,
  subArrayData: Record<string, Record<string, unknown>> | undefined,
  manifest: PluginManifest | undefined,
  onInsert: (variable: string) => void,
  searchQuery: string,
  l: VariablePickerLabels,
  showAll: boolean = false,
  IconComp?: LucideIcon | null,
) {
  if (!subArrayData || Object.keys(subArrayData).length === 0) return null;

  const subArraySchema = manifest?.variables?.arrays?.[parentArrayName]?.sub_arrays?.[subArrayName];
  if (!subArraySchema) return null;

  const itemFields = subArraySchema.item_fields || [];
  const keyType = subArraySchema.key_type || "index";
  const keyField = subArraySchema.key_field;
  const labelField = subArraySchema.label_field;

  const getItemLabel = (itemData: Record<string, unknown>): string => {
    const raw = (labelField && itemData[labelField]) || (keyField && itemData[keyField]) || itemData[itemFields[0]];
    return raw == null || raw === "" ? "" : String(raw);
  };

  const filteredEntries = showAll
    ? Object.entries(subArrayData)
    : Object.entries(subArrayData).filter(([key, itemData]) => {
        if (!searchQuery.trim()) return true;
        const displayKey = keyType === "dynamic" && keyField ? String(itemData[keyField] ?? key) : key;
        const displayValue = getItemLabel(itemData) || displayKey;
        return (
          matchesSearch(subArrayName, searchQuery) ||
          matchesSearch(displayKey, searchQuery) ||
          matchesSearch(displayValue, searchQuery) ||
          itemFields.some((field: string) => matchesSearch(field, searchQuery))
        );
      });

  if (filteredEntries.length === 0) return null;

  return (
    <Box>
      <Text size="xs" tone="muted" className="mb-1.5 flex items-center gap-1">
        {IconComp && <IconComp className="h-3 w-3" />}
        {subArrayName.charAt(0).toUpperCase() + subArrayName.slice(1)} {l.itemCount(filteredEntries.length)}
      </Text>
      <Accordion type="single" collapsible className="w-full">
        {filteredEntries.map(([key, itemData]) => {
          const displayKey = keyType === "dynamic" && keyField ? String(itemData[keyField] ?? key) : key;
          const itemLabel = getItemLabel(itemData) || displayKey;
          const filteredFields = showAll
            ? itemFields
            : itemFields.filter((field: string) => !searchQuery.trim() || matchesSearch(field, searchQuery));

          if (filteredFields.length === 0) return null;

          return (
            <AccordionItem
              key={key}
              value={`${parentArrayName}-${parentIndex}-${subArrayName}-${key}`}
              className="border-b-0"
            >
              <AccordionTrigger className="py-1.5 hover:no-underline text-xs">
                <Flex align="center" gap="2">
                  {keyType === "dynamic" && (
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5">
                      {displayKey}
                    </Badge>
                  )}
                  <Text as="span" size="xs" className="text-left">
                    {itemLabel}
                  </Text>
                </Flex>
              </AccordionTrigger>
              <AccordionContent>
                <Stack gap="2" className="pt-2 pl-2">
                  <Flex wrap gap="1.5">
                    {filteredFields.map((field: string) => {
                      const varValue = `{{${pluginId}.${parentArrayName}.${parentIndex}.${subArrayName}.${key}.${field}}}`;
                      return <VariablePill key={field} label={field} onInsert={() => onInsert(varValue)} />;
                    })}
                  </Flex>
                  <Box className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                    <Code className="text-xs bg-transparent px-0">
                      {parentArrayName}.{parentIndex}.{subArrayName}.{key}.*
                    </Code>
                  </Box>
                </Stack>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </Box>
  );
}

function renderArraySection(
  pluginId: string,
  arrayName: string,
  arrayData: Record<string, unknown>[] | undefined,
  manifest: PluginManifest | undefined,
  onInsert: (variable: string) => void,
  searchQuery: string,
  l: VariablePickerLabels,
  showAll: boolean = false,
  IconComp?: LucideIcon | null,
) {
  if (!arrayData || arrayData.length === 0) {
    return (
      <Box className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
        <Text size="xs" tone="muted" className="mb-2">
          {l.configureHint(arrayName)}
        </Text>
        <Text tone="muted" className="font-mono text-[10px]">
          {l.configureExample} <Code className="bg-background px-1 text-[10px]">{arrayName}.0.*</Code>
        </Text>
      </Box>
    );
  }

  const arraySchema = manifest?.variables?.arrays?.[arrayName];
  if (!arraySchema) return null;

  const labelField = arraySchema.label_field || "name";
  const itemFields = arraySchema.item_fields || [];
  const subArrays = arraySchema.sub_arrays || {};

  const filteredArrayData = showAll
    ? arrayData.map((item, index) => ({ item, index }))
    : arrayData
        .map((item, index) => ({ item, index }))
        .filter(({ item, index }) => {
          if (!searchQuery.trim()) return true;
          const itemLabel = String(item[labelField] || item.name || l.itemFallbackLabel(index));
          return (
            matchesSearch(arrayName, searchQuery) ||
            matchesSearch(itemLabel, searchQuery) ||
            itemFields.some((field: string) => matchesSearch(field, searchQuery)) ||
            Object.keys(subArrays).some((subArrayName) => {
              const subArrayData = item[subArrayName] as Record<string, unknown> | undefined;
              if (!subArrayData) return false;
              return (
                matchesSearch(subArrayName, searchQuery) ||
                Object.keys(subArrayData).some((key) => matchesSearch(key, searchQuery))
              );
            })
          );
        });

  if (filteredArrayData.length === 0) {
    return (
      <Box className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
        <Text size="xs" tone="muted">
          {l.noMatchingVariables}
        </Text>
      </Box>
    );
  }

  return (
    <ScrollArea className="max-h-[400px] pr-1">
      <Accordion type="single" collapsible className="w-full">
        {filteredArrayData.map(({ item, index }) => {
          const itemLabel = String(item[labelField] || item.name || l.itemFallbackLabel(index));

          const filteredItemFields = showAll
            ? itemFields.filter((field: string) => !field.includes("."))
            : itemFields
                .filter((field: string) => !field.includes("."))
                .filter((field: string) => !searchQuery.trim() || matchesSearch(field, searchQuery));

          const filteredSubArrays = Object.entries(subArrays).filter(([subArrayName]) => {
            const subArrayData = item[subArrayName];
            if (!subArrayData) return false;
            if (showAll || !searchQuery.trim()) return true;
            return (
              matchesSearch(subArrayName, searchQuery) ||
              Object.keys(subArrayData).some((key) => matchesSearch(key, searchQuery))
            );
          });

          const hasMatchingContent = filteredItemFields.length > 0 || filteredSubArrays.length > 0;
          if (!hasMatchingContent) return null;

          return (
            <AccordionItem key={index} value={`${arrayName}-${index}`} className="border-b-0">
              <AccordionTrigger className="py-2 hover:no-underline">
                <Flex align="center" gap="2" className="text-xs">
                  {IconComp && <IconComp className="h-3 w-3" />}
                  <Box className="text-left">
                    <Text size="xs" weight="medium">
                      {itemLabel}
                    </Text>
                    <Text size="xs" tone="muted">
                      {l.indexLabel(index)}
                    </Text>
                  </Box>
                </Flex>
              </AccordionTrigger>
              <AccordionContent>
                <Stack gap="3" className="pt-2 pl-2">
                  {filteredItemFields.length > 0 && (
                    <Box>
                      <Text size="xs" tone="muted" className="mb-1.5">
                        {l.itemInfo}
                      </Text>
                      <Flex wrap gap="1.5">
                        {filteredItemFields.map((field: string) => {
                          const varValue = `{{${pluginId}.${arrayName}.${index}.${field}}}`;
                          return <VariablePill key={field} label={field} onInsert={() => onInsert(varValue)} />;
                        })}
                      </Flex>
                    </Box>
                  )}

                  {filteredSubArrays.map(([subArrayName]) => {
                    const subArrayData = asItemMap(item[subArrayName]);
                    if (!subArrayData) return null;
                    return (
                      <Box key={subArrayName}>
                        {renderSubArraySection(
                          pluginId,
                          index,
                          arrayName,
                          subArrayName,
                          subArrayData,
                          manifest,
                          onInsert,
                          searchQuery,
                          l,
                          showAll,
                          IconComp,
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </ScrollArea>
  );
}

export function VariablePickerContent({
  onInsert,
  templateVariables,
  isLoadingVariables = false,
  pluginManifests = EMPTY_MANIFESTS,
  isLoadingManifests = false,
  pluginDisplayData = EMPTY_DISPLAY_DATA,
  resolveIcon,
  maxHeight = "400px",
  autoFocusSearch = true,
  labels,
  className,
}: VariablePickerContentProps) {
  const l = { ...DEFAULT_VARIABLE_PICKER_LABELS, ...labels };
  const [searchQuery, setSearchQuery] = useState("");

  /**
   * Filtering walks every array item of every plugin, so it is the expensive
   * half of a keystroke. Deferring both the (polled) display data and the query
   * keeps the `<Input>` responsive: the field itself binds to `searchQuery` so
   * it never lags, while the full nested filter reads `deferredQuery` and React
   * can interrupt a stale pass when the user keeps typing.
   */
  const deferredPluginData = useDeferredValue(pluginDisplayData);
  const deferredQuery = useDeferredValue(searchQuery);

  // Extract metadata and groups from the template variables response
  const variableMetadata = templateVariables?.variable_metadata ?? {};
  const variableGroups = templateVariables?.variable_groups ?? {};

  if (isLoadingVariables || isLoadingManifests) {
    return (
      <Box className="p-3 min-w-[300px]">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </Box>
    );
  }

  if (!templateVariables?.variables) {
    return (
      <Text tone="muted" className="p-3 min-w-[300px]">
        {l.noVariablesAvailable}
      </Text>
    );
  }

  const categories = Object.entries(templateVariables.variables);

  const filteredCategories = categories.filter(([category, vars]) => {
    if (!deferredQuery.trim()) return true;

    const q = deferredQuery.toLowerCase();
    const cLower = category.toLowerCase();

    if (
      matchesSearch(category, deferredQuery) ||
      cLower
        .replace(/_/g, " ")
        .split(/\s+/)
        .some((w) => w.includes(q))
    ) {
      return true;
    }

    const manifest = pluginManifests[category];
    const arrayNames = getArrayNames(manifest);
    const simpleVars = vars.filter((v) => !v.includes(".") || !v.includes(".*."));
    const generalVars =
      arrayNames.length > 0 ? simpleVars.filter((v) => !arrayNames.some((a) => v.startsWith(a + "."))) : simpleVars;

    if (generalVars.some((v) => matchesVariablePath(category, v, deferredQuery))) return true;
    if (arrayNames.some((a) => matchesSearch(a, deferredQuery))) return true;

    for (const arrayName of arrayNames) {
      const arrayData = asItemArray(deferredPluginData[category]?.[arrayName]);
      if (arrayData && arrayData.length > 0) {
        const arraySchema = manifest?.variables?.arrays?.[arrayName];
        if (arraySchema) {
          const hasMatch = arrayData.some((item) => {
            const itemLabel = String(item[arraySchema.label_field || "name"] || "");
            return (
              matchesSearch(itemLabel, deferredQuery) ||
              arraySchema.item_fields.some((f: string) => matchesSearch(f, deferredQuery))
            );
          });
          if (hasMatch) return true;
        }
      }
    }

    return false;
  });

  return (
    <TooltipProvider delayDuration={300}>
      <Flex direction="col" className={cn("w-full min-w-[min(340px,calc(100vw-24px))]", className)}>
        <Box className="p-2 border-b">
          <Box className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              // The picker only mounts inside a dropdown the user just opened, where
              // moving focus to the filter is the expected behaviour rather than a
              // focus steal. `autoFocusSearch={false}` opts out for inline hosts.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus={autoFocusSearch}
              type="text"
              placeholder={l.searchPlaceholder}
              aria-label={l.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </Box>
        </Box>

        <ScrollArea className="flex-1" style={{ height: maxHeight }}>
          <Stack gap="3" className="p-2">
            {filteredCategories.length === 0 ? (
              <Text tone="muted" className="p-3 text-center">
                {l.noVariablesFound(deferredQuery)}
              </Text>
            ) : (
              filteredCategories.map(([category, vars]) => {
                const manifest = pluginManifests[category];
                const arrayNames = getArrayNames(manifest);
                const pluginMeta = variableMetadata[category] ?? {};
                const pluginGroups = variableGroups[category] ?? {};
                const hasGroups = Object.keys(pluginGroups).length > 0;

                const IconComp = (manifest?.icon ? resolveIcon?.(manifest.icon) : null) ?? null;

                const simpleVars = vars.filter((v) => !v.includes(".*."));
                const generalVars =
                  arrayNames.length > 0
                    ? simpleVars.filter((v) => !arrayNames.some((a) => v === a || v.startsWith(a + ".")))
                    : simpleVars;

                const categoryMatches =
                  deferredQuery.trim() &&
                  (matchesSearch(category, deferredQuery) ||
                    category
                      .toLowerCase()
                      .replace(/_/g, " ")
                      .split(/\s+/)
                      .some((w) => w.includes(deferredQuery.toLowerCase())));

                const filteredGeneralVars = categoryMatches
                  ? generalVars
                  : generalVars.filter((v) => !deferredQuery.trim() || matchesVariablePath(category, v, deferredQuery));

                const hasArrayMatches =
                  arrayNames.length > 0 &&
                  arrayNames.some((arrayName) => {
                    if (!deferredQuery.trim() || categoryMatches) return true;
                    if (matchesSearch(arrayName, deferredQuery)) return true;
                    const arrayData = asItemArray(deferredPluginData[category]?.[arrayName]);
                    if (!arrayData || arrayData.length === 0) return false;
                    const arraySchema = manifest?.variables?.arrays?.[arrayName];
                    if (!arraySchema) return false;
                    return arrayData.some((item) => {
                      const label = String(item[arraySchema.label_field || "name"] || "");
                      return (
                        matchesSearch(label, deferredQuery) ||
                        arraySchema.item_fields.some((f: string) => matchesSearch(f, deferredQuery))
                      );
                    });
                  });

                if (filteredGeneralVars.length === 0 && !hasArrayMatches) return null;

                // Group simple variables by their group field (from metadata)
                const groupedVars: Record<string, string[]> = {};
                if (hasGroups) {
                  for (const v of filteredGeneralVars) {
                    const group = pluginMeta[v]?.group || "";
                    const key = group && pluginGroups[group] ? group : "__ungrouped__";
                    (groupedVars[key] ??= []).push(v);
                  }
                }

                const renderVarPill = (variable: string) => {
                  const meta = pluginMeta[variable];
                  const varValue = `{{${category}.${variable}}}`;
                  return (
                    <VariablePill
                      key={variable}
                      label={variable}
                      description={meta?.description}
                      preview={meta?.preview}
                      onInsert={() => onInsert(varValue)}
                    />
                  );
                };

                return (
                  <Stack key={category} gap="1.5">
                    <Flex align="center" gap="2" className="bg-muted/30 rounded-md px-2 py-1.5 -mx-1">
                      {IconComp && <IconComp className="h-3 w-3 text-muted-foreground" />}
                      <Text as="span" size="xs" weight="semibold">
                        {category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Text>
                    </Flex>

                    {/* Grouped variables */}
                    {hasGroups ? (
                      <>
                        {Object.entries(pluginGroups).map(([groupId, groupDef]) => {
                          const groupVars = groupedVars[groupId];
                          if (!groupVars || groupVars.length === 0) return null;
                          return (
                            <Box key={groupId}>
                              <Text className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1 mb-1 pb-0.5 border-b border-border/30">
                                {groupDef.label}
                              </Text>
                              <Flex wrap gap="1.5">
                                {groupVars.map(renderVarPill)}
                              </Flex>
                            </Box>
                          );
                        })}
                        {groupedVars["__ungrouped__"] && groupedVars["__ungrouped__"].length > 0 && (
                          <Box>
                            <Text className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1 mb-1 pb-0.5 border-b border-border/30">
                              {l.general}
                            </Text>
                            <Flex wrap gap="1.5">
                              {groupedVars["__ungrouped__"].map(renderVarPill)}
                            </Flex>
                          </Box>
                        )}
                      </>
                    ) : (
                      filteredGeneralVars.length > 0 && (
                        <Box>
                          <Text className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1 mb-1 pb-0.5 border-b border-border/30">
                            {l.general}
                          </Text>
                          <Flex wrap gap="1.5">
                            {filteredGeneralVars.map(renderVarPill)}
                          </Flex>
                        </Box>
                      )
                    )}

                    {/* Array Sections -- iterate all arrays */}
                    {arrayNames.map((arrayName) => {
                      const arrayData = asItemArray(deferredPluginData[category]?.[arrayName]);
                      const shouldShow =
                        !deferredQuery.trim() ||
                        categoryMatches ||
                        matchesSearch(arrayName, deferredQuery) ||
                        (arrayData && arrayData.length > 0);
                      if (!shouldShow) return null;

                      return (
                        <Stack key={arrayName} gap="1.5">
                          <Text size="xs" tone="muted" className="flex items-center gap-1">
                            {IconComp && <IconComp className="h-3 w-3" />}
                            {arrayName.charAt(0).toUpperCase() + arrayName.slice(1)}{" "}
                            {arrayData ? l.itemCount(arrayData.length) : l.noneConfigured}
                          </Text>
                          {renderArraySection(
                            category,
                            arrayName,
                            arrayData,
                            manifest,
                            onInsert,
                            deferredQuery,
                            l,
                            !!categoryMatches,
                            IconComp,
                          )}
                        </Stack>
                      );
                    })}
                  </Stack>
                );
              })
            )}
          </Stack>
        </ScrollArea>
      </Flex>
    </TooltipProvider>
  );
}
