import type { TestRunnerConfig } from "@storybook/test-runner";
import { checkA11y, configureAxe, injectAxe } from "axe-playwright";

const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },
  async postVisit(page) {
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
