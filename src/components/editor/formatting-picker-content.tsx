/**
 * Formatting Picker Content - Formatting options for toolbar
 */
"use client";

import { ChevronRight, ChevronsLeftRight } from "lucide-react";
import React from "react";

import { AVAILABLE_COLORS, type BoardColorName, COLOR_DISPLAY } from "../../lib/board-colors";
import { cn } from "../../lib/utils";
import { Badge } from "../feedback/badge";
import { Button } from "../forms/button";
import { Input } from "../forms/input";
import { Box } from "../layout/box";
import { Flex } from "../layout/flex";
import { Grid } from "../layout/grid";
import { Stack } from "../layout/stack";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../overlays/tooltip";
import { Text } from "../typography/text";
import { FILL_SPACE_REPEAT_VAR } from "./constants";

interface FormattingOption {
  name: string;
  syntax: string;
  description?: string;
}

export interface FormattingPickerLabels {
  noFormattingAvailable: string;
  back: string;
  selectColor: string;
  orCustomPattern: string;
  use: string;
  /** Placeholder for the custom repeat-pattern field. Punctuation, but still on screen. */
  customPatternPlaceholder: string;
  /** Display name per board color, shown on and announced for each swatch. */
  colorNames: Record<BoardColorName, string>;
  /** Accessible name for one swatch, given its display name. */
  colorOptionLabel: (colorName: string) => string;
}

export const DEFAULT_FORMATTING_PICKER_LABELS: FormattingPickerLabels = {
  noFormattingAvailable: "No formatting options available",
  back: "← Back",
  selectColor: "Select color:",
  orCustomPattern: "Or custom pattern:",
  use: "Use",
  customPatternPlaceholder: "e.g. - or =-",
  colorNames: {
    red: "Red",
    orange: "Orange",
    yellow: "Yellow",
    green: "Green",
    blue: "Blue",
    violet: "Violet",
    white: "White",
    black: "Black",
  },
  colorOptionLabel: (colorName) => `${colorName} color`,
};

export interface FormattingPickerContentProps {
  /**
   * Formatting options keyed by name, as declared by the template engine.
   * Optional because the app's call site passes a possibly-absent
   * `templateVars?.formatting`; an empty map renders the "none available" copy.
   */
  formatting?: Record<string, { syntax: string; description?: string }>;
  onInsert: (syntax: string) => void;
  labels?: Partial<FormattingPickerLabels>;
}

export function FormattingPickerContent({ formatting = {}, onInsert, labels }: FormattingPickerContentProps) {
  const l = { ...DEFAULT_FORMATTING_PICKER_LABELS, ...labels };
  const [showRepeatColorPicker, setShowRepeatColorPicker] = React.useState(false);
  const [customChar, setCustomChar] = React.useState("");
  // The app left the custom-pattern field with no programmatic label at all —
  // its caption was a plain <p>. useId keeps the association without minting a
  // fixed DOM id that two mounted pickers would share.
  const customCharLabelId = React.useId();

  const options: FormattingOption[] = Object.entries(formatting).map(([name, info]) => ({
    name: name.replace(/_/g, " "),
    syntax: info.syntax,
    description: info.description,
  }));

  if (options.length === 0) {
    return (
      <Text tone="muted" className="p-3">
        {l.noFormattingAvailable}
      </Text>
    );
  }

  const handleOptionClick = (option: FormattingOption) => {
    // Check if this is fill_space_repeat - show color picker
    if (option.syntax.includes(FILL_SPACE_REPEAT_VAR)) {
      setShowRepeatColorPicker(true);
    } else {
      onInsert(option.syntax);
    }
  };

  const handleColorSelect = (colorName: string) => {
    onInsert(`{{${FILL_SPACE_REPEAT_VAR}:${colorName}}}`);
    setShowRepeatColorPicker(false);
    setCustomChar("");
  };

  const handleCustomCharSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customChar) {
      handleColorSelect(customChar); // Reuse the same handler
    }
  };

  // Show color + custom picker for fill_space_repeat
  if (showRepeatColorPicker) {
    return (
      <TooltipProvider>
        <Box className="p-2 min-w-[240px] max-w-[280px]">
          <button
            type="button"
            onClick={() => setShowRepeatColorPicker(false)}
            className="text-xs text-muted-foreground hover:text-foreground mb-2 flex items-center gap-1"
          >
            {l.back}
          </button>

          {/* Colors Section */}
          <Text size="xs" tone="muted" weight="medium" className="mb-2">
            {l.selectColor}
          </Text>

          <Grid cols="4" gap="2" className="mb-3">
            {AVAILABLE_COLORS.map((colorName) => (
              <Tooltip key={colorName}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleColorSelect(colorName)}
                    className={cn(
                      "h-10 rounded-md text-xs font-medium transition-all hover:scale-105 hover:shadow-md",
                      "flex items-center justify-center",
                      // Swatch fill and its checked foreground both come from
                      // lib/board-colors, the same pair BoardDisplay paints —
                      // see the note in color-picker-content.tsx.
                      COLOR_DISPLAY[colorName].bg,
                      COLOR_DISPLAY[colorName].text,
                    )}
                    aria-label={l.colorOptionLabel(l.colorNames[colorName])}
                  >
                    {l.colorNames[colorName]}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <Text>{l.colorNames[colorName]}</Text>
                </TooltipContent>
              </Tooltip>
            ))}
          </Grid>

          {/* Custom String */}
          <Box className="pt-2 border-t border-border">
            <Text size="xs" tone="muted" className="mb-1.5" id={customCharLabelId}>
              {l.orCustomPattern}
            </Text>
            <Box as="form" onSubmit={handleCustomCharSubmit} className="flex gap-1.5">
              <Input
                type="text"
                value={customChar}
                onChange={(e) => setCustomChar(e.target.value)}
                placeholder={l.customPatternPlaceholder}
                maxLength={10}
                aria-labelledby={customCharLabelId}
                className="flex-1 font-mono"
              />
              <Button type="submit" size="sm" disabled={!customChar}>
                {l.use}
              </Button>
            </Box>
          </Box>
        </Box>
      </TooltipProvider>
    );
  }

  // Show main formatting options
  return (
    <TooltipProvider>
      <Box className="p-1.5 min-w-[240px] max-w-[280px]">
        <Stack gap="0.5">
          {options.map((option) => {
            const isRepeat = option.syntax.includes(FILL_SPACE_REPEAT_VAR);

            return (
              <Tooltip key={option.syntax}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleOptionClick(option)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-md text-sm",
                      "hover:bg-accent hover:text-accent-foreground transition-colors",
                      "flex items-center justify-between gap-2 group",
                    )}
                  >
                    <Flex align="center" gap="2" className="flex-1 min-w-0">
                      <ChevronsLeftRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent-foreground flex-shrink-0" />
                      <Text
                        as="span"
                        weight="medium"
                        className="capitalize truncate group-hover:text-accent-foreground"
                      >
                        {option.name}
                      </Text>
                    </Flex>
                    {isRepeat ? (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent-foreground flex-shrink-0" />
                    ) : (
                      <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 flex-shrink-0">
                        {option.syntax}
                      </Badge>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <Text>{option.description ?? option.name}</Text>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </Stack>
      </Box>
    </TooltipProvider>
  );
}
