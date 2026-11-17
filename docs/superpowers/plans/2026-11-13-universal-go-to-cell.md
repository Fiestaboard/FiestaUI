# GoToCell implementation plan

> Follow executing-plans, test first and verify before completion.

Goal: C38 inline coordinate/search field, Figma108:7324 and card246:46906. The only drawing is220×36 with LocateFixed16,8px gaps, text14/20, and shared Mod/J keycaps. Core contains no platform prop or dialog chrome.

Architecture: shared Input/Kbd/Lucide in a field group. Jev inline_query p=.99 over an invented dialog. Enter parses row-column pairs (14 49, r14c49, Row14·Col49 or C49·R14), validates bounds and calls onGo. Optional onSearch delegates band/search terms to the host, never an internal search engine. Mod+J focuses/selects the field; Escape restores current coordinates. Controlled position follows host caret changes. Public input ref is preserved.

API: columns,rows,onGo({row,column}),value?({row,column}),onSearch?(query),shortcut?(boolean defaulttrue),labels?,size(default|touch),native inputprops exceptvalue/defaultValue/onChange. Inline errors identify expectedformat or currentbounds. onKeyDown/onFocus callbacks remain composable; cancellation,IME,disabled/readOnly and nestedforms are respected. No submit-button one-off or popup.

## Task1 behavior and composition

- [x] Red tests coordinate formats,first/lastbounds,invalid/empty/search,Enter andEscape,propupdates,modshortcut lifecycle,IME,disabled/caller-cancel,form-no-submit andref.
- [x] Implement using shared Input and Kbd with existing focus/error/touch token recipes.
- [x] Meaningful focusedcoverage and changedgate >=90%lines/85%branches.

## Task2 stories/release

- [x] Drawn Row14·Col49, dark/mobile/touch,invalid/search/disabled/keyboard/narrowlocalized stories; realbrowser geometry assertions.
- [x] Own exports/inventorydemo,minorchangeset,sourceplan/status.
- [x] Save authoritative2x and live Figma reference; no UI rasterassets or Figmawrites.
- [ ] Fulltests,static,build,release,Storybook/axe; discloseknownnativebrowserblock and collectCIevidence.
- [ ] Normalmergealpha/commit/push,ownPRintoalpha, separateAstrareviewmax3rounds atfinalhead, observeCI/VRTwithoutapproving/merging.

Observed: full3393passed/33skipped; finalfocused492passed; changedcoverage all4pass (GoToCell100lines/93.93branches); static/library/Storybook/packageexports and packdryrun pass; serialrelease499passed. First release run498passed/1failed focusringguard; corrected to shared --focus-ring-shadow then18/18guard and499/499release pass. Browser/axe/parity remain pending; existing native Chromium launch denial is documented in the program status.

## Touch readability follow-up

Keep the drawn compact field at 220×36. Explicit touch uses the shared `w-60` spacing token (240px preferred width, constrained by `max-w-full`) so 16px current-coordinate text and both shortcut keycaps fit while retaining the 44px input target. The Mobile and Touch stories wait for fonts and assert that the default coordinate fits the native input viewport. A narrower host may still constrain the input and use native horizontal scrolling for longer localized queries.
