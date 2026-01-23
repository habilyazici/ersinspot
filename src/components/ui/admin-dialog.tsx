"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog@1.1.6";
import { XIcon } from "lucide-react@0.487.0";

import { cn } from "./utils";

function AdminDialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="admin-dialog" {...props} />;
}

function AdminDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="admin-dialog-trigger" {...props} />;
}

function AdminDialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="admin-dialog-portal" {...props} />;
}

function AdminDialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="admin-dialog-close" {...props} />;
}

const AdminDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-slot="admin-dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/15 backdrop-blur-[0.5px]",
        className,
      )}
      {...props}
    />
  );
});
AdminDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

function AdminDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <AdminDialogPortal data-slot="admin-dialog-portal">
      <AdminDialogOverlay />
      <DialogPrimitive.Content
        data-slot="admin-dialog-content"
        className={cn(
          "bg-white data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border-2 border-[#1e3a8a]/20 p-6 shadow-2xl duration-200 sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 rounded-full p-2 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 transition-all duration-200 z-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2">
          <XIcon className="w-5 h-5" />
          <span className="sr-only">Kapat</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </AdminDialogPortal>
  );
}

function AdminDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="admin-dialog-header"
      className={cn("flex flex-col gap-2 text-left pb-4 border-b border-gray-200", className)}
      {...props}
    />
  );
}

function AdminDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="admin-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-4 border-t border-gray-200",
        className,
      )}
      {...props}
    />
  );
}

function AdminDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="admin-dialog-title"
      className={cn("text-xl leading-none font-bold text-gray-900", className)}
      {...props}
    />
  );
}

function AdminDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="admin-dialog-description"
      className={cn("text-gray-600 text-sm mt-2", className)}
      {...props}
    />
  );
}

export {
  AdminDialog,
  AdminDialogClose,
  AdminDialogContent,
  AdminDialogDescription,
  AdminDialogFooter,
  AdminDialogHeader,
  AdminDialogOverlay,
  AdminDialogPortal,
  AdminDialogTitle,
  AdminDialogTrigger,
};