"use client";

/**
 * Injection channel for the five React NodeViews.
 *
 * WHY THIS EXISTS — node views are not rendered by a parent component. The
 * extensions instantiate them as `ReactNodeViewRenderer(XNodeView)`, so TipTap
 * decides the props and only ever passes `ReactNodeViewProps`. There is no call
 * site at which an app could hand a node view its `labels`, which is a problem
 * for a package with no i18n library: every string in a node view would be
 * permanently English.
 *
 * React context is the one channel that reaches them. TipTap renders React node
 * views through portals anchored in the tree of the component that owns the
 * editor, so a provider wrapping `<EditorContent>` is an ancestor of every node
 * view — the same mechanism that makes `useCurrentEditor()` work inside one.
 *
 * Every node view still takes its own optional `labels` prop and still defaults
 * to English, so this is purely additive:
 *
 *     explicit `labels` prop  >  provider value  >  English defaults
 *
 * The prop is what a story or a unit test uses (it needs no provider); the
 * provider is what the editor component uses to push app translations down to
 * nodes it never renders itself.
 */

import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { ColorTileNodeViewLabels } from "./color-tile-node-view";
import type { FillSpaceNodeViewLabels } from "./fill-space-node-view";
import type { FormulaEditorSlotContext, FormulaNodeViewLabels } from "./formula-node-view";
import type { VariableNodeViewLabels } from "./variable-node-view";
import type { WrappedTextViewLabels } from "./wrapped-text-view";

/**
 * Every node-view label in one flat bag. The keys are unique across the five
 * components and match the FiestaBoard app's translation keys 1:1, so the app
 * can map its message catalog across mechanically.
 */
export interface NodeViewLabels
  extends
    ColorTileNodeViewLabels,
    FillSpaceNodeViewLabels,
    FormulaNodeViewLabels,
    VariableNodeViewLabels,
    WrappedTextViewLabels {}

export interface NodeViewInjection {
  labels?: Partial<NodeViewLabels>;
  /**
   * Renders the formula editor shown when a formula pill is clicked. Supplied
   * by the app so the panel arrives with its data props (formula functions,
   * template variables) already resolved — the node view cannot fetch and must
   * not decide what the panel needs. Omitted, the node view falls back to the
   * lazily-imported `FormulaEditorPanel`.
   */
  renderFormulaEditor?: (ctx: FormulaEditorSlotContext) => ReactNode;
}

/** Frozen and module-level so a missing provider never churns consumers. */
const EMPTY: NodeViewInjection = Object.freeze({});

const NodeViewInjectionContext = createContext<NodeViewInjection>(EMPTY);

export interface NodeViewInjectionProviderProps extends NodeViewInjection {
  children?: ReactNode;
}

/**
 * Wrap `<EditorContent>` with this to push labels and slots into node views.
 * Rendering it is optional: without it every node view uses English defaults.
 */
export function NodeViewInjectionProvider({ labels, renderFormulaEditor, children }: NodeViewInjectionProviderProps) {
  const value = useMemo(() => ({ labels, renderFormulaEditor }), [labels, renderFormulaEditor]);
  return <NodeViewInjectionContext.Provider value={value}>{children}</NodeViewInjectionContext.Provider>;
}

/** Reads the injected labels/slots. Returns an empty bag when unprovided. */
export function useNodeViewInjection(): NodeViewInjection {
  return useContext(NodeViewInjectionContext);
}
