# HubDiscoveryRow (slice 1.10c)

A presentational, selectable hub record for setup. Build on alpha's ListRow and use it inside ListRowGroup variant="inset". The host owns discovery, permissions, empty/error states, navigation and selection side effects. No network calls, platform axis or native chrome.

Reference: Figma working file ZQ8RMELCO6qEOFZUnQu36e, 05 Setup Row 35:17409 (review #396 records "FiestaUI candidate: ListRow"), Choose your hub 39:65267, saved program/shots/fiestaui-1.10/figma-08-P3-61-42840.png. The saved P3 image embeds the screen at thumbnail scale; there is no full-size saved row reference. Claim structural parity only; a full-resolution visual sign-off remains for Fable.

## API and composition

HubDiscoveryRow accepts name (ReactNode), address (string), onSelect (button click handler), disabled?, meta? (noninteractive ReactNode), icon? (decorative ReactNode), size? (ListRow default/touch) and layout? (auto/inline/stacked), plus li attributes and an li ref. It always renders li, containing a ListRow rendered as a native button. Name is the title, address is the muted second line, Server in IconTile sm is the default leading visual, ChevronRight is trailing and decorative. The wrapper inherits first/last corner radii from ListRowGroup and the button inherits its radius. Keep full-width focus and hover on the existing ListRow recipe. Constrain metadata to the body width and allow words to break when large text leaves a narrow column. Disabled uses the existing disabled opacity convention and suppresses native activation. Host-supplied content must not include interactive descendants.

## Approaches

Selected: li wrapper + button ListRow. It retains valid group list semantics and a full-record keyboard target without changing ListRow (locked by another slice). Direct button children break ul/li semantics (DD-W47). Title-only buttons shrink the target. Jev selected li_button_row: candidate probability 0.60, reported confidence 0.52; source inspection and axe must verify the advice.

## Verification

Test actual list semantics, pointer and Enter/Space activation, disabled behavior, button type in a form, ref/attributes, optional visual/meta and size/layout forwarding. Stories cover discovered hubs, disabled, long names/addresses, touch/mobile and large text. Run full brief checks, changed-file coverage and Storybook axe/play in light/dark, one worker. Capture light/dark desktop/mobile. No baseline approval, merges or PR comments.
