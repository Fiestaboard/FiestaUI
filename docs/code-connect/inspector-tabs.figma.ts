// url=https://figma.com/design/ZQ8RMELCO6qEOFZUnQu36e?node-id=171-163147
// source=src/components/containment/inspector-tabs.tsx
// component=InspectorTabs
// Local mapping only; Figma is read-only for this slice.
import figma from "figma";

const instance = figma.selectedInstance;
const selected = instance.getEnum("Selected", {
  Data: "data",
  Logic: "logic",
  Page: "page",
  "Shows on": "shows-on",
  Problems: "problems",
  History: "history",
});
// Platform only identifies the label layer; it deliberately emits no Core prop.
const platform = instance.getEnum("Platform", { iOS: "ios", Android: "android" });
function label(name: string) {
  const text =
    platform === "ios"
      ? instance.findText("Label", { path: [`Segment · ${name}`], traverseInstances: true })
      : instance.findText(name);
  return text.type === "TEXT" ? text.textContent : "";
}
const data = label("Data");
const logic = label("Logic");
const page = label("Page");
const showsOn = label("Shows on");
const problems = label("Problems");
const history = label("History");

export default {
  example: figma.code`<InspectorTabs aria-label="Inspector" defaultValue="${selected}" size="touch" tabs={[
    { value: "data", label: "${data}" },
    { value: "logic", label: "${logic}" },
    { value: "page", label: "${page}" },
    { value: "shows-on", label: "${showsOn}" },
    { value: "problems", label: "${problems}" },
    { value: "history", label: "${history}" }
  ]} />`,
  imports: ['import { InspectorTabs, InspectorTabsContent } from "@fiestaboard/ui"'],
  id: "inspector-tabs",
  metadata: { nestable: true },
};
