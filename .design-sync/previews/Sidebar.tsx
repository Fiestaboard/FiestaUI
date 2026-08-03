import * as React from 'react';
import * as S from "@ds-stories/src/components/chrome/sidebar.stories";

// OWNED preview (was generated). Sidebar is a `layout: fullscreen` chrome
// component whose desktop rail is `position: fixed` with `lg:top-3 lg:bottom-3`.
// The design-sync single-mode card wraps stories in `.ds-single` (a transformed
// element = the containing block for fixed descendants). Because that wrapper is
// only as tall as its in-flow content, the fixed rail's top/bottom offsets
// collapse it to a ~40px sliver. Wrapping each story in a `min-height: 100vh`
// box gives `.ds-single` full viewport height so the rail resolves to full
// height — matching how the app (and the reference storybook) render it.
function compose(S: any, key: string) {
  const meta: any = S.default ?? {};
  const st: any = S[key];
  const args: any = { ...(meta.args ?? {}), ...(st && st.args ? st.args : {}) };
  const at: any = { ...(meta.argTypes ?? {}), ...(st && st.argTypes ? st.argTypes : {}) };
  for (const k of Object.keys(args)) {
    const m = at[k] && at[k].mapping;
    if (m && typeof m === 'object' && args[k] in m) args[k] = m[args[k]];
  }
  const title: string = typeof meta.title === 'string' ? meta.title : '';
  const ctx: any = {
    args, name: key, title, kind: title, id: '', componentId: '',
    globals: {}, viewMode: 'story',
    parameters: (st && st.parameters) ?? meta.parameters ?? {},
  };
  let render: (() => any) | null = null;
  if (st && typeof st.render === 'function') render = () => st.render(args, ctx);
  else if (typeof st === 'function') render = () => st(args, ctx);
  else if (typeof meta.render === 'function') render = () => meta.render(args, ctx);
  else {
    const C = (st && st.component) || meta.component;
    if (C) render = () => React.createElement(C, args);
  }
  if (!render) return () => null;
  const decorators: any[] = ([] as any[]).concat((st && st.decorators) ?? []).concat(meta.decorators ?? []);
  const composed = decorators.reduce((inner: any, dec: any) => () => {
    const out = dec(inner, ctx);
    return out === undefined ? inner() : out;
  }, render);
  // Full-viewport spacer so `.ds-single` (the fixed-rail containing block) is
  // tall enough for `lg:top-3 lg:bottom-3` to render the rail full height.
  return () => React.createElement(
    'div',
    { style: { minHeight: '100vh', width: '100%', position: 'relative' } },
    composed()
  );
}

export const Playground = compose(S, "Playground");
export const Default = compose(S, "Default");
export const Collapsed = compose(S, "Collapsed");
export const MultiBoard = compose(S, "MultiBoard");
export const SingleBoard = compose(S, "SingleBoard");
export const WithAiAssistant = compose(S, "WithAiAssistant");
export const AiActive = compose(S, "AiActive");
export const WithAccount = compose(S, "WithAccount");
export const Mobile = compose(S, "Mobile");
