import React from "react";
import { formatDateSeparator } from "@/lib/utils";

interface DateSeparatorProps {
  date: string;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  const formatted = formatDateSeparator(date);

  return (
    <div className="flex items-center justify-center my-3 select-none">
      <span className="bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium px-2.5 py-1 rounded-full shadow-2xs">
        {formatted}
      </span>
    </div>
  );
}
