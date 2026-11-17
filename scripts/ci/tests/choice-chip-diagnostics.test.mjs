import assert from "node:assert/strict";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

import { readChoiceChipRenderingFlags } from "../../../.storybook/choice-chip-regression.ts";

const unsupported =
  "cdpSession.send: Protocol error (Browser.getBrowserCommandLine): Command line not returned because --enable-automation not set.";

for (const realm of ["current", "other"]) {
  test(`the optional command-line diagnostic tolerates the known ${realm}-realm CDP error`, async () => {
    const error =
      realm === "current" ? new Error(unsupported) : runInNewContext("new Error(message)", { message: unsupported });
    if (realm === "other") assert.equal(error instanceof Error, false);
    const flags = await readChoiceChipRenderingFlags({
      send: async () => {
        throw error;
      },
    });
    assert.equal(flags, "unavailable: --enable-automation not set");
  });
}

for (const message of ["Target closed", "Unrelated failure: --enable-automation not set"]) {
  for (const realm of ["current", "other"]) {
    test(`unexpected ${realm}-realm CDP failure is rethrown unchanged: ${message}`, async () => {
      const error = realm === "current" ? new Error(message) : runInNewContext("new Error(message)", { message });
      await assert.rejects(
        readChoiceChipRenderingFlags({
          send: async () => {
            throw error;
          },
        }),
        (actual) => actual === error,
      );
    });
  }
}

test("non-Error rejection is not mistaken for an unsupported CDP capability", async () => {
  const error = { message: unsupported };
  await assert.rejects(
    readChoiceChipRenderingFlags({
      send: async () => {
        throw error;
      },
    }),
    (actual) => actual === error,
  );
});

test("successful diagnostics expose only rendering flags", async () => {
  const flags = await readChoiceChipRenderingFlags({
    send: async () => ({
      arguments: [
        "--headless",
        "--font-render-hinting=full",
        "--user-data-dir=/private/profile",
        "--unrelated=example",
      ],
    }),
  });
  assert.deepEqual(flags, ["--headless", "--font-render-hinting=full"]);
});
