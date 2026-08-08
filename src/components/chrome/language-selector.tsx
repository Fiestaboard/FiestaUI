"use client";

import { Globe } from "lucide-react";
import { memo } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export interface LanguageOption {
  value: string;
  label: string;
}

interface LanguageSelectorProps {
  /** Current locale value. */
  value: string;
  /** Available locales with display names, in menu order. */
  options: LanguageOption[];
  /** Called with the newly selected locale value. */
  onChange: (value: string) => void;
  /** Localized accessible label for the trigger, e.g. "Language". */
  label: string;
  disabled?: boolean;
}

/**
 * Controlled presentational language picker. Locale registry, cookie
 * persistence, and the i18next mutation stay in the app wrapper.
 */
export const LanguageSelector = memo(function LanguageSelector({
  value,
  options,
  onChange,
  label,
  disabled,
}: LanguageSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-8 w-[130px] text-xs gap-1" aria-label={label}>
        <Globe className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
