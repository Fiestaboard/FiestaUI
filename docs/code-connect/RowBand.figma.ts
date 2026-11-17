// url=https://www.figma.com/design/ZQ8RMELCO6qEOFZUnQu36e?node-id=108-7323
// source=../../src/components/editor/row-band.tsx
// component=RowBand
import figma from "figma";
const instance = figma.selectedInstance;
const label = instance.getString("Label");
const meta = instance.getString("Meta");
const selected = instance.getEnum("State", { Default: false, Selected: true });

export default {
  example: figma.code`<RowBand label=${label} rows={[3, 10]} meta=${meta} selected=${selected} />`,
  imports: ['import { RowBand } from "@fiestaboard/ui";'],
  id: "row-band",
};
