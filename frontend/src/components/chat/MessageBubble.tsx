"use client";

import React, { useState } from "react";
import { Message } from "@/types";
import { formatMessageTime, cn } from "@/lib/utils";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { Copy, Edit2, Trash2, Check } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  showSender?: boolean;
  onEdit?: (messageId: number, content: string) => void;
  onDelete?: (messageId: number) => void;
}

export function MessageBubble({
  message,
  isSelf,
  showSender = false,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);

  // System messages are rendered centered
  if (message.message_type === "SYSTEM") {
    return (
      <div className="flex justify-center my-2.5">
        <span className="bg-zinc-200/70 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 text-xs px-3 py-1 rounded-full shadow-2xs">
          {message.content}
        </span>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content && onEdit) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditContent(message.content);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col mb-1 max-w-[75%] md:max-w-[65%]",
        isSelf ? "ml-auto items-end" : "mr-auto items-start"
      )}
    >
      {/* Sender name for group chats */}
      {showSender && !isSelf && (
        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 ml-3 mb-0.5">
          {message.sender?.display_name || message.sender?.username || "Unknown"}
        </span>
      )}

      <div className="relative group/bubble">
        <div
          className={cn(
            "relative px-3.5 py-2 text-sm break-words shadow-2xs transition-all",
            isSelf
              ? "bg-[#2C6BED] text-white rounded-2xl rounded-tr-xs"
              : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/70 dark:border-zinc-700/60 rounded-2xl rounded-tl-xs"
          )}
        >
          {isEditing ? (
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="bg-black/10 dark:bg-white/10 text-inherit text-sm px-2 py-1 rounded-md outline-none focus:ring-1 focus:ring-white/40"
              />
              <div className="flex justify-end gap-1.5 text-xs">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2 py-0.5 opacity-80 hover:opacity-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

              <div
                className={cn(
                  "flex items-center justify-end gap-1 mt-1 text-[10px] select-none",
                  isSelf ? "text-blue-100/80" : "text-zinc-400 dark:text-zinc-500"
                )}
              >
                {message.edited_at && <span className="italic">edited</span>}
                <span>{formatMessageTime(message.created_at)}</span>
                {isSelf && <StatusIcon status={message.status} />}
              </div>
            </>
          )}
        </div>

        {/* Hover action menu */}
        {!isEditing && (
          <div
            className={cn(
              "absolute top-0 -translate-y-1/2 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-md rounded-lg p-0.5 z-10",
              isSelf ? "right-2" : "left-2"
            )}
          >
            <button
              onClick={handleCopy}
              title="Copy text"
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {isSelf && onEdit && (
              <button
                onClick={() => setIsEditing(true)}
                title="Edit message"
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {isSelf && onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                title="Delete message"
                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-zinc-500 hover:text-rose-600"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
