"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Contact } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { useChat } from "@/context/ChatContext";
import { X, Users, Check, Search } from "lucide-react";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const { createGroup } = useChat();
  const [name, setName] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (isOpen) {
      api.getContacts().then(setContacts).catch(console.error);
    } else {
      setName("");
      setSelectedIds([]);
      setFilter("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSelect = (userId: number) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createGroup(name.trim(), selectedIds);
      onClose();
    } catch (err) {
      console.error("Failed to create group:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    const q = filter.toLowerCase();
    return (
      c.contact_username.toLowerCase().includes(q) ||
      (c.contact_display_name && c.contact_display_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-fade-in">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2C6BED]" />
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              New Group
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Name input */}
        <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800 space-y-3">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project Cipher Team"
              autoFocus
              className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3.5 py-2 rounded-xl text-sm outline-none border border-transparent focus:border-[#2C6BED]/50"
            />
          </div>

          {/* Filter members */}
          <div className="relative flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-500">
            <Search className="w-3.5 h-3.5 mr-2 text-zinc-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter contacts..."
              className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
            />
          </div>
        </div>

        {/* Selected preview chips */}
        {selectedIds.length > 0 && (
          <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/60 flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-zinc-400">Added ({selectedIds.length}):</span>
            {selectedIds.map((id) => {
              const c = contacts.find((item) => item.contact_user_id === id);
              return (
                <span
                  key={id}
                  onClick={() => toggleSelect(id)}
                  className="bg-[#2C6BED]/10 text-[#2C6BED] px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  {c?.contact_display_name || c?.contact_username || `ID ${id}`}
                  <X className="w-3 h-3" />
                </span>
              );
            })}
          </div>
        )}

        {/* Contact list for member selection */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-zinc-100 dark:divide-zinc-800/40">
          <div className="px-3 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Select Members
          </div>

          {filteredContacts.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-400">
              No contacts found to add.
            </div>
          ) : (
            filteredContacts.map((c) => {
              const isSelected = selectedIds.includes(c.contact_user_id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleSelect(c.contact_user_id)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      name={c.contact_display_name || c.contact_username}
                      src={c.contact_avatar_url}
                      isOnline={c.contact_is_online}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {c.contact_display_name || c.contact_username}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">
                        @{c.contact_username}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-[#2C6BED] border-[#2C6BED] text-white"
                        : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-end gap-2 bg-zinc-50 dark:bg-zinc-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || loading}
            className="px-4 py-2 text-sm font-medium bg-[#2C6BED] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all"
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
