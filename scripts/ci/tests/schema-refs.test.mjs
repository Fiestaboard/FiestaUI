// JSON Schema reference integrity for the published device contract.
//
// FiestaBoard's output plugins validate `device_models` / `character_set`
// against these schemas with python-jsonschema (`referencing`, Draft 7), which
// resolves every `$ref` against the referring schema's `$id` per RFC 3986 —
// not against the file it was loaded from. The schemas once shipped with
// `$id: …/character-set.json` while device-model's `$ref` said
// `character-set.schema.json`: a validator that registers schemas by filename
// accepted it, a standards-compliant one failed with "Unresolvable". This
// resolves every `$ref` the way the standard does and requires it to land on a
// schema we ship, and requires each `$id` to end in the file's own name so ids
// and filenames cannot drift apart again.

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const schemas = readdirSync(fixtures)
  .filter((name) => name.endsWith(".schema.json"))
  .map((name) => ({ name, json: JSON.parse(readFileSync(path.join(fixtures, name), "utf8")) }));

/** Every `$ref` string in a schema, with its JSON path for the failure message. */
function refs(node, at = "#") {
  if (node === null || typeof node !== "object") return [];
  const found = typeof node.$ref === "string" ? [{ ref: node.$ref, at }] : [];
  for (const [key, value] of Object.entries(node)) found.push(...refs(value, `${at}/${key}`));
  return found;
}

test("there are schemas to check", () => {
  assert.ok(schemas.length >= 2, "expected the device-model and character-set schemas");
});

for (const { name, json } of schemas) {
  test(`${name}: $id names this file`, () => {
    assert.equal(typeof json.$id, "string", `${name} has no $id`);
    assert.ok(json.$id.endsWith(`/${name}`), `${name}'s $id ${json.$id} must end in /${name}`);
  });

  test(`${name}: every $ref resolves to a shipped schema`, () => {
    const ids = new Set(schemas.map((s) => s.json.$id));
    for (const { ref, at } of refs(json)) {
      const [target] = new URL(ref, json.$id).href.split("#");
      // A same-document ref ("#/definitions/…") resolves to this schema's own id.
      assert.ok(
        ids.has(target),
        `${name} ${at}: $ref "${ref}" resolves to ${target}, which no shipped schema declares`,
      );
    }
  });
}
