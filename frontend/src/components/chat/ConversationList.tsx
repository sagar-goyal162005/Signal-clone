"use client";

import React from "react";
import { Conversation } from "@/types";
import { ConversationItem } from "./ConversationItem";
import { MessageSquareDashed } from "lucide-react";

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: number | null;
  searchQuery: string;
  typingMap?: Record<number, boolean>;
  onSelect: (conv: Conversation) => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  searchQuery,
  typingMap = {},
  onSelect,
}: ConversationListProps) {
  const filtered = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(query)) ||
      c.members.some(
        (m) =>
          m.username.toLowerCase().includes(query) ||
          (m.display_name && m.display_name.toLowerCase().includes(query))
      )
    );
  });

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400 select-none">
        <MessageSquareDashed className="w-8 h-8 mb-2 opacity-60" />
        <p className="text-sm">No conversations found</p>
        {searchQuery && (
          <p className="text-xs text-zinc-500 mt-1">Try searching for someone else</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/40">
      {filtered.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          isActive={conv.id === activeConversationId}
          isTyping={!!typingMap[conv.id]}
          onClick={() => onSelect(conv)}
        />
      ))}
    </div>
  );
}
