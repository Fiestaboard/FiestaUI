# PageSubheader + collapsible PageHeader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give FiestaUI the pieces a hub-and-spoke route needs — a section header that stays mounted and tucks its description away when you drill in, and a breadcrumb + sub-header block that expands beneath it — plus a Storybook demo of the whole flow.

**Architecture:** One internal `Reveal` primitive (CSS `grid-template-rows: 0fr ↔ 1fr`, `inert` when closed) drives both `PageHeader collapsed` and the new `PageSubheader`. `PageSubheader` takes a nullable `detail`; null means "at the hub" and it collapses while still painting the last detail so the close animates with real content. Routing stays the consumer's job (`renderLink`, like `Sidebar`).

**Tech Stack:** React 19, Tailwind v4, Base UI, Vitest + Testing Library, Storybook 9, Playwright (video).

**Spec:** FiestaBoard `docs/internal/specs/2026-10-05-section-breadcrumb-nav-design.md` (branch `feat/section-breadcrumb-nav`). This plan covers the spec's Sequencing step 1 plus a mock demo; FiestaBoard adoption (steps 2–5) is planned after the demo is approved.

## Global Constraints

- No hard-coded user-facing strings in components: every label is a prop (`breadcrumbLabel` required).
- No left accent rails.
- Motion through theme tokens (`duration-base`, `ease-out-cubic`), never raw `duration-200`; `motion-reduce:transition-none`.
- Additive API: existing `PageHeader` call sites render identically (`collapsed` defaults to `false`).
- Heading outline: `PageHeader` h1, `PageSubheader` h2.

## Review Focus

1. Deep link straight onto a detail (mounted with `detail` already set) — must render open with no animation and must NOT steal focus.
2. Navigating back (detail → null) — the collapse must animate the last detail's text, not an empty box.
3. Detail → a different detail without passing the hub (A → B) — title swaps in place, stays open, focus moves to the h2.
4. Long item names at 390px — breadcrumb and h2 wrap, never scroll sideways.
5. Collapsed content must be unreachable by Tab and absent from the a11y tree (`inert`), and leave no stray border/padding.

---

### Task 1: `Reveal` primitive

**Files:**
- Create: `src/components/chrome/reveal.tsx`
- Test: `src/components/chrome/reveal.test.tsx`

**Interfaces:**
- Produces: `Reveal({ open: boolean; children; className?; innerClassName? })` — internal (not exported from `src/index.ts`).

- [ ] **Step 1: failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Reveal } from "./reveal";

describe("Reveal", () => {
  it("is inert and marked closed when not open", () => {
    render(<Reveal open={false}><button>hidden</button></Reveal>);
    const root = document.querySelector("[data-slot=reveal]")!;
    expect(root).toHaveAttribute("data-state", "closed");
    expect(root).toHaveAttribute("inert");
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("is reachable when open", () => {
    render(<Reveal open><button>shown</button></Reveal>);
    expect(document.querySelector("[data-slot=reveal]")).toHaveAttribute("data-state", "open");
    expect(screen.getByRole("button", { name: "shown" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2:** `npx vitest run src/components/chrome/reveal.test.tsx` → FAIL (module not found).
- [ ] **Step 3: implement**

```tsx
export function Reveal({ open, children, className, innerClassName }: RevealProps) {
  return (
    <div
      data-slot="reveal"
      data-state={open ? "open" : "closed"}
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-base ease-out-cubic motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className,
      )}
    >
      <div className={cn("min-h-0 overflow-hidden", innerClassName)}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 4:** test passes. **Step 5:** commit `feat(chrome): Reveal — the grid-rows collapse behind page drill-in`.

### Task 2: `PageHeader collapsed`

**Files:** Modify `src/components/chrome/page-header.tsx`; Test `src/components/chrome/page-header.test.tsx` (new).

**Interfaces:** Produces `PageHeader` prop `collapsed?: boolean` (default false). Description and `children` (action slot) wrap in `Reveal open={!collapsed}`; h1 + icon untouched.

- [ ] **Step 1: failing test**

```tsx
it("tucks the description and action away when collapsed", () => {
  render(<PageHeader icon={Monitor} title="Displays" description="Every board" collapsed><button>Add</button></PageHeader>);
  expect(screen.getByRole("heading", { level: 1, name: "Displays" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
  for (const r of document.querySelectorAll("[data-slot=reveal]")) expect(r).toHaveAttribute("inert");
});
it("renders as before when not collapsed", () => {
  render(<PageHeader icon={Monitor} title="Displays" description="Every board"><button>Add</button></PageHeader>);
  expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  expect(screen.getByText("Every board")).toBeVisible();
});
```

- [ ] **Step 2:** FAIL. **Step 3:** implement (wrap `<p className="page-description">` in `<Reveal open={!collapsed}>`; wrap `children` in `<Reveal open={!collapsed}>` only when children present). **Step 4:** PASS + existing `page-card.test.tsx` still passes. **Step 5:** commit.

### Task 3: `PageSubheader`

**Files:** Create `src/components/chrome/page-subheader.tsx`, `page-subheader.test.tsx`; Modify `page-card.tsx` (slot rule), `src/index.ts` (export).

**Interfaces:**
```ts
export interface PageSubheaderCrumb { label: string; href: string }
export interface PageSubheaderDetail {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Crumbs BEFORE the current item, outermost first. Usually one: the section. */
  crumbs: PageSubheaderCrumb[];
}
export interface PageSubheaderProps {
  detail: PageSubheaderDetail | null;
  breadcrumbLabel: string;
  renderLink?: (props: { href: string; children: React.ReactNode }) => React.ReactElement;
  className?: string;
}
```
Behaviour: open iff `detail != null`; while closed it renders the last non-null detail; on a closed→open transition, or a title change while open, focuses the h2 (`tabIndex={-1}`); never on first mount. Root `data-slot="page-subheader"`; padding (`px-6 pb-6`) and top rule live INSIDE the Reveal so nothing remains when collapsed.

- [ ] **Step 1: failing tests** — (a) `detail=null` on mount → nothing focusable, `inert`; (b) mounted open → nav named by `breadcrumbLabel`, crumb link `href`, current item `aria-current="page"`, h2 title, focus NOT moved; (c) rerender null→detail → `document.activeElement` is the h2; (d) rerender detail→null → still renders last title text, `data-state=closed`; (e) A→B → h2 text B and focused; (f) `renderLink` used for crumbs.
- [ ] **Step 2:** FAIL. **Step 3:** implement with `Breadcrumb*` + `Heading level={2} size="xl"` + `Reveal`; "last detail" via the derive-state-during-render pattern (`useState` + compare). **Step 4:** PASS. **Step 5:** add `[&>[data-slot=page-subheader]]` needs nothing in PageCard (it pads itself) — verify in story; export from `src/index.ts`; commit.

### Task 4: Stories + hub-and-spoke demo

**Files:** Create `src/components/chrome/page-subheader.stories.tsx` (Open, Closed, LongTitle, WithAction) and `src/components/chrome/section-navigation.stories.tsx` (`App/Chrome/Section navigation`): AppShell with sidebar order Home, Displays, Pages, Collections, Schedule, Integrations; Displays (tiles → display detail with board preview + settings sections), Integrations (installed/marketplace tabs → plugin detail), Pages (tiles → editor mock). The section layout is keyed by section so the card persists within a section and remounts across sections, exactly as the router will.

- [ ] Build; `npm run typecheck && npm run lint && npm test`; commit.

### Task 5: Design review loop

- [ ] Screenshot the demo (light/dark × 1200/390, hub + drilled) via Playwright against `storybook dev`.
- [ ] Fable review agent with screenshots + diffs; apply accepted findings; repeat until no blocking findings.

### Task 6: Video

- [ ] Playwright `recordVideo` walking the demo (Displays drill-in/out, Integrations from Marketplace tab, Pages editor, a direct deep-link, dark mode, phone width); ffmpeg to mp4; save to `~/Desktop/section-navigation-demo.mp4`.
