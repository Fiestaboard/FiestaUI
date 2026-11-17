# RevisionRow and RevisionDiff implementation plan

> Follow executing-plans, test first and verify before completion.

Goal: C43 revision rows and comparison content with clear Restore-to-new-draft semantics. Sources: live Figma card247:31293, phone174:77896 and tablet183:120921, program shared FiestaUI brief/IDE rulings. No platform chrome or persistence in Core.

Architecture: shared ListRow/Badge/Button and PreviewSlot. Jev overview_slot p=1.0: thumbnail ReactNode slots preserve the proposed API and support any existing renderer; no new scaling hook, grid renderer or diff/parser engine. RevisionDiff accepts labeled before/after thumbnail content and normalized change regions. Hosts supply summaries and persist Restore requests as new drafts. Shared components handle controls and focus.

Geometry: row352×minimum79, gap10,86×48 overview plus16px label/gap2; title14/20,description12/16 with3px gap; outline32px actions/coarse44. Tablet diff two288px columns/gap16 in592wide; overview220×123; after changed region blue2px outline; summary12/16 and outline36px Restore action. Responsive row actions and diff columns wrap; undrawn dark/disabled/loading/overlay modes derive semantic tokens. Overlay compare uses the same thumbnail dimensions, low-opacity before/after layers and labeled captions; never an interactive edit canvas.

API: RevisionRow thumbnail,savedAt,author,summary?,dateTime?,current?,status?(draft|live),onCompare?,onRestore?({kind:new-draft}),disabled?,loading?,labels?,ListRow root props. RevisionDiff before/after {thumbnail,label,status?},mode?(side-by-side|overlay),changes? normalizedrects,summary?,onRestore?({kind:new-draft}),disabled?,loading?,labels?,root props.

## Task1 behavior

- [ ] Failing tests for overview labeling, metadata/current state, distinct compare/restore callback intent, no form submit, disabled/pending, updates, group composition; diff labels/modes/normalization/restore intent.
- [ ] Implement shared composition, accessible names with revision identity and caller-localized text; retain full text at narrow/large sizes.
- [ ] Targeted tests and changed-file coverage >=90%lines/85%branches.

## Task2 stories and release

- [ ] Four drawn phone rows and tablet diff, light/dark/mobile, long/localized, disabled/loading, overlay, keyboard/browser geometry.
- [ ] Public exports, owninventory entries/demos and minorchangeset.
- [ ] Save raw liveFigma references and implementationcaptures whenrealbrowseravailable; sourcecorrespondence isnotrenderedparity.
- [ ] Full unitcoverage/static/build/release/Storybook andaxe; disclosehostbrowserlaunchblock ifunchanged.
- [ ] Normalmergealpha/commit/push/PR endingrequiredattribution; exactheadseparateAstrareview max3rounds andgreenCI/VRTwithoutapproval.
