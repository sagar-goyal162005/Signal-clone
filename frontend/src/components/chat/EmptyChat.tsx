import React from "react";
import { ShieldCheck, MessageSquarePlus } from "lucide-react";

interface EmptyChatProps {
  onStartNewChat?: () => void;
}

export function EmptyChat({ onStartNewChat }: EmptyChatProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-center select-none">
      <div className="w-20 h-20 rounded-full bg-[#2C6BED]/10 flex items-center justify-center mb-5 text-[#2C6BED]">
        <ShieldCheck className="w-10 h-10" />
      </div>

      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        Signal Messenger
      </h1>

      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
        Send and receive privacy-preserving, encrypted messages and voice/video calls.
      </p>

      {onStartNewChat && (
        <button
          onClick={onStartNewChat}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2C6BED] hover:bg-blue-600 text-white text-sm font-medium rounded-full shadow-sm transition-transform hover:scale-105 active:scale-95"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Start a Chat</span>
        </button>
      )}
    </div>
  );
}
