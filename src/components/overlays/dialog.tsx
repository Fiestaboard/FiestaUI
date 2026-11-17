"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import * as React from "react";

import { cn } from "../../lib/utils";
import { OverlayClose } from "./overlay-close";

const Dialog = DialogPrimitive.Root;

function DialogTrigger({
  asChild = false,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger> & { asChild?: boolean }) {
  return (
    <DialogPrimitive.Trigger
      data-slot="dialog-trigger"
      {...(asChild ? { render: React.Children.only(children) as React.ReactElement } : { children })}
      {...props}
    />
  );
}

const DialogPortal = DialogPrimitive.Portal;

function DialogClose({
  asChild = false,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close> & { asChild?: boolean }) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      {...(asChild ? { render: React.Children.only(children) as React.ReactElement } : { children })}
      {...props}
    />
  );
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-[var(--z-modal)] bg-overlay data-[open]:animate-in data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

export interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Popup> {
  /** `wide`: the 560px shared flow shell (07a), with popover surface and 14px corners. */
  variant?: "default" | "wide";
  /** Localized name of the built-in close control. */
  labels?: { close?: string };
}

function DialogContent({ className, children, variant = "default", labels, ...props }: DialogContentProps) {
  const wide = variant === "wide";
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-variant={variant}
        className={cn(
          "fixed left-[50%] top-[50%] z-[var(--z-modal)] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-modal duration-base data-[open]:animate-in data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[open]:fade-in-0 data-[ending-style]:zoom-out-95 data-[open]:zoom-in-95 data-[ending-style]:slide-out-to-left-1/2 data-[ending-style]:slide-out-to-top-[48%] data-[open]:slide-in-from-left-1/2 data-[open]:slide-in-from-top-[48%] sm:rounded-lg",
          "group/dialog",
          wide &&
            "w-[calc(100%-2rem)] max-w-[35rem] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[var(--radius-chrome)] bg-popover text-popover-foreground sm:rounded-[var(--radius-chrome)]",
          className,
        )}
        {...props}
      >
        {children}
        {/* 32px chip: the same OverlayClose design as Sheet, one step down for
            the denser dialog header. Still clears the 24x24 target minimum. */}
        <OverlayClose
          data-slot="dialog-close"
          size={wide ? "md" : "sm"}
          label={labels?.close}
          className={wide ? "before:absolute before:-inset-0.5 before:rounded-full" : undefined}
        />
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left group-data-[variant=wide]/dialog:pr-12 group-data-[variant=wide]/dialog:text-left",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 group-data-[variant=wide]/dialog:flex-col group-data-[variant=wide]/dialog:gap-2 sm:group-data-[variant=wide]/dialog:flex-row sm:group-data-[variant=wide]/dialog:justify-start sm:group-data-[variant=wide]/dialog:space-x-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-lg font-semibold leading-none tracking-tight group-data-[variant=wide]/dialog:text-xl group-data-[variant=wide]/dialog:leading-7",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
