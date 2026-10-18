import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Prose } from "./prose";

// jsdom owns the DOM contract; the stories exercise typography in a browser.
describe("Prose", () => {
  it("defaults to document density and leaves rich text semantics intact", () => {
    render(
      <Prose data-testid="content">
        <section>
          <h1 id="guide">Guide</h1>
          <p>
            Read the <a href="#guide">guide</a>.
          </p>
          <ol start={3}>
            <li>Install</li>
          </ol>
          <pre>
            <code>{"line 1\n  line 2"}</code>
          </pre>
          <table>
            <caption>Devices</caption>
            <tbody>
              <tr>
                <th scope="row">Note</th>
                <td>45 tiles</td>
              </tr>
            </tbody>
          </table>
          <img src="/board.png" alt="Board preview" />
        </section>
      </Prose>,
    );
    const root = screen.getByTestId("content");
    expect(root).toHaveAttribute("data-slot", "prose");
    expect(root).toHaveAttribute("data-size", "base");
    expect(root).toHaveAttribute("data-heading-offset", "0");
    expect(screen.getByRole("heading", { level: 1, name: "Guide" })).toHaveAttribute("id", "guide");
    expect(screen.getByRole("link", { name: "guide" })).toHaveAttribute("href", "#guide");
    expect(screen.getByRole("list")).toHaveAttribute("start", "3");
    expect(root.querySelector("pre > code")?.textContent).toBe("line 1\n  line 2");
    expect(screen.getByRole("table", { name: "Devices" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader")).toHaveAttribute("scope", "row");
    expect(screen.getByRole("img", { name: "Board preview" })).toBeInTheDocument();
  });

  it("changes heading presentation without rewriting levels, including custom renderer components", () => {
    const Content = () => (
      <>
        <h1>Title</h1>
        <h6>Footnote</h6>
      </>
    );
    const { rerender } = render(
      <Prose size="sm" headingOffset={2} data-testid="content">
        <Content />
      </Prose>,
    );
    expect(screen.getByTestId("content")).toHaveAttribute("data-size", "sm");
    expect(screen.getByTestId("content")).toHaveAttribute("data-heading-offset", "2");
    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 6, name: "Footnote" })).toBeInTheDocument();
    rerender(
      <Prose headingOffset={5} data-testid="content">
        <Content />
      </Prose>,
    );
    expect(screen.getByTestId("content")).toHaveAttribute("data-heading-offset", "5");
    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeInTheDocument();
  });

  it.each([
    [-3, "0"],
    [2.9, "2"],
    [99, "5"],
    [NaN, "0"],
    [Infinity, "0"],
    [-Infinity, "0"],
  ])("normalizes headingOffset=%s to %s", (offset, expected) => {
    render(
      <Prose headingOffset={offset} data-testid="content">
        Text
      </Prose>,
    );
    expect(screen.getByTestId("content")).toHaveAttribute("data-heading-offset", expected);
  });

  it("preserves the consumer's ref, attributes and styles", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Prose ref={ref} role="region" aria-label="Readme" className="my-prose" style={{ maxWidth: 640 }}>
        Text
      </Prose>,
    );
    const root = screen.getByRole("region", { name: "Readme" });
    expect(ref.current).toBe(root);
    expect(root).toHaveClass("my-prose");
    expect(root).toHaveStyle({ maxWidth: "640px" });
    expect(root).not.toHaveAttribute("headingOffset");
    expect(root).not.toHaveAttribute("size");
  });

  it("renders on the server without parsing string children as HTML or markdown", () => {
    const html = renderToString(<Prose>{"# Title <strong>text</strong>"}</Prose>);
    expect(html).toContain("# Title &lt;strong&gt;text&lt;/strong&gt;");
    expect(html).not.toContain("<h1");
    expect(html).not.toContain("<strong>");
  });
});
