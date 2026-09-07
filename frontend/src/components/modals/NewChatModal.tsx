"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Contact, User } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { useChat } from "@/context/ChatContext";
import { X, Search, Users, UserPlus, Check } from "lucide-react";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateGroup: () => void;
}

export function NewChatModal({
  isOpen,
  onClose,
  onOpenCreateGroup,
}: NewChatModalProps) {
  const { startDirectChat } = useChat();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchResults, setSearchResults] = useState<
    { id: number; username: string; display_name?: string | null; avatar_url?: string | null; is_online: boolean }[]
  >([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingContactId, setAddingContactId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getContacts().then(setContacts).catch(console.error);
    } else {
      setQuery("");
      setSearchResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await api.searchUsers(query.trim());
        setSearchResults(results);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const handleSelectUser = async (userId: number) => {
    try {
      await startDirectChat(userId);
      onClose();
    } catch (err) {
      console.error("Failed to start chat:", err);
    }
  };

  const handleAddContact = async (e: React.MouseEvent, userId: number) => {
    e.stopPropagation();
    try {
      setAddingContactId(userId);
      const newContact = await api.addContact(userId);
      setContacts((prev) => [...prev, newContact]);
    } catch (err) {
      console.error("Failed to add contact:", err);
    } finally {
      setAddingContactId(null);
    }
  };

  const contactUserIds = new Set(contacts.map((c) => c.contact_user_id));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-fade-in">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            New Message
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="p-3 border-b border-zinc-200/80 dark:border-zinc-800">
          <div className="relative flex items-center bg-zinc-100 dark:bg-zinc-800/80 rounded-xl px-3 py-1.5 focus-within:bg-white dark:focus-within:bg-zinc-800 border border-transparent focus-within:border-[#2C6BED]/50 transition-all">
            <Search className="w-4 h-4 text-zinc-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or username"
              autoFocus
              className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
            />
          </div>
        </div>

        {/* New group action */}
        <div className="p-2 border-b border-zinc-100 dark:border-zinc-800/60">
          <button
            onClick={() => {
              onClose();
              onOpenCreateGroup();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors text-zinc-900 dark:text-zinc-100 font-medium text-sm"
          >
            <div className="w-10 h-10 rounded-full bg-[#2C6BED]/10 text-[#2C6BED] flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <span>New Group</span>
          </button>
        </div>

        {/* Contacts or search results */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-zinc-100 dark:divide-zinc-800/40">
          {query ? (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Search Results
              </div>
              {loading ? (
                <div className="p-6 text-center text-xs text-zinc-400">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400">No users found</div>
              ) : (
                searchResults.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        name={u.display_name || u.username}
                        src={u.avatar_url}
                        isOnline={u.is_online}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {u.display_name || u.username}
                        </div>
                        <div className="text-xs text-zinc-400 truncate">@{u.username}</div>
                      </div>
                    </div>

                    {!contactUserIds.has(u.id) && (
                      <button
                        onClick={(e) => handleAddContact(e, u.id)}
                        disabled={addingContactId === u.id}
                        title="Add to contacts"
                        className="p-1.5 text-[#2C6BED] hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-full transition-colors"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Contacts ({contacts.length})
              </div>
              {contacts.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-400">
                  No contacts saved yet. Search above to find users.
                </div>
              ) : (
                contacts.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectUser(c.contact_user_id)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                  >
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
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
