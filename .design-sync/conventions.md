## Building with FiestaUI

FiestaUI is the FiestaBoard design system: React components on Base UI, styled with **Tailwind v4 semantic design tokens**. Components are on `window.FiestaUI.*` (e.g. `window.FiestaUI.Button`). Every component's API and examples live in its `.prompt.md`; read those before composing.

### Theme setup — required

There is **no `<ThemeProvider>`**. The theme is a **class on the document root** plus tokens:

- Put **`class="dark"` on a root element** (the `<html>` or a top-level wrapper). Dark is FiestaBoard's default and every preview in this library was built dark. Without it, components render in the light palette.
- Paint your app surface with the token classes: wrap content in **`bg-background text-foreground`**. Backgrounds/text inside components come from tokens, but your own page chrome needs this or it sits on the browser default.

```jsx
// Minimal correct shell
<div className="dark">
  <div className="min-h-screen bg-background text-foreground">
    <FiestaUI.Button variant="brand">Get started</FiestaUI.Button>
  </div>
</div>
```

### Styling idiom — Tailwind utilities over **semantic tokens**

Style with Tailwind utility classes built on the DS's token vocabulary, **not** raw hex or ad-hoc palettes. The token families (use as `bg-*` / `text-*` / `border-*` / `ring-*`):

| Token | Use |
|---|---|
| `background` / `foreground` | app surface + default text |
| `card` / `card-foreground` | raised card surfaces |
| `popover` / `popover-foreground` | menus, dialogs, tooltips |
| `primary` / `primary-foreground` | primary actions (a warm orange) |
| `brand` / `brand-foreground` / `brand-emphasis` | FiestaBoard brand accents |
| `secondary` / `muted` / `muted-foreground` / `accent` | secondary surfaces + subdued text |
| `destructive` | destructive actions (coral/red) |
| `success` / `warning` / `info` | status (Alert/Badge variants) |
| `border` / `input` / `ring` | borders, field borders, focus rings |
| `sidebar-*` / `nav-active` | app chrome (Sidebar) |

Radius: `rounded-sm|md|lg|xl|2xl` (base `--radius` 0.625rem). Fonts: **`font-sans`** = Geist, **`font-mono`** = Geist Mono (already the defaults; use `font-mono` for code/board text).

**Important — the shipped stylesheet is static (no Tailwind JIT at runtime).** Only utility classes already used by this DS are compiled into it. So: compose from the **library components** first, use the **layout primitives** (`Box`, `Flex`, `Grid`, `Stack`) for structure, and prefer the semantic token classes above for your own glue. A novel arbitrary utility (e.g. an unusual `bg-…` or exotic value) may have no compiled rule and render unstyled.

### Where the truth lives

- `styles.css` → `@import`s `fonts/fonts.css` and `_ds_bundle.css` (the compiled token + component styles). Read it to see exactly which tokens and classes resolve.
- Each component's `.prompt.md` (props, variants, composition) and `.d.ts` (types) — the authority on that component's API.

### Idiomatic example

```jsx
const { Card, Heading, Text, Button, Badge, Stack } = window.FiestaUI;

<div className="dark">
  <main className="min-h-screen bg-background text-foreground p-8">
    <Stack gap="6" className="max-w-md">
      <Card>
        <Stack gap="2">
          <Badge variant="success">Live</Badge>
          <Heading level={2}>Living Room board</Heading>
          <Text tone="muted">Decide what your board shows and when.</Text>
          <Button variant="brand">Edit schedule</Button>
        </Stack>
      </Card>
    </Stack>
  </main>
</div>
```
