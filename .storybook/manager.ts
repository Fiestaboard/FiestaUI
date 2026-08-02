import { GLOBALS_UPDATED, SET_GLOBALS } from "storybook/internal/core-events";
import { addons } from "storybook/manager-api";

import { fiestaDark, fiestaLight } from "./theme";

addons.setConfig({ theme: fiestaDark });

// The manager shell follows the preview's Theme toolbar toggle instead of
// staying hardcoded dark. SET_GLOBALS covers the initial preview boot
// (restoring a light choice from the URL); GLOBALS_UPDATED covers toggles.
addons.register("fiestaui/manager-theme-sync", (api) => {
  const sync = ({ globals }: { globals?: Record<string, unknown> }) => {
    if (!globals || !("theme" in globals)) return;
    api.setOptions({ theme: globals.theme === "light" ? fiestaLight : fiestaDark });
  };
  const channel = addons.getChannel();
  channel.on(SET_GLOBALS, sync);
  channel.on(GLOBALS_UPDATED, sync);
});
