import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("rounded-lg border bg-white shadow", className)} {...props} />
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
      return (
        <div ref={ref} className={cn("flex flex-col space-y-1 p-4 border-b", className)} {...props} />
      );
    }
  );
  CardHeader.displayName = "CardHeader";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("p-4", className)} {...props} />
    );
  }
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
      return (
        <div ref={ref} className={cn("flex items-center p-4 border-t", className)} {...props} />
      );
    }
  );
  CardFooter.displayName = "CardFooter";

  export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

  const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
    ({ className, ...props }, ref) => {
      return (
        <h3 ref={ref} className={cn("text-xl font-bold", className)} {...props} />
      );
    }
  );
  CardTitle.displayName = "CardTitle"; 

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
