# AI group — conventions

The chat/agent surfaces: the transcript, the composer, tool cards, the
observed step timeline, suggestion chips, and the spotlight parts an app uses
to show the assistant working on a screen. The vocabulary follows Vercel's
shadcn "AI Elements" (Conversation / Message / PromptInput / Tool / Task /
Suggestion / Actions / Loader) so an app written against that API reads the
same here; the implementation is FiestaUI's own primitives on Base UI.

Follow the editor group's conventions (`../editor/CONVENTIONS.md`) exactly —
this file only records what is specific to this group.

## Files

```
src/components/ai/
  conversation.tsx   Conversation, ConversationContent, ConversationScrollButton
  message.tsx        Message, MessageContent, MessageAvatar
  prompt-input.tsx   PromptInput, PromptInputTextarea, PromptInputToolbar,
                     PromptInputTools, PromptInputSubmit
  tool.tsx           Tool, ToolHeader, ToolContent, ToolInput, ToolOutput
  task.tsx           Task, TaskTrigger, TaskContent, TaskItem
  suggestion.tsx     Suggestions, Suggestion
  actions.tsx        Actions, Action
  loader.tsx         Loader
  shimmer.tsx        Shimmer
  spotlight.tsx      SpotlightRing, SpotlightCaption, GhostValue
```

Kebab-case files, PascalCase exports, `"use client"` on every `.tsx`, no
per-group barrel. Every rendered element carries a `data-slot`; states that
consumers style or select on are stamped as `data-*` next to it
(`data-from`, `data-state`, `data-status`, `data-tone`).

## What the group does NOT own

- **No transport.** Nothing here fetches, streams or parses SSE. The app
  owns the stream (`use-ai-chat.ts` in FiestaBoard) and maps its events onto
  these props: `PromptInput status`, `Tool state`, `TaskItem status`.
- **No markdown.** `MessageContent` takes children; the app's own markdown
  renderer goes inside it. A markdown dependency would land in every
  consumer's bundle whether they chat or not.
- **No positioning.** `SpotlightRing` / `SpotlightCaption` / `GhostValue` are
  `absolute` boxes the app places with an inline `style` it measured. The
  package does not know the app's DOM, routes or anchors.
- **No copy.** Every user-visible string is a `labels?: Partial<XLabels>`
  prop with an English default (`DEFAULT_X_LABELS`), merged as
  `const l = { ...DEFAULT_X_LABELS, ...labels }`. Tool and Task state names
  are label maps so an app can translate all of them at once.

## Accessibility decisions

- The transcript viewport is `role="log"` with `aria-live="polite"` and
  `aria-relevant="additions text"`, named by `labels.conversation`. Anything
  that must be announced exactly once (a step timeline) goes OUTSIDE it.
  It is a tab stop (a scrollable region must be keyboard operable) whose
  focus ring is drawn on the root, as ScrollArea does, because an outset
  ring on an overflow container is clipped away.
- Decorative marks — `MessageAvatar` by default, every state glyph, the
  spotlight ring, the ghost value — are `aria-hidden`; the text beside them
  carries the meaning. `MessageAvatar decorative={false}` hands the
  semantics back when the avatar is the only thing naming the speaker.
- `ToolHeader` and `TaskTrigger` are the Collapsible trigger, so each card
  is one button with `aria-expanded`, named by its title and state label.
- `PromptInputSubmit` while streaming is a `type="button"` Stop, so a click
  can never submit the form it sits in. Enter sends; Shift+Enter is a
  newline; an Enter that commits an IME candidate never sends.
- Motion: `Loader` inherits Spinner's static reduced-motion ring;
  `.ai-shimmer`, `.ai-spotlight-pulse` and `.ai-caret` each declare a static
  reduced-motion pose in `theme.css` (and under the app's `.reduce-motion`
  class) — an infinite sweep or pulse is WCAG 2.2.2 territory, and the
  global 1ms backstop alone would freeze them mid-frame.

## Stories and tests

- Stories are titled `AI/<Component>`; the `AI` namespace is registered in
  `.storybook/preview.tsx`. Demo wrappers are sized `w-full sm:w-[Npx]` so
  the mobile VRT shot does not overflow. Nothing time-based: state is
  passed in, never advanced by a timer, so every shot is deterministic.
- Tests are colocated and assert the observable contract only — roles,
  names, ARIA state, keyboard, `data-*` — never class strings.
