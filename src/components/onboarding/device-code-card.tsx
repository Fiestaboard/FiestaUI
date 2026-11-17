import * as React from "react";

import { cn } from "../../lib/utils";
import { FiestaLogo } from "../chrome/fiesta-logo";
import { Card } from "../containment/card";

export interface DeviceCodeCardProps extends Omit<React.ComponentProps<"div">, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Header identity; defaults to the shared FiestaBoard wordmark. */
  brand?: React.ReactNode;
  /** Localized signed-in account and hub. Authentication belongs to the host. */
  account?: React.ReactNode;
  headingLevel?: 1 | 2 | 3 | 4;
  /** Host-owned controls. Primary comes first on phones and in reading order. */
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Activation card for code entry, approval and terminal results (07e 327:*).
 * A content surface only: no backdrop, route, authentication or native chrome.
 * At 440px it uses 32px inset; the 358px phone card uses 24px. Hosts supply
 * localized state content and actions, including disabled/busy behavior.
 */
function DeviceCodeCard({
  title,
  description,
  brand = <FiestaLogo size="sm" />,
  account,
  headingLevel = 1,
  children,
  primaryAction,
  secondaryAction,
  footer,
  className,
  ...props
}: DeviceCodeCardProps) {
  const id = React.useId();
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3" | "h4";
  return (
    <Card
      role="region"
      aria-labelledby={`${id}-title`}
      aria-describedby={description != null ? `${id}-description` : undefined}
      {...props}
      data-slot="device-code-card"
      className={cn("@container/device-code w-full max-w-[440px] gap-4 p-6 sm:p-8", className)}
    >
      <div
        data-slot="device-code-header"
        className="flex min-h-25 min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-2"
      >
        {brand}
        {account != null && <div className="min-w-0 break-words text-xs text-muted-foreground">{account}</div>}
      </div>
      <div className="flex flex-col gap-1">
        <Heading id={`${id}-title`} className="text-xl leading-tight font-semibold tracking-tight break-words">
          {title}
        </Heading>
        {description != null && (
          <div id={`${id}-description`} className="text-sm break-words text-muted-foreground">
            {description}
          </div>
        )}
      </div>
      {children}
      {(primaryAction != null || secondaryAction != null) && (
        <div
          data-slot="device-code-actions"
          className="flex flex-col gap-4 @min-[22rem]/device-code:flex-row-reverse @min-[22rem]/device-code:gap-2 [&>*]:min-h-11 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:whitespace-normal"
        >
          {primaryAction}
          {secondaryAction}
        </div>
      )}
      {footer != null && (
        <div data-slot="device-code-footer" className="text-xs break-words text-muted-foreground">
          {footer}
        </div>
      )}
    </Card>
  );
}

export { DeviceCodeCard };
