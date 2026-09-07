"use client";

import React, { useState, useEffect } from "react";
import { Conversation, User } from "@/types";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import {
  X,
  Users,
  ShieldAlert,
  UserPlus,
  LogOut,
  UserMinus,
  Check,
} from "lucide-react";

interface GroupDetailsModalProps {
  conversation: Conversation | null;
  isOpen: boolean;
  onClose: () => void;
}

export function GroupDetailsModal({
  conversation,
  isOpen,
  onClose,
}: GroupDetailsModalProps) {
  const { user } = useAuth();
  const { refreshConversations, selectConversation } = useChat();
  const [details, setDetails] = useState<any>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGroup = conversation?.type === "GROUP";

  useEffect(() => {
    if (isOpen && conversation) {
      if (isGroup) {
        api
          .getGroupDetails(conversation.id)
          .then(setDetails)
          .catch(console.error);
      }
    } else {
      setShowAddMember(false);
      setAddUserId("");
      setError(null);
    }
  }, [isOpen, conversation, isGroup]);

  if (!isOpen || !conversation) return null;

  const currentMember = details?.members?.find((m: any) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === "ADMIN";

  const handleAddMember = async () => {
    if (!addUserId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.addGroupMember(conversation.id, Number(addUserId.trim()));
      const updated = await api.getGroupDetails(conversation.id);
      setDetails(updated);
      await refreshConversations();
      setAddUserId("");
      setShowAddMember(false);
    } catch (err: any) {
      setError(err.message || "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId: number) => {
    try {
      await api.removeGroupMember(conversation.id, targetUserId);
      const updated = await api.getGroupDetails(conversation.id);
      setDetails(updated);
      await refreshConversations();
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    }
  };

  const handleLeaveGroup = async () => {
    if (!user) return;
    if (confirm("Are you sure you want to leave this group?")) {
      try {
        await api.removeGroupMember(conversation.id, user.id);
        await refreshConversations();
        selectConversation(null);
        onClose();
      } catch (err: any) {
        alert(err.message || "Failed to leave group");
      }
    }
  };

  // For 1-on-1 chats
  const otherMember = !isGroup
    ? conversation.members.find((m) => m.user_id !== user?.id)
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-fade-in">
        {/* Top Header */}
        <div className="px-4 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {isGroup ? "Group Details" : "Contact Details"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Info Banner */}
        <div className="p-6 text-center border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col items-center">
          <Avatar
            name={isGroup ? conversation.name : otherMember?.display_name || otherMember?.username}
            src={conversation.avatar_url}
            isOnline={otherMember?.is_online}
            isGroup={isGroup}
            size="xl"
            className="mb-3"
          />

          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {isGroup ? conversation.name : otherMember?.display_name || otherMember?.username}
          </h3>

          {!isGroup && otherMember && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              @{otherMember.username}
            </p>
          )}

          {isGroup && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              {details?.member_count || conversation.members.length} members
            </p>
          )}
        </div>

        {/* Members section for groups */}
        {isGroup && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Members
              </span>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMember(!showAddMember)}
                  className="text-xs text-[#2C6BED] font-medium flex items-center gap-1 hover:underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            {/* Add member form */}
            {showAddMember && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2">
                <label className="block text-xs text-zinc-500 dark:text-zinc-400">
                  Enter User ID to add:
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    placeholder="User ID (e.g. 3)"
                    className="flex-1 bg-white dark:bg-zinc-900 text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 outline-none"
                  />
                  <button
                    onClick={handleAddMember}
                    disabled={loading || !addUserId.trim()}
                    className="px-3 py-1.5 bg-[#2C6BED] text-white text-xs font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
                {error && <p className="text-xs text-rose-500">{error}</p>}
              </div>
            )}

            {/* Member list */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {(details?.members || conversation.members).map((m: any) => (
                <div
                  key={m.user_id}
                  className="py-2.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      name={m.display_name || m.username}
                      src={m.avatar_url}
                      isOnline={m.is_online}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {m.display_name || m.username}
                        {m.user_id === user?.id && " (You)"}
                      </div>
                      <div className="text-xs text-zinc-400">@{m.username}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {m.role === "ADMIN" ? (
                      <span className="text-[10px] uppercase font-bold bg-[#2C6BED]/10 text-[#2C6BED] px-2 py-0.5 rounded-full">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400">Member</span>
                    )}

                    {isAdmin && m.user_id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        title="Remove member"
                        className="p-1 text-zinc-400 hover:text-rose-600 rounded"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Leave Group Action */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={handleLeaveGroup}
                className="w-full py-2.5 px-3 flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-sm font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Group</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
