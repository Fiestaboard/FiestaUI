/**
 * The in-page half of the Figma parity harness (MASTER-PLAN §3.3). This function
 * is handed to Playwright's `page.evaluate`, which serialises its source. So it
 * must be self-contained: no imports, and no references to anything in module
 * scope. It runs in the browser, and those are the globals declared below.
 *
 * It lives in its own module, not in vrt.mjs, so scripts/vrt/tests/ can drive it
 * in a real Chromium against a hand-written page without a Storybook build.
 */

/* global CSS, document, getComputedStyle, DOMRect, NodeFilter */

/**
 * Measure the target root and every probe the manifest asks for. Rects are CSS
 * px relative to the root's border box. Colours are normalised to rgb()
 * through a canvas, so oklch()/color-mix() tokens compare as sRGB without a
 * colour library on the Node side.
 *
 * Token probes also carry a `binding`: the sentinel check (P2). Without it, a
 * hard-coded hex that happens to equal the token's value would pass probe 1.
 *
 * @param {{rootSelector: string, probes: object}} input
 */
export function measureInPage({ rootSelector, probes }) {
  const root = document.querySelector(rootSelector);
  if (!root) return { root: null };
  const origin = root.getBoundingClientRect();
  const pick = (selector) => (!selector || selector === ":scope" ? root : root.querySelector(selector));
  const rel = (r) => ({ x: r.x - origin.x, y: r.y - origin.y, width: r.width, height: r.height });
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const toRgb = (value) => {
    if (!/^(#|rgb|hsl|oklch|oklab|lab|lch|color)/.test(value)) return value;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 1000) / 1000})`;
  };
  // Visually hidden text (an sr-only label, a live-region announcer) is in
  // textContent and in a Range over the element, but not in the Figma frame.
  // Probes 2 and 3 read only the text a sighted user sees.
  const isVisuallyHidden = (node, boundary) => {
    for (let n = node.parentElement; n && n !== boundary.parentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return true;
      if (cs.clipPath === "inset(50%)" || /^rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)$/.test(cs.clip)) return true;
      const r = n.getBoundingClientRect();
      if (cs.position === "absolute" && r.width <= 1 && r.height <= 1) return true;
    }
    return false;
  };
  const visibleTextNodes = (target) => {
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    const out = [];
    while (walker.nextNode()) if (!isVisuallyHidden(walker.currentNode, target)) out.push(walker.currentNode);
    return out;
  };
  const visibleText = (target) =>
    visibleTextNodes(target)
      .map((t) => t.nodeValue)
      .join("");
  // A Figma text node's box is its line boxes (lines × line-height); a DOM
  // Range gives the glyph box, a few px shorter. Keep the Range's x/width and
  // the centre of each line, and stretch the height to the computed
  // line-height, so the two boxes mean the same thing.
  const textRect = (target) => {
    const rects = visibleTextNodes(target).flatMap((t) => {
      const range = document.createRange();
      range.selectNodeContents(t);
      return [...range.getClientRects()].filter((c) => c.width > 0 && c.height > 0);
    });
    if (rects.length === 0) return target.getBoundingClientRect();
    const left = Math.min(...rects.map((c) => c.left));
    const right = Math.max(...rects.map((c) => c.right));
    const r = new DOMRect(left, Math.min(...rects.map((c) => c.top)), right - left, 0);
    const lineHeight = parseFloat(getComputedStyle(target).lineHeight);
    if (!Number.isFinite(lineHeight)) {
      const bottom = Math.max(...rects.map((c) => c.bottom));
      return { x: r.x, y: r.y, width: r.width, height: bottom - r.y };
    }
    const lines = new Set(rects.map((c) => Math.round(c.top + c.height / 2))).size || 1;
    const first = rects[0];
    const top = first.top + first.height / 2 - lineHeight / 2;
    return { x: r.x, y: top, width: r.width, height: lineHeight * lines };
  };

  // --- probe 1 sentinel binding check (P2) ---------------------------------
  //
  // For each custom property the token expression uses, set a sentinel value
  // on <html> and on the element itself, both `!important`, so it beats the
  // theme's selectors and any redeclaration on the element. Then re-read the
  // computed style. A bound element follows the sentinel. A hard-coded value
  // does not move. "Follows" means it equals what the same expression
  // computes to under the sentinel, read from a hidden scratch child that
  // inherits the same custom properties. Everything is restored before
  // returning, inline values and priorities included, and the scratch is
  // removed. FREEZE_CSS turns transitions off, so each read is immediate.
  const SENTINEL = { color: "#010203", length: "3.17px", number: "0.731" };
  const sentinelFor = (current) => {
    const v = current.trim();
    if (v === "") return null;
    if (CSS.supports("color", v)) return SENTINEL.color;
    if (/^-?(\d+\.?\d*|\.\d+)$/.test(v)) return SENTINEL.number;
    if (CSS.supports("width", v)) return SENTINEL.length;
    return null;
  };
  const same = (a, b) => {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (/^-?[\d.]+px$/.test(a) && /^-?[\d.]+px$/.test(b)) return Math.abs(na - nb) <= 0.01;
    return a === b;
  };
  const checkBinding = (el, property, expr) => {
    const vars = expr ? [...new Set([...expr.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]))] : [];
    if (vars.length === 0) return { vars, follows: false, note: "no cssVar mapping to override" };
    const sentinels = {};
    for (const name of vars) {
      const s = sentinelFor(getComputedStyle(el).getPropertyValue(name));
      if (!s) return { vars, follows: false, note: `cannot pick a sentinel for ${name}` };
      sentinels[name] = s;
    }
    const targets = [document.documentElement, el];
    const saved = targets.map((t) => ({
      t,
      hadStyle: t.hasAttribute("style"),
      props: vars.map((name) => [name, t.style.getPropertyValue(name), t.style.getPropertyPriority(name)]),
    }));
    const scratch = document.createElement("div");
    scratch.setAttribute("aria-hidden", "true");
    scratch.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;";
    scratch.style.setProperty(property, expr);
    try {
      const before = toRgb(getComputedStyle(el).getPropertyValue(property));
      for (const t of targets) for (const name of vars) t.style.setProperty(name, sentinels[name], "important");
      el.appendChild(scratch);
      const after = toRgb(getComputedStyle(el).getPropertyValue(property));
      const expected = toRgb(getComputedStyle(scratch).getPropertyValue(property));
      // A sentinel that computes to the original value proves nothing.
      if (same(expected, before))
        return { vars, sentinels, before, after, expected, follows: false, note: "sentinel did not change the value" };
      return { vars, sentinels, before, after, expected, follows: same(after, expected) };
    } finally {
      scratch.remove();
      for (const { t, hadStyle, props } of saved) {
        for (const [name, value, priority] of props) {
          if (value) t.style.setProperty(name, value, priority);
          else t.style.removeProperty(name);
        }
        if (!hadStyle && t.getAttribute("style") === "") t.removeAttribute("style");
      }
    }
  };

  // Measure geometry, text and token values first, with the page untouched.
  // The binding check runs last, and it restores what it changes.
  const tokenProbes = probes.tokens ?? [];
  const tokens = tokenProbes.map(({ selector, property, variable }) => {
    const el = pick(selector);
    return {
      selector,
      property,
      variable,
      value: el ? toRgb(getComputedStyle(el).getPropertyValue(property)) : null,
    };
  });
  const result = {
    root: { x: 0, y: 0, width: origin.width, height: origin.height },
    rootPage: { x: origin.x, y: origin.y },
    geometry: (probes.geometry ?? []).map(({ node, selector, measure }) => {
      const el = pick(selector);
      return { node, rect: el ? rel(measure === "text" ? textRect(el) : el.getBoundingClientRect()) : null };
    }),
    text: (probes.text ?? []).map(({ node, selector, canonKey }) => {
      const el = pick(selector);
      return { node, canonKey, text: el ? visibleText(el) : null };
    }),
    tokens,
    board: probes.board
      ? {
          tiles: [...root.querySelectorAll(probes.board.tiles)].map((el) => {
            const r = el.getBoundingClientRect();
            return { width: r.width, height: r.height, color: el.getAttribute(probes.board.colorAttr) };
          }),
        }
      : null,
  };
  tokenProbes.forEach(({ selector, property, variable, cssVar }, i) => {
    const el = pick(selector);
    if (!el) return;
    const expr = cssVar ?? (/var\(\s*--/.test(variable) ? variable : null);
    tokens[i].cssVar = expr;
    tokens[i].binding = checkBinding(el, property, expr);
  });
  return result;
}
