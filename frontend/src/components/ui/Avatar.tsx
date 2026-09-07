"use client";

import React from "react";
import { getInitials, getAvatarColor, cn } from "@/lib/utils";
import { Users } from "lucide-react";

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  isOnline?: boolean;
  isGroup?: boolean;
  className?: string;
}

export function Avatar({
  name,
  src,
  size = "md",
  isOnline = false,
  isGroup = false,
  className,
}: AvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  const badgeSizeClasses = {
    sm: "w-2.5 h-2.5 right-0 bottom-0 ring-1",
    md: "w-3 h-3 right-0 bottom-0 ring-2",
    lg: "w-3.5 h-3.5 right-0.5 bottom-0.5 ring-2",
    xl: "w-4 h-4 right-1 bottom-1 ring-2",
  };

  const colorClass = getAvatarColor(name || "");
  const initials = getInitials(name);

  return (
    <div className={cn("relative inline-block flex-shrink-0", className)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-medium select-none overflow-hidden transition-transform",
          sizeClasses[size],
          src ? "bg-zinc-200 dark:bg-zinc-800" : `${colorClass} text-white`
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={name || "User"} className="w-full h-full object-cover" />
        ) : isGroup ? (
          <Users className="w-1/2 h-1/2 text-white" />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {isOnline && !isGroup && (
        <span
          className={cn(
            "absolute rounded-full bg-emerald-500 ring-white dark:ring-zinc-900",
            badgeSizeClasses[size]
          )}
          title="Online"
        />
      )}
    </div>
  );
}
