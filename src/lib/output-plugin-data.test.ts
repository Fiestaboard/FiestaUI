import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import Ajv from "ajv";
import { describe, expect, it } from "vitest";

import { type CharacterSet, materializeCharacterSet, validateCharacterSet } from "./character-sets";
import {
  characterSetForModel,
  DEVICE_MODEL_IDS,
  DEVICE_MODELS,
  type DeviceModel,
  type DeviceModelId,
  ledSpecForModel,
  resolveDeviceModel,
  validateDeviceModel,
} from "./devices";
import { defaultTransitionIdForModel, transitionsForModel } from "./led-transition-registry";

/*
 * The output plugins' device data, as published (spec §6.1).
 *
 * FiestaBoard's output plugins declare their devices in
 * `output/device-models.json` (and a set of their own, if they have one,
 * in `output/character-set.json`), and FiestaUI owns the contract those
 * files are written to: the two JSON Schemas and the TS validators. Each
 * plugin is a devDependency here, pinned to a commit or a tag, so the data
 * a plugin has actually published is checked against the schemas as they
 * are NOW — a schema change that would break a published plugin fails this
 * file before it is released, instead of in the plugin's CI after.
 *
 * Discovery is by name: every devDependency matching `@fiestaboard/output-*`
 * is a plugin. Adding one to package.json is all it takes to put it under
 * contract; nothing here lists them.
 */

const ROOT = resolve(__dirname, "../..");
const require = createRequire(import.meta.url);
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
const fixture = (name: string) => readJson(resolve(ROOT, "scripts/ci/tests/fixtures", name)) as Record<string, any>;

const deviceSchema = fixture("device-model.schema.json");
const charsetSchema = fixture("character-set.schema.json");
const ajv = new Ajv({ strict: true, allErrors: true });
ajv.addSchema(charsetSchema);
ajv.addSchema(deviceSchema);
const validDevice = ajv.getSchema(deviceSchema.$id)!;
const validCharset = ajv.getSchema(charsetSchema.$id)!;
const schemaErrors = (v: typeof validDevice) =>
  (v.errors ?? []).map((e) => `${e.instancePath} ${e.message}`).join("; ");

interface OutputPlugin {
  /** The package name, `@fiestaboard/output-<device>`. */
  name: string;
  /** The devDependency spec in package.json. */
  spec: string;
  /** The commit or tag the spec pins. */
  pin: string;
  /** Where npm put it. */
  dir: string;
  models: unknown[];
  /** `output/character-set.json`, when the plugin ships one. */
  charset: unknown | undefined;
}

const PLUGIN_NAME = /^@fiestaboard\/output-/;
const PLUGIN_SPEC = /^github:Fiestaboard\/fiestaboard-output--[a-z0-9-]+#(?<pin>[0-9a-f]{40}|v\d+\.\d+\.\d+)$/;

function discoverPlugins(): OutputPlugin[] {
  const pkg = readJson(resolve(ROOT, "package.json")) as { devDependencies?: Record<string, string> };
  return Object.entries(pkg.devDependencies ?? {})
    .filter(([name]) => PLUGIN_NAME.test(name))
    .map(([name, spec]) => {
      const dir = dirname(require.resolve(`${name}/package.json`));
      const modelsPath = resolve(dir, "output/device-models.json");
      const charsetPath = resolve(dir, "output/character-set.json");
      const models = existsSync(modelsPath) ? readJson(modelsPath) : undefined;
      return {
        name,
        spec,
        pin: PLUGIN_SPEC.exec(spec)?.groups?.pin ?? "",
        dir,
        models: Array.isArray(models) ? models : [],
        charset: existsSync(charsetPath) ? readJson(charsetPath) : undefined,
      };
    });
}

const PLUGINS = discoverPlugins();
const id = (m: unknown) => (m as { id?: unknown })?.id;

/** A model's rendering contract: everything but the research prose. */
function renderingFacts(model: DeviceModel) {
  const { notes: _notes, sources: _sources, ...animation } = model.animation;
  return { ...model, animation };
}

describe("the output-plugin devDependencies", () => {
  it("include the Pixoo, each pinned to a commit or a tag of its public repo", () => {
    expect(PLUGINS.map((p) => p.name)).toContain("@fiestaboard/output-divoom-pixoo");
    for (const p of PLUGINS) {
      expect(p.spec, `${p.name}: ${p.spec}`).toMatch(PLUGIN_SPEC);
      expect(p.pin).not.toBe("");
    }
  });

  it("are pinned in package-lock.json to the same commit, so npm ci installs what this file tested", () => {
    const lock = readJson(resolve(ROOT, "package-lock.json")) as {
      packages: Record<string, { resolved?: string; dev?: boolean }>;
    };
    for (const p of PLUGINS) {
      const entry = lock.packages[`node_modules/${p.name}`];
      expect(entry, `${p.name} is not in package-lock.json`).toBeDefined();
      expect(entry.dev, `${p.name} must be a devDependency: plugin data never ships in the package`).toBe(true);
      // A tag pin resolves to whatever commit the tag pointed at; a commit
      // pin must resolve to exactly that commit.
      if (/^[0-9a-f]{40}$/.test(p.pin)) expect(entry.resolved, p.name).toMatch(new RegExp(`#${p.pin}$`));
    }
  });

  it("are data-only packages: output/*.json and no code", () => {
    for (const p of PLUGINS) {
      const pkg = readJson(resolve(p.dir, "package.json")) as Record<string, unknown>;
      expect(pkg.name).toBe(p.name);
      expect(pkg.main ?? pkg.exports ?? pkg.module, `${p.name} ships code`).toBeUndefined();
      expect(existsSync(resolve(p.dir, "output/device-models.json")), `${p.name}: no output/device-models.json`).toBe(
        true,
      );
    }
  });
});

describe.each(PLUGINS.map((p) => [p.name, p] as const))("%s", (_name, plugin) => {
  it("declares its models as a non-empty array with unique lowercase ids", () => {
    expect(plugin.models.length, "output/device-models.json must be a non-empty array").toBeGreaterThan(0);
    const ids = plugin.models.map(id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of ids) expect(i).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("validates every model against the CURRENT device-model schema and validateDeviceModel", () => {
    for (const m of plugin.models) {
      expect(validDevice(m), `${id(m)}: schema: ${schemaErrors(validDevice)}`).toBe(true);
      const r = validateDeviceModel(m);
      expect(r.ok, `${id(m)}: validateDeviceModel: ${r.errors.join("; ")}`).toBe(true);
    }
  });

  it("validates its character set, if it ships one, against the CURRENT character-set schema and materialises it", () => {
    if (plugin.charset === undefined) return;
    expect(validCharset(plugin.charset), `schema: ${schemaErrors(validCharset)}`).toBe(true);
    const r = validateCharacterSet(plugin.charset);
    expect(r.ok, `validateCharacterSet: ${r.errors.join("; ")}`).toBe(true);
    expect(() => materializeCharacterSet(plugin.charset as CharacterSet)).not.toThrow();
  });

  it("every model resolves, has a set and (for an LED) a layout spec, and gets a transition menu", () => {
    for (const raw of plugin.models) {
      const model = resolveDeviceModel(raw as DeviceModel);
      expect(model.id).toBe(id(raw));
      const set = characterSetForModel(model);
      expect(set.chars.length).toBeGreaterThan(0);
      if (model.technology === "led_matrix") {
        const spec = ledSpecForModel(model);
        expect(spec, `${model.id}: no LED spec`).toBeDefined();
        expect(spec!.width).toBeGreaterThan(0);
      }
      const menu = transitionsForModel(model);
      expect(menu.length).toBeGreaterThan(0);
      expect(menu.map((t) => t.id)).toContain(defaultTransitionIdForModel(model));
    }
  });

  it("a model that shares an id with a built-in agrees with it on everything rendering reads", () => {
    for (const raw of plugin.models) {
      const i = id(raw) as string;
      if (!DEVICE_MODEL_IDS.includes(i as DeviceModelId)) continue;
      const declared = raw as DeviceModel;
      const builtIn = DEVICE_MODELS[i as DeviceModelId];
      // Geometry, colour, charset, font, appearance, legacy and the animation
      // budget must be the same data: a preview of the built-in and a preview
      // of the plugin's declaration must draw identically and compress a
      // transition into the same budget. Only the research prose is allowed to
      // differ — the plugin carries `notes` and `sources`; the runtime built-in
      // deliberately does not (bundle budget, see devices.ts).
      expect(renderingFacts(declared), `${plugin.name}: ${i} disagrees with the built-in`).toEqual(
        renderingFacts(builtIn),
      );
      expect(builtIn.animation.notes).toBeUndefined();
      expect(builtIn.animation.sources).toBeUndefined();
    }
  });
});

describe("@fiestaboard/output-divoom-pixoo", () => {
  const pixoo = PLUGINS.find((p) => p.name === "@fiestaboard/output-divoom-pixoo");
  const declared = pixoo?.models.find((m) => id(m) === "divoom_pixoo64") as DeviceModel | undefined;

  it("declares divoom_pixoo64 with the research prose the runtime built-in leaves out", () => {
    expect(declared).toBeDefined();
    expect(typeof declared!.animation.notes).toBe("string");
    expect(declared!.animation.sources?.length).toBeGreaterThan(0);
  });

  it("is the Pixoo FiestaUI renders: 64×64 RGB, led_3x5 in the 3×5 face, a 32-frame sequence budget, square dots", () => {
    expect(declared).toMatchObject({
      technology: "led_matrix",
      family: "divoom",
      geometry: { kind: "pixels", width: 64, height: 64 },
      color: { kind: "rgb", bitDepth: 24 },
      charset: "led_3x5",
      font: "3x5",
      animation: { delivery: "sequence", maxFps: 12.5, maxFrames: 32, minFrameMs: 80 },
      appearance: { pixelShape: "square" },
      legacy: { preset: "pixoo64" },
    });
    expect(declared).not.toHaveProperty("pixelShape");
  });
});
