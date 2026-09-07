import React from "react";
import { MessageStatus } from "@/types";
import { Check, CheckCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusIconProps {
  status?: MessageStatus;
  className?: string;
}

export function StatusIcon({ status, className }: StatusIconProps) {
  if (!status) return null;

  switch (status) {
    case "SENDING":
      return <Clock className={cn("w-3 h-3 text-zinc-400 animate-pulse", className)} />;
    case "SENT":
      return <Check className={cn("w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400", className)} />;
    case "DELIVERED":
      return <CheckCheck className={cn("w-3.5 h-3.5 text-zinc-400 dark:text-zinc-400", className)} />;
    case "READ":
      return <CheckCheck className={cn("w-3.5 h-3.5 text-sky-400 dark:text-sky-300", className)} />;
    default:
      return null;
  }
}
