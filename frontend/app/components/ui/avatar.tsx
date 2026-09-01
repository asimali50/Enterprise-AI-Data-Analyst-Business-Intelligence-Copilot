"use client";

import { cn } from "@/utils/cn";
import { User } from "lucide-react";

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fallback?: React.ReactNode;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

export function Avatar({
  src,
  alt,
  name,
  size = "md",
  className,
  fallback,
}: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || "Avatar"}
        className={cn("rounded-full object-cover", sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold",
        sizeMap[size],
        className,
      )}
      title={name || alt}
    >
      {fallback ?? (name ? getInitials(name) : <User className="h-4 w-4" />)}
    </div>
  );
}
