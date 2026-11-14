---
"@fiestaboard/ui": minor
---

Add the onboarding and PWA pieces of the honest install flow (universal slice 1.10a): `InstallCard`, `InstallSteps` and `PrivacyNote`, in a new Onboarding group.

- `InstallCard` is the in-content install offer (07 Chrome install card): a labelled section on the card surface with a small muted IconTile, a title, a body and the Install (secondary, download icon) and Not now (ghost) actions. `state="installing"` makes Install busy and keeps focus; `state="needs-https"` draws no Install button at all, so an insecure origin never shows a fake button. When to show it and the snooze stay with the consumer. Labels default to `DEFAULT_INSTALL_CARD_LABELS`.
- `InstallSteps` is a numbered list of browser steps (07 Safari Add to Home Screen sheet): muted rows with a numbered disc, the step copy and an optional trailing glyph. Host it in `Sheet side="bottom" grabber`.
- `PrivacyNote` is the standing "your data stays on your network" promise (05 Setup / Privacy note): static prose with a shield glyph, a title and a body, on the card ground with a border.

None of them ships copy: titles, bodies and steps are the consumer's.
