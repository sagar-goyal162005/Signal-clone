"use client";

import React from "react";
import { useChat } from "@/context/ChatContext";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { TypingIndicator } from "./TypingIndicator";
import { MessageComposer } from "./MessageComposer";
import { EmptyChat } from "./EmptyChat";

interface ChatAreaProps {
  onBack?: () => void;
  onOpenDetails?: () => void;
  onStartNewChat?: () => void;
}

export function ChatArea({
  onBack,
  onOpenDetails,
  onStartNewChat,
}: ChatAreaProps) {
  const {
    activeConversation,
    messages,
    typingUsers,
    sendMessage,
    editMessage,
    deleteMessage,
    sendTyping,
  } = useChat();

  if (!activeConversation) {
    return <EmptyChat onStartNewChat={onStartNewChat} />;
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-[#F3F4F6] dark:bg-[#12151A] relative overflow-hidden">
      {/* Active Chat Header */}
      <ChatHeader
        conversation={activeConversation}
        onBack={onBack}
        onOpenDetails={onOpenDetails}
      />

      {/* Message history */}
      <MessageList
        conversation={activeConversation}
        messages={messages}
        onEditMessage={editMessage}
        onDeleteMessage={deleteMessage}
      />

      {/* Typing indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Bottom composer input */}
      <MessageComposer
        onSendMessage={(content, messageType) =>
          sendMessage(content, messageType)
        }
        onTyping={(isTyping) => sendTyping(isTyping)}
      />
    </div>
  );
}
