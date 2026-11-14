# HubDiscoveryRow Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Deliver slice 1.10c as an independent alpha PR using ListRow.
**Architecture:** A li wrapper contains a button-rendered ListRow. Inset group owns borders, radius and size context; host owns discovery and selection effects.
**Tech Stack:** React 19, TypeScript, Base UI ListRow, Tailwind tokens, Vitest, Storybook axe/play.
**Spec:** ../specs/2026-11-13-universal-hub-discovery-design.md

## Global constraints

- Work only in 1.10c-hub-discovery; no ListRow changes or platform chrome.
- No merges, VRT approval or PR comments. Minor changeset. Normal merge of origin/alpha before push.
- Save shots and status in program hub. Full-size Figma row reference is absent; document parity limit.

## Review focus

- List group retains li children and no nested interactive elements.
- Enter and Space activate once; disabled suppresses activation.
- Button does not submit a surrounding form.
- Long addresses/names and 200% text wrap without horizontal overflow.
- Group touch size, explicit size/layout, custom decorative icon/meta and root attributes/ref survive composition.

## Task 1: component and behavior

Files: src/components/onboarding/hub-discovery-row{,.test}.tsx.
Interface: HubDiscoveryRow(name, address, onSelect, disabled?, meta?, icon?, size?, layout?, ...liProps), ref HTMLLIElement.

- [ ] Write tests for the five review focus cases (layout overflow in stories).
- [ ] Run npm test -- src/components/onboarding/hub-discovery-row.test.tsx; expect missing component failure.
- [ ] Implement li + button ListRow with Server IconTile sm / chevron defaults, inherited corner radius and disabled state.
- [ ] Run targeted tests, expect pass; commit component/tests.

## Task 2: public package and visual verification

Files: src/index.ts (own export), src/stories/component-inventory{.ts,-demos.tsx} (own entry/demo), onboarding/hub-discovery-row.stories.tsx, .changeset/onboarding-110c.md; inventory mount test if existing suite does not cover new demo.

- [ ] Add six stories: Default, DiscoveredHubs, Disabled, LongNames, Touch, LargeText. Play assertions verify list/keyboard and overflow as appropriate.
- [ ] Export and inventory HubDiscoveryRow. Add minor changeset.
- [ ] Run typecheck, lint, format:check, full tests with coverage, changed-file coverage gate, build, release:test, build-storybook.
- [ ] Run axe/play for new stories and inventory, each spec separately with one worker, light and dark. Capture four legs per story and compare against saved P3 reference.
- [ ] Obtain fresh code/parity review; fix blocking findings with tests. Commit, merge origin/alpha, push, open PR, observe CI/VRT, update status and worktree row.
