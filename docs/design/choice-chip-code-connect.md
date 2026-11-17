# ChoiceChip design mapping

Read-only Figma source: [C30 / Choice chip](https://www.figma.com/design/ZQ8RMELCO6qEOFZUnQu36e?node-id=142-21738).

The parserless `choice-chip.figma.ts` template maps the exact `Label` text property and both `State` variants (Off/On) to `label` and `selected`. Figma's 44px target maps to `size="touch"`; default density is 32px. Selection is controlled by the host via `setSelected`. The internal check reuses the exact Lucide Check documented by Figma.

For a single-selection set, use `ChoiceChipGroup aria-label="…" value={value} onValueChange={setValue}` with child `ChoiceChip value="…" label="…"`. The group owns selection; omit standalone `selected`/`onSelectedChange` on its children.

The template is source only and has not been published: the task permits read-only Figma access. The repository has no Code Connect runtime/type dependency, so this parserless artifact lives outside the application TypeScript build. Publishing and its Figma-side template validation remain a separate design-system action.

Parity manifest entries `forms-choice-chip-off` and `forms-choice-chip-on` target the corresponding Default/Selected touch stories. Both references await the design-refs checkout; local reference and implementation PNGs live in the program hub at `shots/fiestaui-1.11/ui111a-choice-chip/`.

Program design deltas: DD-W95 records token-derived dark/interaction states and long-label wrapping; DD-W99 records Core sizing and group/toggle semantics.
