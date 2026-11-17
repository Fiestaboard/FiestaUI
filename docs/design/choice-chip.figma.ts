// url=https://www.figma.com/design/ZQ8RMELCO6qEOFZUnQu36e?node-id=142-21738
// source=src/components/forms/choice-chip.tsx
// component=ChoiceChip
import figma from "figma";

const instance = figma.selectedInstance;
const label = instance.getString("Label");
const selected = instance.getEnum("State", { Off: false, On: true });

export default {
  example: figma.code`<ChoiceChip label="${label}" size="touch" selected={${selected}} onSelectedChange={setSelected} />`,
  imports: ['import { ChoiceChip } from "@fiestaboard/ui"'],
  id: "forms-choice-chip",
  metadata: { nestable: true },
};
