// components/ui/alert-dialog.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Estado global del diálogo usando context API
const AlertDialogContext = React.createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  open: false,
  setOpen: () => {},
});

export function AlertDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({
  children,
  asChild = false,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { setOpen } = React.useContext(AlertDialogContext);

  // Si asChild es true y children es un elemento React válido
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(true);
        // Mantener el onClick original si existe
        if (children.props.onClick) {
          children.props.onClick(e);
        }
      },
    });
  }

  // Caso por defecto
  return (
    <span onClick={() => setOpen(true)} style={{ cursor: 'pointer', display: 'inline-block' }}>
      {children}
    </span>
  );
}

export function AlertDialogContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen } = React.useContext(AlertDialogContext);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className={cn(
          "bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md",
          className
        )}
        {...props}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          onClick={() => setOpen(false)}
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 text-center", className)} {...props}>
      {children}
    </div>
  );
}

export function AlertDialogFooter({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-6 flex justify-end space-x-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertDialogTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold", className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function AlertDialogDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm text-gray-500 dark:text-gray-400", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function AlertDialogAction({
  children,
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(AlertDialogContext);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(false);
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Button
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Button>
  );
}

export function AlertDialogCancel({
  children,
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(AlertDialogContext);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(false);
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Button
      variant="outline"
      className={cn("text-gray-500", className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Button>
  );
}