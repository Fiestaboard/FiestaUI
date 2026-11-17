---
"@fiestaboard/ui": minor
---

Add SessionRow, DeviceCodeCard and DeviceCodeInput for signed-in devices and TV activation. SessionRow keeps connection and panel timestamps distinct and suppresses sign out for the current browser. DeviceCodeInput presents eight cells while preserving one native text field, paste, keyboard selection and form semantics.

Extend ConnectPhoneCard with claimed, loading and error states and localized lifecycle announcements. Every inactive state removes the actual pairing QR from the DOM; expired codes no longer remain under a visual opacity mask. Existing live defaults and loopback refusal remain unchanged.
