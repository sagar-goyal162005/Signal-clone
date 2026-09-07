"use client";

import React from "react";
import { Conversation } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { formatLastSeen } from "@/lib/utils";
import { Phone, Video, Search, MoreVertical, ArrowLeft, Info } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface ChatHeaderProps {
  conversation: Conversation;
  onBack?: () => void;
  onOpenDetails?: () => void;
}

export function ChatHeader({
  conversation,
  onBack,
  onOpenDetails,
}: ChatHeaderProps) {
  const { user } = useAuth();

  const isGroup = conversation.type === "GROUP";

  // If direct chat, find the other participant
  const otherMember = !isGroup
    ? conversation.members.find((m) => m.user_id !== user?.id)
    : null;

  const displayName = isGroup
    ? conversation.name || "Group Chat"
    : otherMember?.display_name || otherMember?.username || conversation.name || "Chat";

  const subtitle = isGroup
    ? `${conversation.members.length} members`
    : otherMember
    ? formatLastSeen(otherMember.is_online)
    : "";

  const handleSimulateCall = (type: "audio" | "video") => {
    alert(`Starting secure ${type} call with ${displayName}... (Signal encrypted calling simulated)`);
  };

  return (
    <div className="h-16 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between z-10">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1.5 -ml-1.5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div
          onClick={onOpenDetails}
          className="flex items-center gap-3 cursor-pointer group min-w-0"
        >
          <Avatar
            name={displayName}
            src={conversation.avatar_url}
            isOnline={otherMember?.is_online}
            isGroup={isGroup}
            size="md"
          />

          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[#2C6BED] transition-colors">
              {displayName}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
        <button
          onClick={() => handleSimulateCall("audio")}
          title="Voice call"
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full transition-colors"
        >
          <Phone className="w-4 h-4" />
        </button>

        <button
          onClick={() => handleSimulateCall("video")}
          title="Video call"
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full transition-colors"
        >
          <Video className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenDetails}
          title="Conversation details"
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full transition-colors"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
