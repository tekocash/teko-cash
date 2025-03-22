import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {}

const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
  ({ className, ...props }, ref) => {
    return (
      <hr
        ref={ref}
        className={cn("my-4 border-t", className)}
        {...props}
      />
    );
  }
);
Separator.displayName = "Separator";

export { Separator };
