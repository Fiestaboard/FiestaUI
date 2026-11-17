// url=https://www.figma.com/design/ZQ8RMELCO6qEOFZUnQu36e?node-id=109-3016
// source=src/components/editor/formula-atom.tsx
// component=FormulaAtom
// Local-only mapping. Do not publish or mutate the Figma file.
// Error instances must supply their actual error tag in Value (DD-W103).
import figma from "figma";

const instance = figma.selectedInstance;
const source = instance.getString("Source");
const value = instance.getString("Value");
const kind = instance.getEnum("Kind", { Formula: "formula", Variable: "variable" });
const state = instance.getEnum("State", { OK: "ok", Error: "error", Fallback: "fallback" });

export default {
  example: figma.code`<FormulaAtom kind="${kind}" state="${state}" source="${source}" value="${value}" />`,
  imports: ['import { FormulaAtom } from "@fiestaboard/ui"'],
  id: "formula-atom",
  metadata: { nestable: true },
};
