// url=https://www.figma.com/design/ZQ8RMELCO6qEOFZUnQu36e?node-id=171-163203
// source=src/components/editor/inspector-row.tsx
// component=InspectorRow
// Local parserless template only. No mapping has been published to Figma.
import figma from "figma";

const instance = figma.selectedInstance;
const title = instance.getString("Title");
const detail = instance.getString("Detail");
const value = instance.getString("Value");
const showDetail = instance.getBoolean("Show detail");
const showValue = instance.getBoolean("Show value");
const chevron = instance.getBoolean("Chevron");

export default {
  example: figma.code`<InspectorRow
    title="${title}"
    ${showDetail ? figma.code`detail="${detail}"` : ""}
    ${showValue ? figma.code`value="${value}"` : ""}
    ${chevron ? "chevron" : ""}
    onPress={onOpenInspectorItem}
  />`,
  imports: ['import { InspectorRow } from "@fiestaboard/ui"'],
  id: "inspector-row",
  metadata: { nestable: true },
};
