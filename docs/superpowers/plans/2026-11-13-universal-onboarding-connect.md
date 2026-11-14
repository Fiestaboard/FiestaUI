# Onboarding and PWA, part (b): ConnectPhoneCard, RecoverySteps (universal slice 1.10b) Plan

**Goal:** the web "Connect a phone" body (08 W3, H11, H18) and the numbered recovery steps for error states (08 P4), for web 2.12 (setup parity). Builds on 1.10a (#396): it needs its internal `NumberedSteps`.

**Split (Jev 2026-11-13, `split_pr_c_after_389` 0.97):** `HubDiscoveryRow` is 05 Setup / Row (`35:17409`, "FiestaUI candidate: ListRow"), so it ships as **1.10c on ListRow after #389 is on alpha**, not as a second row recipe here.

**Reference** (Figma `ZQ8RMELCO6qEOFZUnQu36e`, read only):

- 07e §3 Connect a phone `323:14595`: live `323:16724`, localhost `323:18641`, claimed `323:20460`, expired `323:22216`, phone browser `324:21027`. PairingQR panel: card ground, border, radius 14, p 16, gap 10; QR 208; hub line (shield-check 14 muted + xs medium); countdown (clock 14 + xs medium); time-left bar 208×4 primary on muted. Steps beside it (gap 24); footnote xs muted; inline Alert above for localhost. Expired: QR at 12 % and no countdown.
- 05 Setup / Recovery steps `36:6344`: card ground, border, radius 14, p 16, gap 12; title Text/sm/semibold; rows gap 12, 24 px muted disc with Mono/label 12 number, Text/sm regular top-aligned. Hub not found `41:76887`: the retry is a screen-level button outside the card.

**Architecture:**

- `NumberedSteps` gains `appearance="plain"` (05's disc). The 07e pairing steps draw a 22 px accent disc in Archivo with gap 10: unified to the 05 style (DD-W20, designer ask).
- `RecoverySteps`: titled card (`<p id>` names the `<ol>` through `aria-labelledby`); no role, no live region; no `retry` prop (05 draws the retry outside).
- `ConnectPhoneCard`: `qr` slot (host-rendered, own light quiet zone), `qrLabel` (role img while live), `hubAddress` / `hubLabel`, `expiresLabel`, `timeLeft` 0–1, `steps` or `aside`, `notice`, `footnote`, `state: live | expired`. Countdown is not a live region. **H18:** a loopback `hubAddress` draws no QR, sets `data-refused="loopback"` and logs an error; `isLoopbackHost()` is exported for 2.12.
- Title, footer actions and the claimed state are the host's (Dialog on desktop, a page on the phone).

## Steps

- [x] Tests red: list naming, plain appearance, hidden numbers, no role; QR naming, hub line, countdown, bar clamp, steps vs aside, notice/footnote order, expired dimming, loopback refusal, `isLoopbackHost` table.
- [x] Components, exports, inventory entries and demos (QR stand-in fixture), mount test.
- [x] Stories: ConnectPhoneCard Live / OnLocalhost / Expired / RefusesLoopback / InDialog; RecoverySteps Default / WithoutTitle / InHubNotFound.
- [x] Coverage gate, axe in both themes, release guards, changeset.
