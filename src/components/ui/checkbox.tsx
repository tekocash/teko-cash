// components/ui/checkbox.tsx
'use client';

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState(checked || false);

    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked);
      }
    }, [checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newCheckedState = e.target.checked;
      setIsChecked(newCheckedState);
      
      if (onCheckedChange) {
        onCheckedChange(newCheckedState);
      }
    };

    return (
      <div className="relative inline-block">
        <input
          type="checkbox"
          ref={ref}
          checked={isChecked}
          onChange={handleChange}
          className="absolute w-0 h-0 opacity-0"
          {...props}
        />
        <div 
          className={cn(
            "flex items-center justify-center w-5 h-5 rounded-md border",
            isChecked 
              ? "bg-blue-600 border-blue-600" 
              : "bg-white border-gray-300",
            "transition-colors duration-200",
            props.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            className
          )}
          onClick={() => {
            if (!props.disabled) {
              const newState = !isChecked;
              setIsChecked(newState);
              if (onCheckedChange) {
                onCheckedChange(newState);
              }
            }
          }}
        >
          {isChecked && (
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox };