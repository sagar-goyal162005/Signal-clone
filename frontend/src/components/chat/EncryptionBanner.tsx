import React from "react";
import { Lock } from "lucide-react";

export function EncryptionBanner() {
  return (
    <div className="flex items-center justify-center my-4 px-4">
      <div className="max-w-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl py-2 px-3.5 flex items-center gap-2 text-center text-xs text-zinc-600 dark:text-zinc-300 shadow-sm backdrop-blur-sm">
        <Lock className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
        <span>
          Messages are end-to-end encrypted. Nobody outside of this chat can read them.
        </span>
      </div>
    </div>
  );
}
