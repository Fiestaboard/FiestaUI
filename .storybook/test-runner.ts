import type { TestRunnerConfig } from "@storybook/test-runner";
import { checkA11y, configureAxe, injectAxe } from "axe-playwright";

/**
 * Which theme this run renders, from the `THEME` env that ci.yml's a11y
 * matrix exports (`dark` | `light`). Unset locally means "whatever the
 * Storybook's own defaults are" — `initialGlobals` in preview.tsx.
 *
 * It is an env, not a `--url` query, for a reason worth keeping (#306): the
 * runner builds the story page with `new URL("iframe.html", TARGET_URL)`, and
 * relative resolution keeps a base's path but DROPS its query. The old
 * `--url "…?globals=theme:light"` recipe therefore visited `/iframe.html`
 * with default globals on both legs, and the light half of the palette was
 * never checked — #304's 1.71:1 checked label passed for months that way.
 */
const THEMES = ["dark", "light"] as const;
type Theme = (typeof THEMES)[number];

function requestedTheme(): Theme | undefined {
  const theme = process.env.THEME;
  if (theme === undefined || theme === "") return undefined;
  if (!(THEMES as readonly string[]).includes(theme)) {
    throw new Error(`THEME must be one of ${THEMES.join(", ")}; got "${theme}".`);
  }
  return theme as Theme;
}

const config: TestRunnerConfig = {
  // Replaces the runner's default prepare, which is only this `page.goto` (plus
  // the optional `getHttpHeaders` hook, mirrored here). Owning it is what lets
  // the theme global go on iframe.html's OWN query — the one URL nothing
  // re-resolves — exactly as scripts/vrt/vrt.mjs already addresses each shot.
  //
  // `id=*` is load-bearing, not decoration. The preview only applies URL
  // globals while selecting a story (PreviewWithSelection.selectSpecifiedStory
  // returns early to renderMissingStory when nothing is specified), and the
  // runner's own boot URL specifies nothing — it selects stories afterwards
  // over the channel. `*` is Storybook's "first story" specifier, so the page
  // boots on a real selection, the globals land, and they then persist across
  // every setCurrentStory the runner emits. Measured, not assumed: booting
  // `iframe.html?globals=theme:light` alone left <html> dark on every story.
  async prepare({ page, browserContext, testRunnerConfig }) {
    const targetURL = process.env.TARGET_URL;
    if (!targetURL) throw new Error("TARGET_URL is unset — the test runner always exports it from --url.");
    const iframeURL = new URL("iframe.html", targetURL);
    const theme = requestedTheme();
    if (theme) {
      iframeURL.searchParams.set("globals", `theme:${theme}`);
      iframeURL.searchParams.set("id", "*");
      iframeURL.searchParams.set("viewMode", "story");
    }

    if (testRunnerConfig.getHttpHeaders) {
      await browserContext.setExtraHTTPHeaders(await testRunnerConfig.getHttpHeaders(iframeURL.toString()));
    }
    await page.goto(iframeURL.toString(), { waitUntil: "load" }).catch((err: Error) => {
      if (err.message?.includes("ERR_CONNECTION_REFUSED")) {
        throw new Error(
          `Could not access the Storybook instance at ${targetURL}. Are you sure it's running?\n\n${err.message}`,
        );
      }
      throw err;
    });
  },

  async preVisit(page) {
    await injectAxe(page);
  },

  async postVisit(page, context) {
    // The leg must prove it rendered the theme it is named for BEFORE axe
    // reads a single colour. preview.tsx's ThemeSync decorator stamps the
    // `dark` class on <html> from the `theme` global, so the class is the
    // ground truth of which palette theme.css resolved. Without this, a
    // regression in how the theme reaches the page reports as a green light
    // leg that quietly ran dark — which is precisely what #306 was.
    const theme = requestedTheme();
    if (theme) {
      const renderedDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
      if (renderedDark !== (theme === "dark")) {
        throw new Error(
          `${context.id}: THEME=${theme} was requested but the page rendered ${renderedDark ? "dark" : "light"} ` +
            `(<html> ${renderedDark ? "has" : "lacks"} the "dark" class). The theme global did not reach the iframe.`,
        );
      }
    }

    await configureAxe(page, {
      rules: [
        { id: "page-has-heading-one", enabled: false },
        { id: "heading-order", enabled: false },
        { id: "color-contrast-enhanced", enabled: false },
      ],
    });

    // The wordmark is excluded, and only the wordmark. WCAG 1.4.3 exempts
    // logotypes outright — "text that is part of a logo or brand name has no
    // minimum contrast requirement" — but axe cannot know that a span is a
    // logotype, so it reads `.logo-fiesta-text` as ordinary 18px text and
    // fails it. Darkening the wordmark to satisfy the checker would push it
    // back to the dark ochre it was deliberately moved off (see
    // --brand-wordmark in theme.css), i.e. it would make the brand worse to
    // satisfy a rule that does not apply to it.
    //
    // Scoped to this one selector on purpose. Anything else that trips
    // color-contrast is a real failure and still fails the build.
    await checkA11y(page, { include: "#storybook-root", exclude: ".logo-fiesta-text" } as never, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  },
};

export default config;
