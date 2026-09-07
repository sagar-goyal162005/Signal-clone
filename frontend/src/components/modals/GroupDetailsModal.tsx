"use client";

import React, { useState, useEffect } from "react";
import { Conversation, User, Contact } from "@/types";
import { api } from "@/lib/api";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import {
  X,
  Users,
  UserPlus,
  LogOut,
  UserMinus,
  Check,
  Copy,
  Link as LinkIcon,
  RotateCw,
  Search,
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
  const [addInput, setAddInput] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resettingInvite, setResettingInvite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isGroup = conversation?.type === "GROUP";

  useEffect(() => {
    if (isOpen && conversation) {
      if (isGroup) {
        api
          .getGroupDetails(conversation.id)
          .then(setDetails)
          .catch(console.error);

        api
          .getGroupInviteCode(conversation.id)
          .then((res) => setInviteCode(res.invite_code))
          .catch(console.error);

        api
          .getContacts()
          .then(setContacts)
          .catch(console.error);
      }
    } else {
      setShowAddMember(false);
      setAddInput("");
      setError(null);
      setSuccessMsg(null);
      setCopied(false);
    }
  }, [isOpen, conversation, isGroup]);

  if (!isOpen || !conversation) return null;

  const currentMember = details?.members?.find((m: any) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === "ADMIN";

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = inviteCode ? `${origin}/join/${inviteCode}` : "";

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleResetInvite = async () => {
    if (!isAdmin || resettingInvite) return;
    setResettingInvite(true);
    try {
      const res = await api.resetGroupInviteCode(conversation.id);
      setInviteCode(res.invite_code);
      setSuccessMsg("Invite link reset successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to reset invite link");
    } finally {
      setResettingInvite(false);
    }
  };

  const handleAddMember = async (targetUserId?: number, targetUsername?: string) => {
    const raw = (targetUsername || addInput).trim();
    if (!targetUserId && !raw) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      if (targetUserId) {
        await api.addGroupMember(conversation.id, { user_id: targetUserId });
      } else {
        const isNumeric = /^\d+$/.test(raw);
        if (isNumeric) {
          await api.addGroupMember(conversation.id, { user_id: Number(raw) });
        } else {
          const cleanUsername = raw.startsWith("@") ? raw.slice(1) : raw;
          await api.addGroupMember(conversation.id, { username: cleanUsername });
        }
      }

      const updated = await api.getGroupDetails(conversation.id);
      setDetails(updated);
      await refreshConversations();
      setAddInput("");
      setSuccessMsg("Member added successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
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

  // Filter contacts not yet in group
  const existingMemberIds = new Set(
    (details?.members || conversation.members || []).map((m: any) => m.user_id)
  );
  const eligibleContacts = contacts.filter(
    (c) => !existingMemberIds.has(c.contact_user_id)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-fade-in">
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
        <div className="p-5 text-center border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col items-center">
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

        {/* Group Content */}
        {isGroup && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Group Invite Link Section */}
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2C6BED] dark:text-blue-400">
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Group Invite Link</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={handleResetInvite}
                    disabled={resettingInvite}
                    title="Reset invite link"
                    className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1"
                  >
                    <RotateCw className={`w-3 h-3 ${resettingInvite ? "animate-spin" : ""}`} />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl || "Loading link..."}
                  className="flex-1 bg-white dark:bg-zinc-900 text-xs text-zinc-600 dark:text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 select-all outline-none truncate font-mono"
                />
                <button
                  onClick={handleCopyInvite}
                  disabled={!inviteUrl}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "bg-[#2C6BED] text-white hover:bg-blue-600"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Members section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Members ({details?.member_count || conversation.members.length})
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setShowAddMember(!showAddMember)}
                    className="text-xs text-[#2C6BED] font-medium flex items-center gap-1 hover:underline"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{showAddMember ? "Close" : "Add Member"}</span>
                  </button>
                )}
              </div>

              {/* Add member form */}
              {showAddMember && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-1">
                      Add by Username or User ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={addInput}
                        onChange={(e) => setAddInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                        placeholder="e.g. sarah or @sarah or ID"
                        className="flex-1 bg-white dark:bg-zinc-900 text-sm px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 outline-none"
                      />
                      <button
                        onClick={() => handleAddMember()}
                        disabled={loading || !addInput.trim()}
                        className="px-3 py-1.5 bg-[#2C6BED] text-white text-xs font-medium rounded-lg hover:bg-blue-600 disabled:opacity-50"
                      >
                        {loading ? "Adding..." : "Add"}
                      </button>
                    </div>
                  </div>

                  {/* Contacts quick pick list */}
                  {eligibleContacts.length > 0 && (
                    <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                      <span className="block text-[11px] text-zinc-400 uppercase font-semibold mb-1.5">
                        Quick Add from Contacts
                      </span>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {eligibleContacts.map((c) => (
                          <div
                            key={c.contact_user_id}
                            className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                          >
                            <span className="text-xs text-zinc-800 dark:text-zinc-200 truncate">
                              {c.contact_display_name || c.contact_username}
                            </span>
                            <button
                              onClick={() => handleAddMember(c.contact_user_id)}
                              disabled={loading}
                              className="text-xs text-[#2C6BED] font-medium hover:underline flex items-center gap-0.5"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {error && <p className="text-xs text-rose-500">{error}</p>}
                  {successMsg && <p className="text-xs text-emerald-500">{successMsg}</p>}
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
            </div>

            {/* Leave Group Action */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
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
