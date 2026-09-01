"use client";

import { cn } from "@/utils/cn";
import { InputHTMLAttributes, forwardRef, useId } from "react";

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
  description?: string;
  size?: "sm" | "md";
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, description, size = "md", ...props }, ref) => {
    const id = useId();
    const switchSize = size === "sm" ? "h-5 w-9" : "h-6 w-11";
    const thumbSize = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
    const translateX = size === "sm" ? "translate-x-4" : "translate-x-5";

    return (
      <label
        htmlFor={id}
        className={cn(
          "flex items-center gap-3 cursor-pointer",
          props.disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      >
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            className="sr-only"
            {...props}
          />
          <div
            className={cn(
              "rounded-full transition-colors duration-200",
              switchSize,
              props.checked
                ? "bg-primary"
                : "bg-input",
            )}
          >
            <div
              className={cn(
                "relative top-0.5 left-0.5 rounded-full bg-white shadow-sm transition-transform duration-200",
                thumbSize,
                props.checked && translateX,
              )}
            />
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && <span className="text-sm font-medium">{label}</span>}
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
          </div>
        )}
      </label>
    );
  },
);
Switch.displayName = "Switch";

export { Switch };
