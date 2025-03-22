// components/ui/tabs.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

// Tipos
export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

// Contexto de Tabs
type TabsContextType = {
  selectedValue: string;
  onChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

// Hook para usar el contexto de Tabs
function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within a Tabs component");
  }
  return context;
}

// Componente Tabs
export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ defaultValue, value, onValueChange, className, children, ...props }, ref) => {
    // Estado interno si no se proporcionan props controlados
    const [selectedValue, setSelectedValue] = React.useState(defaultValue || "");

    // Usar valor controlado si se proporciona
    const actualValue = value !== undefined ? value : selectedValue;

    // Función para cambiar el valor
    const handleValueChange = React.useCallback((newValue: string) => {
      // Si no es controlado, actualizar el estado interno
      if (value === undefined) {
        setSelectedValue(newValue);
      }
      
      // Notificar el cambio al padre si se proporciona onValueChange
      if (onValueChange) {
        onValueChange(newValue);
      }
    }, [value, onValueChange]);

    return (
      <TabsContext.Provider value={{ selectedValue: actualValue, onChange: handleValueChange }}>
        <div ref={ref} className={cn("", className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);

Tabs.displayName = "Tabs";

// Componente TabsList
export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-gray-100 p-1 dark:bg-gray-800",
          className
        )}
        {...props}
      />
    );
  }
);

TabsList.displayName = "TabsList";

// Componente TabsTrigger
export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, ...props }, ref) => {
    const { selectedValue, onChange } = useTabsContext();
    const isSelected = selectedValue === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isSelected}
        data-selected={isSelected ? "" : undefined}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          isSelected
            ? "bg-white text-blue-600 shadow-sm dark:bg-gray-700 dark:text-blue-300"
            : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
          className
        )}
        onClick={() => onChange(value)}
        {...props}
      />
    );
  }
);

TabsTrigger.displayName = "TabsTrigger";

// Componente TabsContent
export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const { selectedValue } = useTabsContext();
    const isSelected = selectedValue === value;

    if (!isSelected) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn("mt-2", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsContent.displayName = "TabsContent";