// usage: node shots.mjs  (servers on 6201 base, 6202 shell, 6203 listrow, 6204 editor)
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
const OUT = "/Volumes/ExtHD/fiestaboard-universal-design/program/shots/bugbash/fix";
const PORT = { before: 6201, shell: 6202, listrow: 6203, editor: 6204 };
const W = [390, 900, 1440];
const THEMES = ["light", "dark"];
const frames = (p) => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const settle = async (p) => { await frames(p); await p.waitForTimeout(250); };
const HANDLE = '[data-slot="sidebar-collapse-handle"]';
const log = [];
async function tabTo(p, sel) {
  for (let i = 0; i < 60; i++) {
    await p.keyboard.press("Tab");
    if (await p.evaluate((s) => document.activeElement === document.querySelector(s), sel)) return true;
  }
  return false;
}
const specs = [
  // BB-FS-1
  ...["figma-rail", "figma-rail-collapsed", "rail-breakpoint-md"].flatMap((story) =>
    ["rest", "rail-hover", "kbd-focus", "touch"].map((state) => ({ bug: "BB-FS-1", after: "shell", id: `app-chrome-sidebar--${story}`, name: `${story}-${state}`, state }))),
  // BB-FK-4
  ...["rest", "tab-focus"].map((state) => ({ bug: "BB-FK-4", after: "shell", id: "app-chrome-sidebar--bottom-nav", name: `bottom-nav-${state}`, state })),
  // BB-FK-9
  { bug: "BB-FK-9", after: "listrow", id: "containment-listrow--inset-group", name: "inset-group-rest", state: "rest" },
  { bug: "BB-FK-9", after: "listrow", id: "containment-listrow--setup-row", name: "setup-row-rest", state: "rest", afterOnly: true },
  { bug: "BB-FK-9", after: "listrow", id: "containment-listrow--as-link", name: "as-link-hover", state: "row-hover" },
  { bug: "BB-FK-9", after: "listrow", id: "containment-listrow--as-link", name: "as-link-focus", state: "row-focus" },
  // BB-E-29 (and the toolbar of BB-E-28)
  { bug: "BB-E-29", after: "editor", id: "editor-templateeditortoolbarintegration--enlarged-text-popover", name: "colors-open", state: "picker-open" },
  { bug: "BB-E-29", after: "editor", id: "editor-templateeditortoolbarintegration--enlarged-text-popover", name: "colors-esc", state: "picker-esc" },
];
const b = await chromium.launch();
for (const s of specs) for (const side of ["before", "after"]) {
  if (side === "before" && s.afterOnly) continue;
  for (const w of W) for (const theme of THEMES) {
    const touch = s.state === "touch";
    const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, hasTouch: touch, isMobile: false });
    const p = await ctx.newPage();
    const port = side === "before" ? PORT.before : PORT[s.after];
    await p.goto(`http://localhost:${port}/iframe.html?globals=theme:${theme}&id=${s.id}&viewMode=story`);
    await p.waitForSelector("#storybook-root > *", { timeout: 15000 }).catch(() => {});
    await settle(p);
    let note = "";
    try {
      if (s.state === "rest") await p.mouse.move(w - 5, 5);
      if (s.state === "rail-hover") { const a = await p.locator("aside").first().boundingBox(); if (a && a.width) await p.mouse.move(a.x + a.width / 2, a.y + 300); else note = "no rail"; }
      if (s.state === "kbd-focus") { note = (await tabTo(p, HANDLE)) ? "" : "handle not reached"; }
      if (s.state === "touch") note = String(await p.evaluate(() => matchMedia("(hover: none)").matches) ? "hover:none" : "hover:hover");
      if (s.state === "tab-focus") { await tabTo(p, '[data-slot="sidebar-bottom-nav"] a'); }
      if (s.state === "row-hover") await p.locator('[data-slot="list-row"]').first().hover();
      if (s.state === "row-focus") await tabTo(p, '[data-slot="list-row"]');
      if (s.state.startsWith("picker")) {
        await p.getByRole("button", { name: "Colors" }).first().click();
        await settle(p);
        if (s.state === "picker-esc") { await p.keyboard.press("Escape"); await settle(p);
          note = await p.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()} ${a.getAttribute("aria-label") ?? a.textContent?.slice(0, 20)}` : "none"; }); }
      }
      await settle(p);
      const m = await p.evaluate((sel) => { const h = document.querySelector(sel); return h ? Number(getComputedStyle(h).opacity) : null; }, HANDLE);
      if (m !== null) note += ` handleOpacity=${m}`;
    } catch (e) { note += " ERR " + e.message.split("\n")[0]; }
    const dir = `${OUT}/${s.bug}`; mkdirSync(dir, { recursive: true });
    const file = `${dir}/${side}-${s.name}-${w}-${theme}.png`;
    await p.screenshot({ path: file });
    log.push(`${s.bug} ${side} ${s.name} ${w} ${theme}: ${note.trim()}`);
    await ctx.close();
  }
}
await b.close();
writeFileSync("/Volumes/ExtHD/workspace/fiestaui-wt/cl-bbfix-w3-shots/log.txt", log.join("\n") + "\n");
console.log(log.length, "shots");
