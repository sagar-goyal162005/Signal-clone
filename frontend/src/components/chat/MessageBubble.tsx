"use client";

import React, { useState } from "react";
import { Message } from "@/types";
import { formatMessageTime, cn, getAttachmentUrl, formatFileSize } from "@/lib/utils";
import { StatusIcon } from "@/components/ui/StatusIcon";
import { Copy, Edit2, Trash2, Check, FileText, Download, ExternalLink } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isSelf: boolean;
  showSender?: boolean;
  onEdit?: (messageId: number, content: string) => void;
  onDelete?: (messageId: number) => void;
}

interface AttachmentData {
  url: string;
  filename?: string;
  size?: number;
  caption?: string;
}

function parseAttachment(content: string): AttachmentData {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && parsed.url) {
      return parsed;
    }
  } catch {}
  return { url: content };
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

  const renderContent = () => {
    if (message.message_type === "IMAGE") {
      const attachment = parseAttachment(message.content);
      const imgUrl = getAttachmentUrl(attachment.url);
      return (
        <div className="flex flex-col gap-1.5">
          <a
            href={imgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative rounded-xl overflow-hidden group/img max-w-xs md:max-w-sm"
          >
            <img
              src={imgUrl}
              alt={attachment.filename || "Image attachment"}
              className="w-full max-h-72 object-cover rounded-xl transition-transform duration-200 group-hover/img:scale-[1.02]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
              <ExternalLink className="w-5 h-5" />
            </div>
          </a>
          {attachment.caption && (
            <p className="whitespace-pre-wrap leading-relaxed text-sm pt-0.5">{attachment.caption}</p>
          )}
        </div>
      );
    }

    if (message.message_type === "FILE") {
      const attachment = parseAttachment(message.content);
      const fileUrl = getAttachmentUrl(attachment.url);
      return (
        <div className="flex flex-col gap-1.5 min-w-[220px]">
          <div
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-xl transition-colors",
              isSelf
                ? "bg-white/10 hover:bg-white/15"
                : "bg-zinc-100 dark:bg-zinc-700/60 hover:bg-zinc-200/70 dark:hover:bg-zinc-700"
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                isSelf ? "bg-white/20 text-white" : "bg-[#2C6BED]/10 text-[#2C6BED] dark:bg-[#2C6BED]/20"
              )}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pr-2">
              <p className="text-xs font-semibold truncate leading-tight">
                {attachment.filename || "Attachment"}
              </p>
              {attachment.size ? (
                <p className={cn("text-[10px] mt-0.5", isSelf ? "text-blue-100/70" : "text-zinc-400")}>
                  {formatFileSize(attachment.size)}
                </p>
              ) : null}
            </div>
            <a
              href={fileUrl}
              download={attachment.filename || "download"}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "p-2 rounded-lg transition-transform hover:scale-110 active:scale-95 flex-shrink-0",
                isSelf ? "text-white hover:bg-white/20" : "text-[#2C6BED] hover:bg-[#2C6BED]/10"
              )}
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
          {attachment.caption && (
            <p className="whitespace-pre-wrap leading-relaxed text-sm px-1 pt-0.5">{attachment.caption}</p>
          )}
        </div>
      );
    }

    // Standard TEXT message
    return <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>;
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
              {renderContent()}

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
