"use client";

import React, { useState } from "react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { ConversationList } from "./ConversationList";
import {
  Search,
  SquarePen,
  Settings,
  X,
  Shield,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onOpenNewChat: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
}

export function Sidebar({
  onOpenNewChat,
  onOpenSettings,
  onOpenProfile,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const {
    conversations,
    activeConversation,
    selectConversation,
    searchQuery,
    setSearchQuery,
    typingUsers,
  } = useChat();

  const [showMenu, setShowMenu] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "GROUPS">("ALL");

  const unreadTotal = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const groupsCount = conversations.filter((c) => c.type === "GROUP").length;

  // Map of which conversations have typing users
  const typingMap: Record<number, boolean> = {};
  if (activeConversation && typingUsers.length > 0) {
    typingMap[activeConversation.id] = true;
  }

  return (
    <div className="w-full md:w-80 lg:w-96 h-full flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200/80 dark:border-zinc-800 flex-shrink-0">
      {/* Top bar */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800">
        <div
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
          title="Edit profile"
        >
          <Avatar
            name={user?.display_name || user?.username}
            src={user?.avatar_url}
            isOnline={user?.is_online}
            size="sm"
          />
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">
            {user?.display_name || user?.username}
          </span>
        </div>

        <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
          <button
            onClick={onOpenNewChat}
            title="New message or group"
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full transition-colors"
          >
            <SquarePen className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              title="Settings & Menu"
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-1.5 z-30 animate-fade-in text-sm text-zinc-700 dark:text-zinc-200">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenProfile();
                  }}
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left"
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Profile</span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenSettings();
                  }}
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>

                <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />

                <button
                  onClick={() => {
                    setShowMenu(false);
                    logout();
                  }}
                  className="w-full px-3.5 py-2 flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="p-3">
        <div className="relative flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-xl px-3 py-1.5 focus-within:bg-white dark:focus-within:bg-zinc-800 border border-transparent focus-within:border-[#2C6BED]/50 transition-all">
          <Search className="w-4 h-4 text-zinc-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations"
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs: All Chats, Unread, Groups (Matching design) */}
      <div className="flex items-center gap-1.5 px-3 pb-2.5 pt-0 select-none">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={cn(
            "px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer",
            filter === "ALL"
              ? "bg-[#2C6BED] text-white shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          )}
        >
          All Chats
        </button>

        <button
          type="button"
          onClick={() => setFilter("UNREAD")}
          className={cn(
            "px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer flex items-center gap-1.5",
            filter === "UNREAD"
              ? "bg-[#2C6BED] text-white shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          )}
        >
          <span>Unread</span>
          {unreadTotal > 0 && (
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                filter === "UNREAD"
                  ? "bg-white text-[#2C6BED]"
                  : "bg-[#2C6BED] text-white"
              )}
            >
              {unreadTotal}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilter("GROUPS")}
          className={cn(
            "px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer flex items-center gap-1.5",
            filter === "GROUPS"
              ? "bg-[#2C6BED] text-white shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          )}
        >
          <span>Groups</span>
          {groupsCount > 0 && (
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                filter === "GROUPS"
                  ? "bg-white/20 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
              )}
            >
              {groupsCount}
            </span>
          )}
        </button>
      </div>

      {/* Conversations List */}
      <ConversationList
        conversations={conversations}
        activeConversationId={activeConversation?.id}
        searchQuery={searchQuery}
        filter={filter}
        typingMap={typingMap}
        onSelect={(conv) => selectConversation(conv)}
      />

      {/* Bottom encryption status footer */}
      <div className="p-2.5 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 select-none">
        <Shield className="w-3 h-3 text-emerald-500" />
        <span>Signal End-to-End Encryption active</span>
      </div>
    </div>
  );
}
