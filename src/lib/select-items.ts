/**
 * Content-key stabilization for the items collected from Select children
 * (issue #62). `children` is a freshly-built element tree on every parent
 * render, so memoizing on its identity never holds; these helpers derive a
 * structural signature instead, letting `Select` reuse the previous items
 * array whenever the logical option set is unchanged.
 *
 * Deliberately React-free (labels are treated as plain element-shaped
 * objects) so it can be unit-tested under `node --test`.
 */

export type SelectItemRecord = { value: unknown; label: unknown };

export type StableSelectItems<T extends SelectItemRecord = SelectItemRecord> = { key: string; items: T[] };

type ElementLike = { type?: unknown; props?: { children?: unknown } };

// Separators outside any label text so keys can't collide across fields.
const ITEM_SEP = "\u0000";
const FIELD_SEP = "\u0001";
const NODE_SEP = "\u0002";

function appendNodeKey(node: unknown, out: string[]): void {
  if (node == null || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) appendNodeKey(child, out);
    return;
  }
  if (typeof node === "object") {
    // React element (or portal/fragment): record its type plus its subtree's
    // text so a label whose element type or text changes produces a new key.
    const el = node as ElementLike;
    const type = el.type;
    out.push(typeof type === "string" ? type : typeof type === "function" ? `fn:${type.name}` : "#");
    out.push(NODE_SEP);
    appendNodeKey(el.props?.children, out);
  }
}

/**
 * Derive a stable string signature for a collected item list: two
 * structurally-equal option sets yield the same key even when every array,
 * object, and label element has a fresh identity.
 */
export function selectItemsContentKey(items: ReadonlyArray<SelectItemRecord>): string {
  const parts: string[] = [];
  for (const item of items) {
    const labelParts: string[] = [];
    appendNodeKey(item.label, labelParts);
    parts.push(`${String(item.value)}${FIELD_SEP}${labelParts.join("")}`);
  }
  return parts.join(ITEM_SEP);
}

/**
 * Return `prev` unchanged when `next` has the same content key — preserving
 * the previous items array reference — otherwise a new state adopting `next`.
 */
export function stabilizeSelectItems<T extends SelectItemRecord>(
  prev: StableSelectItems<T> | null,
  next: T[],
): StableSelectItems<T> {
  const key = selectItemsContentKey(next);
  if (prev !== null && prev.key === key) return prev;
  return { key, items: next };
}
