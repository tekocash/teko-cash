// components/ui/use-toast.tsx
import React, { createContext, useContext, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

// Tipos para el toast
export type ToastProps = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
  duration?: number;
};

export type ToastActionElement = React.ReactElement;

export type Toast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
};

// Contexto del toast
type ToastContextType = {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Provider del toast
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prevToasts) => [...prevToasts, { ...toast, id }]);

    // Auto-eliminar el toast después de 5 segundos por defecto
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

// Hook para usar el toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  const { addToast } = context;

  const toast = (options: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
    action?: ToastActionElement;
  }) => {
    addToast({
      title: options.title,
      description: options.description,
      variant: options.variant,
      action: options.action,
    });
  };

  return { toast };
}

// Componente Toaster (muestra todos los toasts)
export function Toaster() {
  const context = useContext(ToastContext);
  if (!context) return null;

  const { toasts, removeToast } = context;

  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col items-end p-4 space-y-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-start p-4 rounded-md shadow-md",
            "bg-white dark:bg-gray-800 border",
            toast.variant === "destructive"
              ? "border-red-500 dark:border-red-700"
              : "border-gray-200 dark:border-gray-700"
          )}
        >
          <div className="flex-1">
            {toast.title && (
              <div
                className={cn(
                  "font-semibold",
                  toast.variant === "destructive"
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-900 dark:text-gray-100"
                )}
              >
                {toast.title}
              </div>
            )}
            {toast.description && (
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {toast.description}
              </div>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
