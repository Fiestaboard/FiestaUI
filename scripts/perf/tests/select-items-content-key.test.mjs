import assert from "node:assert/strict";
import { test } from "node:test";

// Node >= 22.18 strips types natively, so the pure helper can be imported
// straight from src. Keep this module free of React/JSX so it stays
// unit-testable here (issue #62).
import { selectItemsContentKey, stabilizeSelectItems } from "../../../src/lib/select-items.ts";

// Mimics what `collectSelectItems` produces at real call sites: labels are
// freshly-created React elements (new object identity every parent render).
const elementLike = (type, children) => ({ type, props: { children } });

const freshItems = () => [
  { value: "en", label: "English" },
  { value: "es", label: elementLike("span", ["Espa", "ñol"]) },
];

test("structurally-equal item lists produce the same content key", () => {
  // Two separately-constructed lists — fresh array, object, and label
  // identities — must yield an identical key, otherwise a parent re-render
  // (which always rebuilds `children`) can never hit the memo.
  assert.equal(selectItemsContentKey(freshItems()), selectItemsContentKey(freshItems()));
});

test("changing a value or a label changes the content key", () => {
  const base = selectItemsContentKey(freshItems());
  const valueChanged = freshItems();
  valueChanged[0].value = "en-GB";
  const labelChanged = freshItems();
  labelChanged[0].label = "British English";
  const nestedLabelChanged = freshItems();
  nestedLabelChanged[1].label = elementLike("span", ["Espa", "nol"]);
  assert.notEqual(selectItemsContentKey(valueChanged), base);
  assert.notEqual(selectItemsContentKey(labelChanged), base);
  assert.notEqual(selectItemsContentKey(nestedLabelChanged), base);
});

test("item order and count are part of the content key", () => {
  const base = selectItemsContentKey(freshItems());
  assert.notEqual(selectItemsContentKey(freshItems().reverse()), base);
  assert.notEqual(selectItemsContentKey(freshItems().slice(0, 1)), base);
  assert.equal(selectItemsContentKey([]), selectItemsContentKey([]));
});

test("stabilizeSelectItems keeps the previous array when content is unchanged", () => {
  const first = stabilizeSelectItems(null, freshItems());
  // Re-render with structurally-identical (but referentially fresh) items:
  // the previous state — and therefore the previous items array reference —
  // must be returned so the context value and Base UI's `items` prop stay
  // referentially stable.
  const second = stabilizeSelectItems(first, freshItems());
  assert.equal(second, first);
  assert.equal(second.items, first.items);
});

test("stabilizeSelectItems adopts the new array when content changes", () => {
  const first = stabilizeSelectItems(null, freshItems());
  const changed = freshItems();
  changed.push({ value: "fr", label: "Français" });
  const second = stabilizeSelectItems(first, changed);
  assert.notEqual(second, first);
  assert.equal(second.items, changed);
  // And it re-stabilizes on the new content afterwards.
  const third = stabilizeSelectItems(
    second,
    second.items.map((item) => ({ ...item })),
  );
  assert.equal(third, second);
});
