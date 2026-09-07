import { getToken, clearSession } from "./auth";
import {
  User,
  Contact,
  Conversation,
  Message,
  AuthResponse,
  RegisterResponse,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/register")) {
      window.location.href = "/login";
    }
  }

  if (!response.ok) {
    let errorDetail = `Request failed (${response.status})`;
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // ignore
    }
    throw new ApiError(errorDetail, response.status);
  }

  return response.json();
}

export const api = {
  // Authentication
  register: (data: { username: string; password: string; phone?: string }) =>
    request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  verifyOtp: (data: { username: string; otp: string }) =>
    request<AuthResponse>("/auth/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: { username: string; password: string }) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () =>
    request<{ message: string }>("/auth/logout", {
      method: "POST",
    }),

  getMe: () => request<User>("/auth/me"),

  updateProfile: (data: {
    display_name?: string;
    phone?: string;
    avatar_url?: string;
    about?: string;
  }) =>
    request<User>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  searchUsers: (q: string) =>
    request<
      {
        id: number;
        username: string;
        display_name?: string | null;
        avatar_url?: string | null;
        about?: string | null;
        is_online: boolean;
      }[]
    >(`/users/search?q=${encodeURIComponent(q)}`),

  // Contacts
  getContacts: () => request<Contact[]>("/contacts"),

  addContact: (contact_user_id: number) =>
    request<Contact>("/contacts", {
      method: "POST",
      body: JSON.stringify({ contact_user_id }),
    }),

  removeContact: (contact_id: number) =>
    request<{ message: string }>(`/contacts/${contact_id}`, {
      method: "DELETE",
    }),

  // Conversations
  getConversations: () => request<Conversation[]>("/conversations"),

  createDirectConversation: (recipient_id: number) =>
    request<Conversation>("/conversations", {
      method: "POST",
      body: JSON.stringify({ type: "DIRECT", recipient_id }),
    }),

  createGroupConversation: (data: {
    name: string;
    member_ids: number[];
    avatar_url?: string;
  }) =>
    request<Conversation>("/groups", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getConversation: (id: number) =>
    request<Conversation>(`/conversations/${id}`),

  markConversationRead: (id: number) =>
    request<{ message: string }>(`/conversations/${id}/read`, {
      method: "POST",
    }),

  // Messages
  getMessages: (
    conversationId: number,
    limit: number = 50,
    beforeId?: number
  ) => {
    let query = `?limit=${limit}`;
    if (beforeId) query += `&before_id=${beforeId}`;
    return request<{
      messages: Message[];
      has_more: boolean;
      total: number;
    }>(`/conversations/${conversationId}/messages${query}`);
  },

  sendMessage: (
    conversationId: number,
    content: string,
    messageType: string = "TEXT",
    replyToId?: number | null
  ) =>
    request<Message>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content,
        message_type: messageType,
        reply_to_id: replyToId,
      }),
    }),

  editMessage: (messageId: number, content: string) =>
    request<Message>(`/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }),

  deleteMessage: (messageId: number) =>
    request<{ message: string }>(`/messages/${messageId}`, {
      method: "DELETE",
    }),

  // Groups
  getGroupDetails: (groupId: number) =>
    request<{
      id: number;
      name: string;
      avatar_url?: string | null;
      created_by?: number | null;
      created_at: string;
      members: {
        user_id: number;
        username: string;
        display_name?: string | null;
        avatar_url?: string | null;
        is_online: boolean;
        role: "MEMBER" | "ADMIN";
        joined_at?: string;
      }[];
      member_count: number;
    }>(`/groups/${groupId}`),

  addGroupMember: (groupId: number, userId: number) =>
    request<{ message: string }>(`/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),

  removeGroupMember: (groupId: number, userId: number) =>
    request<{ message: string }>(`/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
    }),
};
