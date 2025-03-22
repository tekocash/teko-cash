// components/ui/switch.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, onCheckedChange, checked, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked;
      
      // Llamar a onCheckedChange si existe
      if (onCheckedChange) {
        onCheckedChange(isChecked);
      }
      
      // También manejar el onChange normal si existe
      if (props.onChange) {
        props.onChange(e);
      }
    };

    return (
      <div className={cn("relative inline-flex h-6 w-11 items-center rounded-full", className)}>
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={handleChange}
          ref={ref}
          {...props}
        />
        <span
          className={cn(
            "absolute left-0 right-0 top-0 bottom-0 cursor-pointer rounded-full bg-gray-300 transition-colors",
            "peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300"
          )}
        />
        <span
          className={cn(
            "absolute left-1 bottom-1 h-4 w-4 rounded-full bg-white transition-transform",
            "peer-checked:translate-x-5"
          )}
        />
      </div>
    );
  }
);

Switch.displayName = "Switch";

export { Switch };