# The page card

**Date:** 2026-08-23
**Status:** approved; Phase 1 (FiestaUI) built, Phase 2 (FiestaBoard) not started
**Repos:** FiestaUI (components), FiestaBoard (adoption)

## The problem

A FiestaBoard route is a stack of free-floating blocks on the page background:
a `PageHeader`, sometimes a `PageToolbar`, then content that is usually one or
more `Card`s. Getting those blocks to line up has taken three passes — #270
inset the header, #272 added `PageInset` for bare content, and the alignment
still reads as wrong.

It reads as wrong because the 24px is unexplained. `Card` puts its border on
`PageLayout`'s gutter and its words 24px inboard of that. #270 and #272 moved
the header, the toolbar and bare content onto the same 24px column, which is
the correct column — but with no border drawn at the gutter beside them, a
reader sees words indented from the page edge for no visible reason. The route
has two left edges and only one of them is ever justified by something you can
see.

Every fix so far has tried to align a block to an invisible landmark. The
landmark needs to become visible instead.

## The decision

**One card per route.** The heading, the toolbar and the content all live
inside a single `Card` that spans the route. Its border sits on the gutter;
everything inside it sits on the content column. The two left edges are still
there, but now one of them is a hairline you can see and the other is
everything else, which is the relationship every card in the app already has.

Inside that card:

- **Sections flatten.** A settings group, the Transition Lab's Setup and
  Preview panels — anything that is a titled region of the page — loses its
  border and becomes a block separated by a hairline rule.
- **Items keep their borders.** A page tile, a collection tile, a plugin card
  — anything a user clicks to open — keeps its border, because that border is
  the click target and flattening it removes the affordance.

That distinction is a call-site judgement, not a component switch. A route
swaps `<Card><CardHeader><CardTitle>` for `<PageSection title=…>` and leaves
its tile grids alone.

## What is undone, and what is not

The brief was "undo the spacing we did before." Half of it stands.

| Thing                                     | Fate           | Why                                                                                                                                                                                 |
| ----------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PageHeader` / `PageToolbar` `px-6`       | **Kept**       | It becomes the page card's content padding. The column was right; only its justification was missing.                                                                               |
| `PageHeader` `mb-6`, `PageToolbar` `mb-4` | **Superseded** | These space free-floating blocks against a page background. Inside the card, block padding and dividers own the rhythm. Neutralised by `PageCard`, not deleted — see Compatibility. |
| `PageInset`                               | **Deprecated** | Its entire job was bare content on a route with no card. Inside a page card that job belongs to `PageSection`, which also draws the divider.                                        |
| `PageLayout` gutter and `py` ramp         | **Unchanged**  | It is now purely the card's outer margin, which is what it was always closest to being.                                                                                             |

Net API change: two exports added, one deprecated.

## Components

### `PageCard`

A `Card` that owns the vertical rhythm of a whole route.

```tsx
<PageLayout>
  <PageCard>
    <PageHeader icon={GalleryHorizontalEnd} title="Collections" description="…">
      <Button variant="brand">New collection</Button>
    </PageHeader>
    <PageToolbar left={<ViewModeToggle />} right={<SearchField />} />
    <PageSection>
      <Grid>{tiles}</Grid>
    </PageSection>
  </PageCard>
</PageLayout>
```

It renders `Card` with its own `gap` and `py` zeroed, and styles its **direct
children** as blocks instead: `px-6 py-6`, plus a full-bleed `border-t` on
every block after the first. Full-bleed rule, inset content — the same
relationship `CardHeader`'s `[.border-b]:pb-6` already sets up.

Owning the padding at the parent rather than in each child is what keeps the
three block types interchangeable: a `PageHeader`, a `PageSection` and a bare
`<div>` are all just blocks, and a route can use whichever fits without
restating 24 anywhere.

Props:

- `children` — the blocks.
- `className` — escape hatch.
- `fillHeight` — pins the card to its parent's height and lets one section
  scroll internally, for `schedule`'s calendar. Pairs with `PageLayout`'s
  existing `fillHeight`.

`overflow-hidden` is on the card unconditionally so a scrolling or
full-bleed child cannot spill past the rounded corners.

### `PageSection`

A block inside a `PageCard`, optionally titled.

```tsx
<PageSection title="Appearance" description="Theme, density and motion.">
  …
</PageSection>
```

Props:

- `title` — renders a `CardTitle size="base"`, the scale #274 added for
  exactly this kind of heading.
- `description` — renders a `CardDescription` under the title.
- `action` — right-aligned slot on the title row.
- `fill` — `flex-1 min-h-0 overflow-hidden`, so this is the section that
  scrolls under `PageCard fillHeight`.
- `children`, `className`.

It carries **no padding of its own**. `PageCard` supplies it. This is
documented on the component: `PageSection` is for use inside `PageCard`, and
standing one up on a bare page will look unpadded, which is the correct
signal.

## Compatibility

FiestaUI ships to FiestaBoard through npm, so the two repos cannot change in
the same commit. Every change here is therefore additive at the component
level:

- `PageHeader` and `PageToolbar` gain `data-slot="page-header"` and
  `data-slot="page-toolbar"` — the attribute idiom `Card` already uses.
- `PageCard` zeroes their standalone bottom margins through those slots
  (`[&>[data-slot=page-header]]:mb-0`). A route that has not migrated keeps
  the margins and renders exactly as it does today.
- `PageInset` keeps working. It gains a `@deprecated` note pointing at
  `PageSection` and is removed no earlier than the next major.

## Rollout

**Phase 1 — FiestaUI.** `PageCard` + `PageSection`, the two `data-slot`
attributes, the `PageInset` deprecation note, stories, tests, and inventory
entries. The inventory entries are not optional: a new export fails CI's
release gate until it is inventoried, and `npm test` does not catch it.

**Phase 2 — FiestaBoard.** Nothing here is forced. Every Phase 1 change is
additive, so the pipeline's evergreen upgrade PR bumps the version and the app
renders exactly as it does today; adoption is what buys the change, and it is
manual.

Measured scope, which is not what the route count suggests:

| Work                                              | Files                             |
| ------------------------------------------------- | --------------------------------- |
| Wrap route contents in `PageCard`                 | 9 routes                          |
| Drop `PageInset`                                  | `pages._index.tsx`, `picks.tsx`   |
| Settings sections → `PageSection`                 | **22 files, 32 `Card` instances** |
| Settings stories that render a section standalone | 3                                 |

Order, ascending by risk, each its own PR:

1. `debug` — header + one card. The smallest possible proof.
2. `transitions` — header + two sections. The route that prompted this.
3. `home`, `picks` — bare content; `picks` drops its `PageInset` calls.
4. `collections`, `integrations`, `pages` — toolbar plus item grids; tiles
   keep their borders.
5. **Settings** — the 22 components under `web/src/components/settings/`, each
   swapping `Card`/`CardHeader`/`CardTitle`/`CardDescription`/`CardContent` for
   one `PageSection`. Mechanical and individually reviewable. Batched by
   settings tab rather than all at once, so a bad flatten is caught on seven
   files instead of twenty-two.
6. `schedule` — last, because `fillHeight` plus an internally scrolling
   calendar is the only case that exercises `PageCard fillHeight`.

**No `flatten` prop.** A `PageCard flatten` that de-chromed descendant `Card`s
via CSS was considered as a way to land Settings in one line. Rejected: it
cannot distinguish a section card from an item card, which is the one
distinction this design rests on, and a migration aid that works tends to
become permanent. The 22 files get converted properly.

`animation-settings.stories.tsx`, `board-settings.stories.tsx` and
`display-settings.stories.tsx` render their section standalone. Because
`PageSection` carries no padding of its own, each needs a `PageCard` wrapper in
the story or it will read as unpadded — a real, accepted cost of that decision.

`integrations.$pluginId` and `pages.edit.$id` have bespoke layouts and no
`PageHeader`; they are out of scope and stay as they are.

## Testing

- **Unit** (`page-card.test.tsx`): `PageCard` renders a card surface; a
  `PageSection` after the first carries a top border and the first does not;
  `PageSection title` renders a heading; `fill` and `fillHeight` apply their
  classes.
- **Stories**: `App/Chrome/PageCard`, with a `TheRuleItDraws`-style shot
  carrying the same red content-column and blue gutter rules the `PageInset`
  and `PageHeader` stories use, so the three can be read against each other.
  A settings-style stack and an item-grid story cover the flatten/keep-border
  distinction.
- **VRT**: baselines regenerate in CI, never locally.
- Full gate before merge: `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run format:check`.

## Risks

- ~~**Long routes become one very tall card.**~~ **Retired.** The
  `SettingsLength` story shows seven flattened sections at full height and it
  reads as a clean settings list rather than a box that never ends. No need for
  the per-tab-card fallback.
- **Divider density.** The rule "every block after the first gets a top
  border" puts a hairline between header and toolbar as well as between
  toolbar and content. That is uniform, which is why it is the starting
  point, but two rules 60px apart may read heavy. Tunable in one place.
- **Nested-item contrast.** A bordered tile inside a `bg-card` surface has
  less contrast against its parent than the same tile on `bg-background`.
  Check both themes before Phase 2.
