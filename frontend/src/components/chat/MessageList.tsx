"use client";

import React, { useEffect, useRef } from "react";
import { Message, Conversation } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { DateSeparator } from "./DateSeparator";
import { EncryptionBanner } from "./EncryptionBanner";
import { useAuth } from "@/context/AuthContext";

interface MessageListProps {
  conversation: Conversation;
  messages: Message[];
  onEditMessage?: (messageId: number, content: string) => void;
  onDeleteMessage?: (messageId: number) => void;
}

export function MessageList({
  conversation,
  messages,
  onEditMessage,
  onDeleteMessage,
}: MessageListProps) {
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on message updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
      <EncryptionBanner />

      {messages.map((message, index) => {
        const isSelf = message.sender_id === user?.id;

        // Check if we need a date separator
        const prevMessage = messages[index - 1];
        const showDateSeparator =
          !prevMessage ||
          new Date(message.created_at).toDateString() !==
            new Date(prevMessage.created_at).toDateString();

        return (
          <React.Fragment key={message.id}>
            {showDateSeparator && <DateSeparator date={message.created_at} />}
            <MessageBubble
              message={message}
              isSelf={isSelf}
              showSender={conversation.type === "GROUP"}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
            />
          </React.Fragment>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}
