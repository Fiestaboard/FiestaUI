// url=https://www.figma.com/design/ZQ8RMELCO6qEOFZUnQu36e/FiestaBoard?node-id=109-3066
// source=../../src/components/editor/trace-step.tsx
// component=TraceStep
import figma from "figma";

const instance = figma.selectedInstance;
const state = instance.getEnum("State", { OK: "ok", Error: "error", Skipped: "skipped" });
const expression = instance.getString("Expression");
const value = instance.getString("Value");
export default {
  id: "trace-step",
  imports: ['import { TraceStep } from "@fiestaboard/ui"'],
  example: figma.code`<TraceStep state="${state}" expression="${expression}" value="${value}" />`,
};
