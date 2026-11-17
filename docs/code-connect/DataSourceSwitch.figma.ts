// url=https://www.figma.com/design/ZQ8RMELCO6qEOFZUnQu36e/FiestaBoard?node-id=109-3048
// source=../../src/components/forms/data-source-switch.tsx
// component=DataSourceSwitch
import figma from "figma";

const instance = figma.selectedInstance;
const source = instance.getEnum("Selected", { Live: "live", Sample: "sample", Missing: "missing" });
const live = instance.findInstance("Segment · Live").getString("Label");
const sample = instance.findInstance("Segment · Sample").getString("Label");
const missing = instance.findInstance("Segment · Missing").getString("Label");

// The Figma children have a Tabs skin, but the Core API takes radio options.
// Keep their configurable labels while mapping the semantic parent once.
export default {
  id: "data-source-switch",
  imports: ['import { DataSourceSwitch } from "@fiestaboard/ui"'],
  example: figma.code`<DataSourceSwitch
  aria-label="Preview data"
  defaultValue="${source}"
  options={[
    { value: "live", label: "${live}" },
    { value: "sample", label: "${sample}" },
    { value: "missing", label: "${missing}" },
  ]}
/>`,
};
