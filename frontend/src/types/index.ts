export type MessageType = "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
export type ReceiptStatus = "SENT" | "DELIVERED" | "READ";
export type MessageStatus = "SENDING" | "SENT" | "DELIVERED" | "READ";

export interface User {
  id: number;
  username: string;
  phone?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  about?: string | null;
  is_online: boolean;
  last_seen?: string | null;
  created_at?: string;
}

export interface Contact {
  id: number;
  owner_id: number;
  contact_user_id: number;
  contact_username: string;
  contact_display_name?: string | null;
  contact_avatar_url?: string | null;
  contact_is_online: boolean;
  contact_last_seen?: string | null;
  created_at: string;
}

export interface ConversationMember {
  user_id: number;
  username: string;
  display_name?: string | null;
  avatar_url?: string | null;
  is_online: boolean;
  role: "MEMBER" | "ADMIN";
  joined_at?: string;
}

export interface MessageReceipt {
  user_id: number;
  status: ReceiptStatus;
  timestamp?: string | null;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender?: {
    id: number;
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
  content: string;
  message_type: MessageType;
  reply_to_id?: number | null;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  receipts?: MessageReceipt[];
  status?: MessageStatus;
}

export interface Conversation {
  id: number;
  type: "DIRECT" | "GROUP";
  name?: string | null;
  avatar_url?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
  members: ConversationMember[];
  last_message?: {
    id: number;
    content: string;
    sender_id: number;
    sender_name?: string | null;
    created_at: string;
    message_type: string;
  } | null;
  unread_count: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  username: string;
  display_name?: string | null;
  is_verified: boolean;
}

export interface RegisterResponse {
  message: string;
  otp_code?: string;
}

export interface WebSocketEvent {
  type:
    | "message"
    | "message_sent"
    | "typing_start"
    | "typing_stop"
    | "message_read"
    | "message_delivered"
    | "user_presence"
    | "pong"
    | "error";
  conversation_id?: number;
  user_id?: number;
  username?: string;
  display_name?: string;
  message?: Message;
  message_ids?: number[];
  is_online?: boolean;
  last_seen?: string;
  read_at?: string;
  timestamp?: string;
  detail?: string;
}
