"use client";

import React, { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import {
  X,
  Moon,
  Sun,
  Laptop,
  Shield,
  Bell,
  Eye,
  Lock,
  Check,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  onOpenProfile,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [notifications, setNotifications] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-fade-in">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Profile card snippet */}
          <div
            onClick={() => {
              onClose();
              onOpenProfile();
            }}
            className="flex items-center gap-3.5 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 cursor-pointer hover:border-[#2C6BED]/50 transition-colors"
          >
            <Avatar
              name={user?.display_name || user?.username}
              src={user?.avatar_url}
              isOnline={user?.is_online}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {user?.display_name || user?.username}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {user?.about || "Available"}
              </p>
              <p className="text-xs text-[#2C6BED] mt-0.5 font-medium">Edit profile</p>
            </div>
          </div>

          {/* Theme Section */}
          <div>
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
              Appearance
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  theme === "light"
                    ? "border-[#2C6BED] bg-blue-50/50 dark:bg-blue-950/30 text-[#2C6BED]"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                <Sun className="w-5 h-5" />
                <span className="text-xs font-medium">Light</span>
              </button>

              <button
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  theme === "dark"
                    ? "border-[#2C6BED] bg-blue-50/50 dark:bg-blue-950/30 text-[#2C6BED]"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                <Moon className="w-5 h-5" />
                <span className="text-xs font-medium">Dark</span>
              </button>

              <button
                onClick={() => setTheme("system")}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  theme === "system"
                    ? "border-[#2C6BED] bg-blue-50/50 dark:bg-blue-950/30 text-[#2C6BED]"
                    : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                <Laptop className="w-5 h-5" />
                <span className="text-xs font-medium">System</span>
              </button>
            </div>
          </div>

          {/* Privacy Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Privacy & Security
            </h4>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Eye className="w-4 h-4 text-zinc-500" />
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Read Receipts
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      See and share when messages have been read
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => setReadReceipts(e.target.checked)}
                  className="w-4 h-4 accent-[#2C6BED] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-zinc-500" />
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Typing Indicators
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      See and share when messages are being typed
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={typingIndicators}
                  onChange={(e) => setTypingIndicators(e.target.checked)}
                  className="w-4 h-4 accent-[#2C6BED] rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-zinc-500" />
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      Notifications
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Show in-app desktop notifications
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                  className="w-4 h-4 accent-[#2C6BED] rounded cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Encryption info notice */}
          <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#2C6BED] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5">End-to-End Encryption</span>
              Cipher Messenger encrypts communications so that only the participants have access to message contents.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
