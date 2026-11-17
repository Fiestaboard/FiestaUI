// url=https://www.figma.com/design/ZQ8RMELCO6qEOFZUnQu36e/FiestaBoard?node-id=171-163202
// source=src/components/editor/preview-status.tsx
// component=PreviewStatus
// Parserless Code Connect template; evaluated by Figma, not the package build.
import figma from "figma";

const instance = figma.selectedInstance;
const display = instance.getEnum("Display", {
  Live: "live",
  Scheduled: "scheduled",
  "Not scheduled": "not-scheduled",
});
const message = instance.getString("Message");
const showEditState = instance.getBoolean("Show edit state");
const editLabel = instance.getString("Edit state");
const editState =
  editLabel === "Unsaved"
    ? "unsaved"
    : editLabel === "Testing"
      ? "testing"
      : editLabel.startsWith("Saved")
        ? "saved"
        : "draft";
const problems = instance.getString("Problems");
const problemsLabel = problems.replace(/\s*[›↓]\s*$/, "");
const count = Number.parseInt(problems, 10);
const problemCount = Number.isFinite(count) ? Math.max(0, count) : 0;

// Platform is intentionally unmapped: Core has one semantic component.
// The host provides openProblems and localizes count-aware labels at runtime.
export default {
  example: figma.code`<PreviewStatus
    display="${display}"
    message="${message}"
    ${showEditState ? figma.code`editState="${editState}" editStateLabel="${editLabel}"` : ""}
    problems={${problemCount}}
    problemsLabel={() => "${problemsLabel}"}
    onOpenProblems={openProblems}
    size="touch"
  />`,
  imports: ['import { PreviewStatus } from "@fiestaboard/ui"'],
  id: "preview-status",
  metadata: { nestable: true },
};
