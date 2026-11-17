# ColumnRuler and TruncationMap implementation plan

> Follow superpowers:executing-plans; test first, verify before completion.

Goal: C36 Core board geometry ruler and compact line overflow overview. Sources: Figma working file ZQ8RMELCO6qEOFZUnQu36e nodes109:8971 and109:30655, card246:45467; program briefs/FIESTAUI-SLICE-BRIEF.md and IDE-1.11-RULINGS.md.

Architecture: ColumnRuler is a noninteractive labeled geometry graphic with data-driven cut/zone/seam marks and a controlled visible column range. Default pitch uses Tile sm (13+3). Marks carry seam gap, default10 as drawn; hosts may use6 to match the existing StaticBoardDisplay. Jev explicit_geometry p=0.95, because fixed6 loses drawn parity and fixed10 prevents alignment. No renderer edits. TruncationMap is a semantic list of compact line diagrams; overflowing descriptions are buttons for row/column jumps; the diagrams are read-only. Labels and descriptions are supplied by hosts. No client parser or template engine.

API: ColumnRuler columns:number, columnPitch?:number, visibleRange?:{start,end}, marks?:{id,type:cut|zone|seam,column,label?,gap?}[], label?, root props. Column numbers are1-based; marks sit after their column. TruncationMap columns:number, lines:{row,length,overflow?:{column,count,description}}[], zones?:number[], onJump?({row,column}), title?, emptyLabel?, disabled?, root props.

Constraints: Core only, existing tokens; no platform prop or new dependencies. Drawn ruler28high/16pitch; major ticks1/every8, cut2px destructive, zone2px formula, seam6pxsecondary. Map340wide/padding14x10/gap2, bars240x6, row labels9/10, description12/16. Theme/focus/disabled undrawn states derive kit recipes. Mobile descriptions retain44px hit targets. Root and labels may grow under large text.

## Task1 geometry and behavior

- [ ] Add failing tests for arbitrary columns, range cropping, marks, seam spacing and read-only semantics; line widths, empty/full/overflow rows, keyboard jumps, disabled/read-only and localized descriptions.
- [ ] Observe failure; implement new editor/column-ruler.tsx and truncation-map.tsx, no shared primitive changes.
- [ ] Run focused tests and changed-file coverage >=90%lines/85%branches.

## Task2 stories and integration

- [ ] Drawn96,29,30Note ruler stories; complete24row drawn map; light/dark/mobile/narrow/localized/empty/disabled stories.
- [ ] Add ownexports/inventory/demos and minor changeset.
- [ ] Save live figma refs; browser screenshot pairs/axe when runtime available. Current native browser sandboxblocks execution, CI evidence pending; never claim visualpass from source.
- [ ] Run typecheck/lint/format/fulltests/build/release/Storybook, keep actual logs.
- [ ] Merge origin/alpha normally, commit/push, ownPRbody intoalpha withrequiredtrailer.
- [ ] Separate Astra exactheadreview up to3rounds; fix regressions, observegreenCI/VRT withoutapproving.
