"use client";

import { AlertTriangle, Check, ChevronDown, CircleSlash, Hand, Octagon, Wrench } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../containment/collapsible";
import { Spinner } from "../feedback/spinner";

/**
 * Tool — one tool call the assistant made, as a collapsible card.
 *
 * The state vocabulary is "AI Elements"' four (`input-streaming`,
 * `input-available`, `output-available`, `output-error`) plus the three a
 * human-in-the-loop chat needs: `approval-requested` (the call waits on the
 * user), `denied` (the user said no), `stopped` (the user ended the turn
 * while it ran). The state is stamped as `data-state` on the root, next to
 * Base UI's own `data-open`, so consumers and VRT select on it.
 *
 * Every state has an icon AND a label: colour and glyph alone would fail
 * anyone who cannot see them, and the label is what the header announces.
 */

export type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error"
  | "approval-requested"
  | "denied"
  | "stopped";

export interface ToolLabels {
  states: Record<ToolState, string>;
  /** Heading of the arguments block. */
  input: string;
  /** Heading of the result block. */
  output: string;
}

export const DEFAULT_TOOL_LABELS: ToolLabels = {
  states: {
    "input-streaming": "Preparing",
    "input-available": "Running",
    "output-available": "Done",
    "output-error": "Failed",
    "approval-requested": "Waiting for your approval",
    denied: "Not run",
    stopped: "Stopped",
  },
  input: "Arguments",
  output: "Result",
};

interface ToolContextValue {
  state: ToolState;
  labels: ToolLabels;
}

const ToolContext = React.createContext<ToolContextValue>({ state: "input-available", labels: DEFAULT_TOOL_LABELS });

export interface ToolProps extends React.ComponentProps<typeof Collapsible> {
  state: ToolState;
  labels?: {
    states?: Partial<ToolLabels["states"]>;
    input?: string;
    output?: string;
  };
}

function Tool({ className, state, labels, defaultOpen, ...props }: ToolProps) {
  const l: ToolLabels = {
    ...DEFAULT_TOOL_LABELS,
    ...labels,
    states: { ...DEFAULT_TOOL_LABELS.states, ...labels?.states },
  };
  const value: ToolContextValue = { state, labels: l };
  return (
    <ToolContext.Provider value={value}>
      <Collapsible
        data-slot="tool"
        data-state={state}
        // Errors and approval requests open by default: those are the two
        // the user has to act on or read. A successful call stays folded.
        defaultOpen={defaultOpen ?? (state === "output-error" || state === "approval-requested")}
        className={cn("rounded-lg border bg-card text-card-foreground", className)}
        {...props}
      />
    </ToolContext.Provider>
  );
}

const STATE_ICONS: Record<ToolState, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  "input-streaming": Wrench,
  "input-available": Wrench,
  "output-available": Check,
  "output-error": AlertTriangle,
  "approval-requested": Hand,
  denied: CircleSlash,
  stopped: Octagon,
};

const STATE_TONES: Record<ToolState, string> = {
  "input-streaming": "text-muted-foreground",
  "input-available": "text-muted-foreground",
  "output-available": "text-success",
  "output-error": "text-destructive",
  "approval-requested": "text-hue-yellow",
  denied: "text-muted-foreground",
  stopped: "text-muted-foreground",
};

export interface ToolHeaderProps extends Omit<React.ComponentProps<typeof CollapsibleTrigger>, "children" | "title"> {
  /** What the call is, in the user's words: "Create page". */
  title: React.ReactNode;
  /** A short detail after the title: the page name, the setting changed. */
  detail?: React.ReactNode;
}

/**
 * The always-visible row: state glyph, title, state label, chevron. It is
 * the Collapsible's trigger, so the whole row is one button with
 * `aria-expanded`, named by its title and state.
 */
function ToolHeader({ className, title, detail, ...props }: ToolHeaderProps) {
  const { state, labels } = React.useContext(ToolContext);
  const Icon = STATE_ICONS[state];
  const running = state === "input-available" || state === "input-streaming";
  return (
    <CollapsibleTrigger
      data-slot="tool-header"
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm focus-ring",
        "hover:bg-accent/50 transition-[background-color] duration-control",
        className,
      )}
      {...props}
    >
      <span data-slot="tool-state-icon" aria-hidden="true" className={cn("inline-flex shrink-0", STATE_TONES[state])}>
        {running ? <Spinner size="sm" label={null} /> : <Icon className="size-4" />}
      </span>
      <span data-slot="tool-title" className="min-w-0 flex-1 truncate font-medium">
        {title}
        {detail ? <span className="ml-1.5 font-normal text-muted-foreground">{detail}</span> : null}
      </span>
      <span data-slot="tool-state-label" className={cn("shrink-0 text-xs", STATE_TONES[state])}>
        {labels.states[state]}
      </span>
      <ChevronDown
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-control group-data-[open]:rotate-180 [[data-open]_&]:rotate-180"
      />
    </CollapsibleTrigger>
  );
}

function ToolContent({ className, ...props }: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="tool-content"
      className={cn("flex flex-col gap-2 border-t px-3 py-2 text-sm", className)}
      {...props}
    />
  );
}

export interface ToolInputProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The call's arguments; rendered as pretty JSON. */
  input: unknown;
}

function ToolInput({ className, input, ...props }: ToolInputProps) {
  const { labels } = React.useContext(ToolContext);
  return (
    <div data-slot="tool-input" className={cn("flex flex-col gap-1", className)} {...props}>
      <span className="text-xs font-medium text-muted-foreground">{labels.input}</span>
      <pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs leading-relaxed">
        {JSON.stringify(input, null, 2)}
      </pre>
    </div>
  );
}

export interface ToolOutputProps extends Omit<React.ComponentProps<"div">, "children"> {
  /** The rendered result — a summary line, a board preview, a JSON tree. */
  output?: React.ReactNode;
  /** The failure text for `output-error`; rendered in the destructive tone. */
  errorText?: string;
}

function ToolOutput({ className, output, errorText, ...props }: ToolOutputProps) {
  const { labels } = React.useContext(ToolContext);
  if (output === undefined && !errorText) return null;
  return (
    <div data-slot="tool-output" className={cn("flex flex-col gap-1", className)} {...props}>
      <span className="text-xs font-medium text-muted-foreground">{labels.output}</span>
      {errorText ? (
        <p data-slot="tool-error" className="text-destructive">
          {errorText}
        </p>
      ) : (
        <div data-slot="tool-result">{output}</div>
      )}
    </div>
  );
}

export { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput };
