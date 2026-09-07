"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { NewChatModal } from "@/components/modals/NewChatModal";
import { CreateGroupModal } from "@/components/modals/CreateGroupModal";
import { GroupDetailsModal } from "@/components/modals/GroupDetailsModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { ProfileModal } from "@/components/modals/ProfileModal";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { activeConversation, selectConversation } = useChat();
  const router = useRouter();

  // Modals state
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Authentication check
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#F6F8FA] dark:bg-[#0E1116]">
        <div className="w-16 h-16 rounded-2xl bg-[#2C6BED] flex items-center justify-center text-white shadow-lg shadow-blue-500/20 mb-4 animate-pulse">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[#2C6BED]" />
          <span>Securing connection...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#F6F8FA] dark:bg-[#0E1116]">
      {/* Sidebar: Visible on desktop, or on mobile when no conversation is active */}
      <div
        className={`h-full w-full md:w-auto flex-shrink-0 ${
          activeConversation ? "hidden md:flex" : "flex"
        }`}
      >
        <Sidebar
          onOpenNewChat={() => setShowNewChat(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenProfile={() => setShowProfile(true)}
        />
      </div>

      {/* Chat Canvas: Visible on desktop, or on mobile when active conversation is set */}
      <div
        className={`h-full flex-1 min-w-0 ${
          !activeConversation ? "hidden md:flex" : "flex"
        }`}
      >
        <ChatArea
          onBack={() => selectConversation(null)}
          onOpenDetails={() => setShowGroupDetails(true)}
          onStartNewChat={() => setShowNewChat(true)}
        />
      </div>

      {/* Modals */}
      <NewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
        onOpenCreateGroup={() => setShowCreateGroup(true)}
      />

      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
      />

      <GroupDetailsModal
        conversation={activeConversation}
        isOpen={showGroupDetails}
        onClose={() => setShowGroupDetails(false)}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onOpenProfile={() => setShowProfile(true)}
      />

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />
    </div>
  );
}
