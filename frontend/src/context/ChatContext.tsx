"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Conversation, Message, WebSocketEvent } from "@/types";
import { api } from "@/lib/api";
import { wsClient } from "@/lib/websocket";
import { useAuth } from "./AuthContext";

interface TypingUser {
  userId: number;
  username: string;
  displayName?: string;
}

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  typingUsers: TypingUser[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectConversation: (conv: Conversation | null) => void;
  sendMessage: (content: string, messageType?: string, replyToId?: number | null) => Promise<void>;
  editMessage: (messageId: number, content: string) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  startDirectChat: (recipientId: number) => Promise<Conversation>;
  createGroup: (name: string, memberIds: number[], avatarUrl?: string) => Promise<Conversation>;
  refreshConversations: () => Promise<void>;
  markConversationAsRead: (conversationId: number) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messagesByConv, setMessagesByConv] = useState<Record<number, Message[]>>({});
  const [typingByConv, setTypingByConv] = useState<Record<number, TypingUser[]>>({});
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeConvRef = useRef<Conversation | null>(null);
  activeConvRef.current = activeConversation;

  // Fetch conversations
  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setIsLoadingConversations(true);
      refreshConversations().finally(() => setIsLoadingConversations(false));
    } else {
      setConversations([]);
      setActiveConversation(null);
      setMessagesByConv({});
    }
  }, [user, refreshConversations]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (conversationId: number) => {
    setIsLoadingMessages(true);
    try {
      const res = await api.getMessages(conversationId, 100);
      setMessagesByConv((prev) => ({
        ...prev,
        [conversationId]: res.messages,
      }));
      // Mark read
      await api.markConversationRead(conversationId);
      wsClient.sendReadReceipt(conversationId);
      // Decrement unread count locally
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  const selectConversation = (conv: Conversation | null) => {
    setActiveConversation(conv);
    if (conv) {
      loadMessages(conv.id);
    }
  };

  const markConversationAsRead = async (conversationId: number) => {
    try {
      await api.markConversationRead(conversationId);
      wsClient.sendReadReceipt(conversationId);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      console.error("Failed to mark conversation read:", err);
    }
  };

  // WebSocket event listeners
  useEffect(() => {
    if (!user) return;

    const unsubs: (() => void)[] = [];

    // 1. Incoming new message
    unsubs.push(
      wsClient.on("message", (event: WebSocketEvent) => {
        const msg = event.message;
        if (!msg) return;

        const convId = msg.conversation_id;
        const currentActive = activeConvRef.current;

        // Clear typing indicator for message sender
        setTypingByConv((prev) => {
          const current = prev[convId] || [];
          return {
            ...prev,
            [convId]: current.filter((t) => t.userId !== msg.sender_id),
          };
        });

        // Add to messages cache
        setMessagesByConv((prev) => {
          const currentList = prev[convId] || [];
          if (currentList.some((m) => m.id === msg.id)) {
            return prev;
          }
          return {
            ...prev,
            [convId]: [...currentList, msg],
          };
        });

        // Update conversation in sidebar
        setConversations((prev) => {
          const existingIndex = prev.findIndex((c) => c.id === convId);
          if (existingIndex === -1) {
            // New conversation received, refresh list immediately
            refreshConversations();
            return prev;
          }

          const updated = [...prev];
          const conv = { ...updated[existingIndex] };
          conv.last_message = {
            id: msg.id,
            content: msg.content,
            sender_id: msg.sender_id,
            sender_name: msg.sender?.display_name || msg.sender?.username || null,
            created_at: msg.created_at,
            message_type: msg.message_type,
          };

          // If not active, increment unread count
          if (!currentActive || currentActive.id !== convId) {
            if (msg.sender_id !== user.id) {
              conv.unread_count = (conv.unread_count || 0) + 1;
            }
          } else if (msg.sender_id !== user.id) {
            // Automatically mark read
            api.markConversationRead(convId).catch(() => {});
            wsClient.sendReadReceipt(convId);
          }

          // Move to top of list
          updated.splice(existingIndex, 1);
          return [conv, ...updated];
        });
      })
    );

    // 2. Typing start
    unsubs.push(
      wsClient.on("typing_start", (event: WebSocketEvent) => {
        const { conversation_id, user_id, username, display_name } = event;
        if (!conversation_id || !user_id || user_id === user.id) return;

        setTypingByConv((prev) => {
          const current = prev[conversation_id] || [];
          if (current.some((t) => t.userId === user_id)) return prev;
          return {
            ...prev,
            [conversation_id]: [
              ...current,
              { userId: user_id, username: username || "User", displayName: display_name },
            ],
          };
        });

        // Auto-clear typing indicator after 3.5s in case stop event is lost
        setTimeout(() => {
          setTypingByConv((prev) => {
            const current = prev[conversation_id] || [];
            return {
              ...prev,
              [conversation_id]: current.filter((t) => t.userId !== user_id),
            };
          });
        }, 3500);
      })
    );

    // 3. Typing stop
    unsubs.push(
      wsClient.on("typing_stop", (event: WebSocketEvent) => {
        const { conversation_id, user_id } = event;
        if (!conversation_id || !user_id) return;

        setTypingByConv((prev) => {
          const current = prev[conversation_id] || [];
          return {
            ...prev,
            [conversation_id]: current.filter((t) => t.userId !== user_id),
          };
        });
      })
    );

    // 4. Message read
    unsubs.push(
      wsClient.on("message_read", (event: WebSocketEvent) => {
        const { conversation_id, user_id, message_ids } = event;
        if (!conversation_id || user_id === user.id) return;

        setMessagesByConv((prev) => {
          const convMsgs = prev[conversation_id];
          if (!convMsgs) return prev;

          return {
            ...prev,
            [conversation_id]: convMsgs.map((m) => {
              if (message_ids && !message_ids.includes(m.id)) return m;
              return {
                ...m,
                status: "READ" as const,
              };
            }),
          };
        });
      })
    );

    // 5. User presence change
    unsubs.push(
      wsClient.on("user_presence", (event: WebSocketEvent) => {
        const { user_id, is_online } = event;
        if (user_id === undefined || is_online === undefined) return;

        setConversations((prev) =>
          prev.map((c) => ({
            ...c,
            members: c.members.map((m) =>
              m.user_id === user_id ? { ...m, is_online } : m
            ),
          }))
        );
      })
    );

    // 6. Conversation created in real-time
    unsubs.push(
      wsClient.on("conversation_created", () => {
        refreshConversations();
      })
    );

    // 7. Message edited in real-time
    unsubs.push(
      wsClient.on("message_updated", (event: WebSocketEvent) => {
        const updated = event.message;
        if (!updated) return;
        setMessagesByConv((prev) => {
          const list = prev[updated.conversation_id] || [];
          return {
            ...prev,
            [updated.conversation_id]: list.map((m) => (m.id === updated.id ? updated : m)),
          };
        });
      })
    );

    // 8. Message deleted in real-time
    unsubs.push(
      wsClient.on("message_deleted", (event: WebSocketEvent) => {
        const { conversation_id, message_id } = event;
        if (!conversation_id || !message_id) return;
        setMessagesByConv((prev) => {
          const list = prev[conversation_id] || [];
          return {
            ...prev,
            [conversation_id]: list.filter((m) => m.id !== message_id),
          };
        });
      })
    );

    // 9. Group updated in real-time
    unsubs.push(
      wsClient.on("group_updated", (event: WebSocketEvent) => {
        const { group } = event;
        if (!group) return;
        refreshConversations();
        setActiveConversation((prev) => {
          if (prev && prev.id === group.id) {
            return {
              ...prev,
              name: group.name,
              avatar_url: group.avatar_url,
              members: group.members,
            };
          }
          return prev;
        });
      })
    );

    // 10. Removed from conversation / deleted
    unsubs.push(
      wsClient.on("conversation_deleted", (event: WebSocketEvent) => {
        const { conversation_id } = event;
        if (!conversation_id) return;
        setConversations((prev) => prev.filter((c) => c.id !== conversation_id));
        setActiveConversation((prev) => (prev?.id === conversation_id ? null : prev));
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [user, refreshConversations]);

  // Send message
  const sendMessage = async (
    content: string,
    messageType: string = "TEXT",
    replyToId?: number | null
  ) => {
    if (!activeConversation || !user || !content.trim()) return;

    // Send via WebSocket for instant delivery
    const wsSent = wsClient.sendMessage(
      activeConversation.id,
      content.trim(),
      messageType,
      replyToId
    );

    // If WebSocket is not ready, fallback to REST API
    if (!wsSent) {
      try {
        const newMsg = await api.sendMessage(
          activeConversation.id,
          content.trim(),
          messageType,
          replyToId
        );
        setMessagesByConv((prev) => ({
          ...prev,
          [activeConversation.id]: [...(prev[activeConversation.id] || []), newMsg],
        }));
        refreshConversations();
      } catch (err) {
        console.error("Failed to send message via HTTP fallback:", err);
      }
    }
  };

  const editMessage = async (messageId: number, content: string) => {
    if (!activeConversation) return;
    try {
      const updated = await api.editMessage(messageId, content);
      setMessagesByConv((prev) => ({
        ...prev,
        [activeConversation.id]: (prev[activeConversation.id] || []).map((m) =>
          m.id === messageId ? updated : m
        ),
      }));
    } catch (err) {
      console.error("Failed to edit message:", err);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!activeConversation) return;
    try {
      await api.deleteMessage(messageId);
      setMessagesByConv((prev) => ({
        ...prev,
        [activeConversation.id]: (prev[activeConversation.id] || []).filter(
          (m) => m.id !== messageId
        ),
      }));
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  const sendTyping = (isTyping: boolean) => {
    if (!activeConversation) return;
    if (isTyping) {
      wsClient.sendTypingStart(activeConversation.id);
    } else {
      wsClient.sendTypingStop(activeConversation.id);
    }
  };

  const startDirectChat = async (recipientId: number): Promise<Conversation> => {
    const conv = await api.createDirectConversation(recipientId);
    await refreshConversations();
    selectConversation(conv);
    return conv;
  };

  const createGroup = async (
    name: string,
    memberIds: number[],
    avatarUrl?: string
  ): Promise<Conversation> => {
    const conv = await api.createGroupConversation({
      name,
      member_ids: memberIds,
      avatar_url: avatarUrl,
    });
    await refreshConversations();
    selectConversation(conv);
    return conv;
  };

  const activeMessages = activeConversation ? messagesByConv[activeConversation.id] || [] : [];
  const activeTyping = activeConversation ? typingByConv[activeConversation.id] || [] : [];

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages: activeMessages,
        typingUsers: activeTyping,
        isLoadingConversations,
        isLoadingMessages,
        searchQuery,
        setSearchQuery,
        selectConversation,
        sendMessage,
        editMessage,
        deleteMessage,
        sendTyping,
        startDirectChat,
        createGroup,
        refreshConversations,
        markConversationAsRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
