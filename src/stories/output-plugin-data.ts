/**
 * Story-only: the output plugins' device data, read from the packages
 * FiestaUI pins as devDependencies (spec §6.1, plan Task 11).
 *
 * Each FiestaBoard output plugin is a data-only npm package that ships its
 * `output/device-models.json`. The stories render those models — the data
 * a plugin has actually published, not a copy of it — through
 * `DisplayPreview`, captioned with the package and the commit or tag
 * package.json pins. `src/lib/output-plugin-data.test.ts` is the contract
 * test over the same packages; it discovers them from package.json, while
 * this module has to import each one by name (a bundler cannot glob
 * node_modules), so adding a plugin means adding it in both places.
 *
 * Nothing here is exported from the package.
 */

import pixooModels from "@fiestaboard/output-divoom-pixoo/output/device-models.json";

import { devDependencies } from "../../package.json";
import { type DeviceModel, validateDeviceModel } from "../lib/devices";

export interface OutputPluginData {
  /** The package name, `@fiestaboard/output-<device>`. */
  name: string;
  /** The commit or tag package.json pins it to. */
  pin: string;
  /** `<name>@<pin>`, with a commit shortened, for a caption. */
  caption: string;
  /** The declared models, validated: a declaration that fails throws at load. */
  models: DeviceModel[];
}

/** The ref after `#` in a `github:owner/repo#ref` spec. */
function pinOf(name: string): string {
  const spec = (devDependencies as Record<string, string>)[name];
  const pin = spec?.split("#")[1];
  if (!pin) throw new Error(`${name} is not a pinned github: devDependency in package.json (got "${spec}")`);
  return pin;
}

function plugin(name: string, declared: unknown): OutputPluginData {
  if (!Array.isArray(declared)) throw new Error(`${name}: output/device-models.json is not an array`);
  const models = declared.map((m) => {
    const r = validateDeviceModel(m);
    if (!r.ok) throw new Error(`${name}: ${(m as { id?: string })?.id ?? "?"}: ${r.errors.join("; ")}`);
    return m as DeviceModel;
  });
  const pin = pinOf(name);
  const shortPin = /^[0-9a-f]{40}$/.test(pin) ? pin.slice(0, 12) : pin;
  return { name, pin, caption: `${name}@${shortPin}`, models };
}

/** Every pinned output plugin, with its models as published. */
export const OUTPUT_PLUGINS: readonly OutputPluginData[] = [plugin("@fiestaboard/output-divoom-pixoo", pixooModels)];

/** The Pixoo plugin, and its `divoom_pixoo64` as it declares it. */
export const PIXOO_PLUGIN = OUTPUT_PLUGINS[0];
export const PIXOO_FROM_PLUGIN: DeviceModel = PIXOO_PLUGIN.models.find((m) => m.id === "divoom_pixoo64")!;
