import { getToken } from "./auth";
import { WebSocketEvent } from "@/types";

type EventCallback = (event: WebSocketEvent) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private userId: number | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isExplicitlyClosed = false;

  public connect(userId: number): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.userId === userId) {
      return; // Already actively connected
    }
    this.userId = userId;
    this.isExplicitlyClosed = false;
    this.cleanup();

    const token = getToken();
    const wsBaseUrl =
      process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";
    const url = `${wsBaseUrl}/${userId}${token ? `?token=${encodeURIComponent(token)}` : ""}`;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit("connection", { type: "user_presence", is_online: true });
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          this.emit(data.type, data);
          // Also emit to generic 'all' listener
          this.emit("*", data);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      this.socket.onclose = () => {
        this.stopHeartbeat();
        this.emit("disconnection", { type: "user_presence", is_online: false });
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (err) => {
        console.error("WebSocket error:", err);
      };
    } catch (err) {
      console.error("Failed to initialize WebSocket:", err);
      this.scheduleReconnect();
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.cleanup();
  }

  private cleanup(): void {
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.userId || this.isExplicitlyClosed) {
      return;
    }

    const backoff = Math.min(1000 * Math.pow(1.3, this.reconnectAttempts), 5000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      if (this.userId && !this.isExplicitlyClosed) {
        this.connect(this.userId);
      }
    }, backoff);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 15000); // 15 seconds keeps cloud proxies (Render) alive
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public send(payload: Record<string, unknown>): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  public sendMessage(
    conversationId: number,
    content: string,
    messageType: string = "TEXT",
    replyToId?: number | null
  ): boolean {
    return this.send({
      type: "message",
      conversation_id: conversationId,
      content,
      message_type: messageType,
      reply_to_id: replyToId,
    });
  }

  public sendTypingStart(conversationId: number): boolean {
    return this.send({
      type: "typing_start",
      conversation_id: conversationId,
    });
  }

  public sendTypingStop(conversationId: number): boolean {
    return this.send({
      type: "typing_stop",
      conversation_id: conversationId,
    });
  }

  public sendReadReceipt(conversationId: number): boolean {
    return this.send({
      type: "message_read",
      conversation_id: conversationId,
    });
  }

  public sendDeliveredReceipt(conversationId: number): boolean {
    return this.send({
      type: "message_delivered",
      conversation_id: conversationId,
    });
  }

  public on(eventType: string, callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    // Return unregister callback
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  private emit(eventType: string, event: WebSocketEvent): void {
    const handlers = this.listeners.get(eventType);
    if (handlers) {
      handlers.forEach((cb) => {
        try {
          cb(event);
        } catch (e) {
          console.error(`Error in WebSocket listener for ${eventType}:`, e);
        }
      });
    }
  }
}

export const wsClient = new WebSocketClient();
