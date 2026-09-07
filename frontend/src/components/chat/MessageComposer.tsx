"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Smile, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

interface MessageComposerProps {
  onSendMessage: (content: string, messageType?: string) => void;
  onTyping: (isTyping: boolean) => void;
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "🙏", "🔒", "🚀"];

export function MessageComposer({ onSendMessage, onTyping }: MessageComposerProps) {
  const [content, setContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Typing start
    onTyping(true);

    // Debounce typing stop
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500);
  };

  const handleSend = () => {
    if (!content.trim() || isUploading) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onTyping(false);

    onSendMessage(content.trim(), "TEXT");
    setContent("");
    setShowEmojiPicker(false);

    // Refocus input
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const processAndUploadFile = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      alert("File is too large. Maximum allowed size is 25MB.");
      return;
    }

    setIsUploading(true);
    try {
      const res = await api.uploadFile(file);
      const isImage = file.type.startsWith("image/");
      const payload = JSON.stringify({
        url: res.url,
        filename: file.name,
        size: file.size,
        content_type: file.type,
        caption: content.trim() || undefined,
      });

      onSendMessage(payload, isImage ? "IMAGE" : "FILE");
      setContent("");
      setShowEmojiPicker(false);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload attachment. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAndUploadFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Support pasting images from clipboard
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processAndUploadFile(file);
          break;
        }
      }
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative px-4 py-2.5 bg-white dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv"
      />

      {/* Quick emoji popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 left-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg p-2 flex items-center gap-1.5 z-20 animate-fade-in">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleAddEmoji(emoji)}
              className="w-8 h-8 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-lg transition-transform hover:scale-115"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 max-w-5xl mx-auto">
        {/* Attachment button */}
        <button
          type="button"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
          title="Attach image or file"
          className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors flex-shrink-0 cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#2C6BED]" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>

        {/* Input box */}
        <div className="flex-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl flex items-center px-3.5 py-1.5 border border-transparent focus-within:border-[#2C6BED]/50 focus-within:bg-white dark:focus-within:bg-zinc-800 transition-all">
          <textarea
            ref={inputRef}
            rows={1}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={isUploading ? "Uploading file..." : "Signal message (type or paste images)..."}
            disabled={isUploading}
            className="flex-1 bg-transparent resize-none outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 max-h-32 min-h-[24px] py-1"
          />

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Add emoji"
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full transition-colors flex-shrink-0 ml-1"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!content.trim() || isUploading}
          title="Send message"
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0",
            content.trim() && !isUploading
              ? "bg-[#2C6BED] text-white hover:bg-blue-600 shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
          )}
        >
          <Send className="w-4 h-4 ml-0.5" />
        </button>
      </div>
    </div>
  );
}
