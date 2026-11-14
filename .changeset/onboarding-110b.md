---
"@fiestaboard/ui": minor
---

Add `ConnectPhoneCard` and `RecoverySteps` to the Onboarding group (universal slice 1.10b).

- `ConnectPhoneCard` is the body of web Settings › Connect a phone (07e). It shows the pairing QR panel, with the host-rendered code, the hub line, an "Expires in …" countdown and a time-left bar. The phone steps sit beside it, or an `aside` in their place, with an optional `notice` above and `footnote` below. `state="expired"` dims the code and drops the countdown. A loopback `hubAddress` draws no code at all: the slot is hidden, the countdown and bar go, the hub line explains the refusal (`refusedLabel`), `data-refused="loopback"` is set and an error is logged, so a phone is never handed an address it cannot reach. `isLoopbackHost()` is exported for hosts.
- `RecoverySteps` is a titled card of numbered fixes for an error state (05 Setup / Recovery steps), with the most likely fix first. The retry action stays with the host.

Both use the same numbered list as `InstallSteps`, in a new `plain` appearance.
