"use client";

import React from "react";
import { Conversation } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { formatChatTimestamp, cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isTyping?: boolean;
  onClick: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  isTyping = false,
  onClick,
}: ConversationItemProps) {
  const { user } = useAuth();

  const isGroup = conversation.type === "GROUP" || (Boolean(conversation.name) && conversation.type !== "DIRECT");

  // If direct chat, find the other participant
  const otherMember = !isGroup
    ? conversation.members.find((m) => m.user_id !== user?.id)
    : null;

  const displayName = isGroup
    ? conversation.name || "Group Chat"
    : otherMember?.display_name || otherMember?.username || conversation.name || "Chat";

  const lastMessageTime = formatChatTimestamp(
    conversation.last_message?.created_at || conversation.updated_at
  );

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3.5 py-3 cursor-pointer select-none transition-colors border-b border-zinc-100 dark:border-zinc-800/60",
        isActive
          ? "bg-blue-50/80 dark:bg-blue-950/30 border-l-4 border-l-[#2C6BED]"
          : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
      )}
    >
      <Avatar
        name={displayName}
        src={conversation.avatar_url}
        isOnline={otherMember?.is_online}
        isGroup={isGroup}
        size="md"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3
            className={cn(
              "text-sm font-medium truncate",
              isActive
                ? "text-[#2C6BED] dark:text-blue-400 font-semibold"
                : "text-zinc-900 dark:text-zinc-100"
            )}
          >
            {displayName}
          </h3>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex-shrink-0 ml-2">
            {lastMessageTime}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate pr-2">
            {isTyping ? (
              <span className="text-[#2C6BED] italic font-medium">Typing...</span>
            ) : conversation.last_message ? (
              <span>
                {conversation.last_message.sender_id === user?.id && "You: "}
                {conversation.last_message.message_type === "IMAGE"
                  ? "📷 Photo"
                  : conversation.last_message.message_type === "FILE"
                  ? "📎 File"
                  : conversation.last_message.content}
              </span>
            ) : (
              <span className="italic text-zinc-400">No messages yet</span>
            )}
          </p>

          {conversation.unread_count > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1.5 bg-[#2C6BED] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
