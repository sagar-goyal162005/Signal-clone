import React from "react";

interface TypingIndicatorProps {
  typingUsers: { userId: number; username: string; displayName?: string }[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers
    .map((u) => u.displayName || u.username)
    .join(", ");

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 animate-fade-in">
      <div className="bg-zinc-200 dark:bg-zinc-800 rounded-full px-2.5 py-1 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"></span>
      </div>
      <span className="italic">{names} {typingUsers.length === 1 ? "is" : "are"} typing...</span>
    </div>
  );
}
