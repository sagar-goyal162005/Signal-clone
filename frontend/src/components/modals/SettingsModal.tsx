"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/api";
import {
  X,
  Moon,
  Sun,
  Laptop,
  Shield,
  Bell,
  Eye,
  Lock,
  ChevronRight,
  User as UserIcon,
  Palette,
  MessageSquare,
  Database,
  Smartphone,
  HelpCircle,
  Monitor,
  Keyboard,
  Link2,
  Ban,
  Timer,
  ShieldCheck,
  ShieldAlert,
  Check,
  AlertTriangle,
  KeyRound,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
}

type SettingsPanel =
  | "profile"
  | "privacy"
  | "notifications"
  | "appearance"
  | "chats"
  | "data"
  | "devices"
  | "help";

interface SettingsData {
  read_receipts: boolean;
  typing_indicators: boolean;
  link_previews: boolean;
  screen_security: boolean;
  incognito_keyboard: boolean;
  registration_lock: boolean;
  disappearing_messages_timer: string;
  notifications_enabled: boolean;
  notification_sound: boolean;
  notification_previews: boolean;
}

const TIMER_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "30s", label: "30 seconds" },
  { value: "5m", label: "5 minutes" },
  { value: "1h", label: "1 hour" },
  { value: "8h", label: "8 hours" },
  { value: "1d", label: "1 day" },
  { value: "1w", label: "1 week" },
];

/* ---- Toggle Switch ---- */
function ToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
        checked
          ? "bg-[#2C6BED]"
          : "bg-zinc-300 dark:bg-zinc-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

/* ---- Password Strength Check ---- */
function getPasswordStrength(pw: string): {
  score: number;
  label: string;
  color: string;
  errors: string[];
} {
  const errors: string[] = [];
  if (pw.length > 8) errors.push("Max 8 characters");
  if (pw.length < 4) errors.push("Min 4 characters");
  if (!/[A-Z]/.test(pw)) errors.push("Need uppercase letter");
  if (!/[a-z]/.test(pw)) errors.push("Need lowercase letter");
  if (!/[0-9]/.test(pw)) errors.push("Need a digit");
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/~`]/.test(pw))
    errors.push("Need special character");

  const score = Math.max(0, 6 - errors.length);
  if (score <= 2)
    return { score, label: "Weak", color: "bg-red-500", errors };
  if (score <= 4)
    return { score, label: "Fair", color: "bg-amber-500", errors };
  return { score, label: "Strong", color: "bg-emerald-500", errors };
}

/* ---- Main Component ---- */
export function SettingsModal({
  isOpen,
  onClose,
  onOpenProfile,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  const [activePanel, setActivePanel] = useState<SettingsPanel>("privacy");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);

  // Change password state
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Fetch settings from backend
  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch {
      // use defaults
      setSettings({
        read_receipts: true,
        typing_indicators: true,
        link_previews: false,
        screen_security: true,
        incognito_keyboard: true,
        registration_lock: true,
        disappearing_messages_timer: "off",
        notifications_enabled: true,
        notification_sound: true,
        notification_previews: true,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwMsg(null);
    }
  }, [isOpen, fetchSettings]);

  if (!isOpen) return null;

  const toggleSetting = async (key: keyof SettingsData, value: boolean | string) => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    try {
      await api.updateSettings({ [key]: value });
    } catch {
      // revert on error
      setSettings(settings);
    }
  };

  const enabledCount = settings
    ? [
        settings.screen_security,
        settings.incognito_keyboard,
        settings.registration_lock,
        settings.read_receipts,
        settings.typing_indicators,
        settings.notifications_enabled,
        settings.notification_sound,
        settings.notification_previews,
      ].filter(Boolean).length
    : 0;

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (!newPw || !currentPw) {
      setPwMsg({ type: "err", text: "Please fill in all fields" });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: "New passwords do not match" });
      return;
    }
    const strength = getPasswordStrength(newPw);
    if (strength.errors.length > 0) {
      setPwMsg({ type: "err", text: strength.errors[0] });
      return;
    }
    setPwLoading(true);
    try {
      await api.changePassword({
        current_password: currentPw,
        new_password: newPw,
      });
      setPwMsg({ type: "ok", text: "Password changed successfully!" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      setPwMsg({ type: "err", text: err.message || "Failed to change password" });
    } finally {
      setPwLoading(false);
    }
  };

  /* ---- Sidebar Nav Items ---- */
  const navItems: { key: SettingsPanel; label: string; icon: React.ReactNode; badge?: string }[] = [
    { key: "profile", label: "Profile", icon: <UserIcon className="w-4 h-4" /> },
    {
      key: "privacy",
      label: "Privacy & Security",
      icon: <Shield className="w-4 h-4" />,
    },
    { key: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
    { key: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
    { key: "chats", label: "Chats", icon: <MessageSquare className="w-4 h-4" /> },
    { key: "data", label: "Data & Storage", icon: <Database className="w-4 h-4" /> },
    {
      key: "devices",
      label: "Linked Devices",
      icon: <Smartphone className="w-4 h-4" />,
      badge: "2",
    },
    { key: "help", label: "Help & Support", icon: <HelpCircle className="w-4 h-4" /> },
  ];

  const timerLabel =
    TIMER_OPTIONS.find((t) => t.value === settings?.disappearing_messages_timer)?.label || "Off";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex max-h-[85vh] animate-fade-in">
        {/* ======= LEFT SIDEBAR ======= */}
        <div className="w-56 flex-shrink-0 border-r border-zinc-200/80 dark:border-zinc-800 flex flex-col bg-zinc-50/50 dark:bg-zinc-950/50">
          {/* User card */}
          <div
            onClick={() => {
              onClose();
              onOpenProfile();
            }}
            className="p-4 flex items-center gap-3 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors border-b border-zinc-200/60 dark:border-zinc-800"
          >
            <Avatar
              name={user?.display_name || user?.username}
              src={user?.avatar_url}
              isOnline={user?.is_online}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {user?.display_name || user?.username}
              </div>
              <div className="text-[11px] text-zinc-400 truncate">
                {user?.phone || `@${user?.username}`}
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-1.5 px-2 space-y-0.5">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActivePanel(item.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                  activePanel === item.key
                    ? "bg-[#2C6BED]/10 text-[#2C6BED] font-semibold"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {item.icon}
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.key === "privacy" && activePanel === item.key && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2C6BED]" />
                )}
                {item.badge && (
                  <span className="text-[10px] font-bold bg-[#2C6BED] text-white rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ======= RIGHT CONTENT PANEL ======= */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Panel Header */}
          <div className="px-5 py-3.5 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {navItems.find((n) => n.key === activePanel)?.label}
              </h2>
              {activePanel === "privacy" && (
                <p className="text-xs text-zinc-400 mt-0.5">
                  Manage your cryptographic parameters, session visibility, and receipts.
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* ===== PRIVACY & SECURITY ===== */}
            {activePanel === "privacy" && settings && (
              <>
                {/* Fortress Protocol Banner */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          Fortress Protocol Active
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                          High
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {enabledCount} of 9 standard privacy safeguards enabled across this
                        workstation.
                      </p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 text-xs font-medium border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                    Audit Keys
                  </button>
                </div>

                {/* Disappearing Messages */}
                <div>
                  <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
                    Disappearing Messages
                  </h4>
                  <div className="relative">
                    <button
                      onClick={() => setTimerOpen(!timerOpen)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Timer className="w-4 h-4 text-zinc-500" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Default timer for new chats
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Set a default disappearing message timer for all chats started by you.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <span>{timerLabel}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                    {timerOpen && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-1.5 z-30 animate-fade-in text-sm">
                        {TIMER_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              toggleSetting("disappearing_messages_timer", opt.value);
                              setTimerOpen(false);
                            }}
                            className={`w-full px-3.5 py-2 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-700 text-left ${
                              settings.disappearing_messages_timer === opt.value
                                ? "text-[#2C6BED] font-medium"
                                : "text-zinc-700 dark:text-zinc-200"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {settings.disappearing_messages_timer === opt.value && (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Security & Encryption */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Security & Encryption
                  </h4>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-4 h-4 text-zinc-500" />
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Screen Security
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Prevent screen captures in the app and block preview window in switcher.
                        </div>
                      </div>
                    </div>
                    <ToggleSwitch
                      id="toggle-screen-security"
                      checked={settings.screen_security}
                      onChange={(v) => toggleSetting("screen_security", v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Keyboard className="w-4 h-4 text-zinc-500" />
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Incognito Keyboard
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Request keyboard to disable personalized learning and cloud dictionary
                          sync.
                        </div>
                      </div>
                    </div>
                    <ToggleSwitch
                      id="toggle-incognito-keyboard"
                      checked={settings.incognito_keyboard}
                      onChange={(v) => toggleSetting("incognito_keyboard", v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-zinc-500" />
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Registration Lock
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Require your PIN to register phone number again on a new device.
                        </div>
                      </div>
                    </div>
                    <ToggleSwitch
                      id="toggle-registration-lock"
                      checked={settings.registration_lock}
                      onChange={(v) => toggleSetting("registration_lock", v)}
                    />
                  </div>
                </div>

                {/* Messaging Privacy */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Messaging Privacy
                  </h4>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Eye className="w-4 h-4 text-[#2C6BED]" />
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Read Receipts
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          If turned off, you won&apos;t be able to see read receipts from others.
                        </div>
                      </div>
                    </div>
                    <ToggleSwitch
                      id="toggle-read-receipts"
                      checked={settings.read_receipts}
                      onChange={(v) => toggleSetting("read_receipts", v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-[#2C6BED]" />
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Typing Indicators
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          If turned off, you won&apos;t be able to see typing indicators from
                          others.
                        </div>
                      </div>
                    </div>
                    <ToggleSwitch
                      id="toggle-typing-indicators"
                      checked={settings.typing_indicators}
                      onChange={(v) => toggleSetting("typing_indicators", v)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Link2 className="w-4 h-4 text-zinc-500" />
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Link Previews
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Generate link previews from supported sites directly on your device.
                        </div>
                      </div>
                    </div>
                    <ToggleSwitch
                      id="toggle-link-previews"
                      checked={settings.link_previews}
                      onChange={(v) => toggleSetting("link_previews", v)}
                    />
                  </div>
                </div>

                {/* Blocked & Safety */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    Blocked & Safety
                  </h4>
                  <button className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <Ban className="w-4 h-4 text-rose-500" />
                      <div className="text-left">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Blocked Users
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Manage individuals and automated contacts restricted from calling.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <span>3 contacts</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* ===== PROFILE (change password) ===== */}
            {activePanel === "profile" && (
              <>
                {/* Profile card */}
                <div
                  onClick={() => {
                    onClose();
                    onOpenProfile();
                  }}
                  className="flex items-center gap-3.5 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 cursor-pointer hover:border-[#2C6BED]/50 transition-colors"
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
                    <p className="text-xs text-[#2C6BED] mt-0.5 font-medium">Edit profile →</p>
                  </div>
                </div>

                {/* Change Password */}
                <div className="space-y-3">
                  <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    Change Password
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Password must be <strong>max 8 characters</strong> and include uppercase, lowercase, digit, and special character.
                  </p>

                  {pwMsg && (
                    <div
                      className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                        pwMsg.type === "ok"
                          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      }`}
                    >
                      {pwMsg.type === "ok" ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5" />
                      )}
                      {pwMsg.text}
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <input
                      type="password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="Current password"
                      className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3.5 py-2 rounded-xl text-sm outline-none border border-transparent focus:border-[#2C6BED]/50"
                    />
                    <div>
                      <input
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="New password (max 8 chars)"
                        maxLength={8}
                        className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3.5 py-2 rounded-xl text-sm outline-none border border-transparent focus:border-[#2C6BED]/50"
                      />
                      {newPw.length > 0 && (
                        <div className="mt-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  getPasswordStrength(newPw).color
                                }`}
                                style={{
                                  width: `${(getPasswordStrength(newPw).score / 6) * 100}%`,
                                }}
                              />
                            </div>
                            <span
                              className={`text-[10px] font-semibold ${
                                getPasswordStrength(newPw).label === "Strong"
                                  ? "text-emerald-500"
                                  : getPasswordStrength(newPw).label === "Fair"
                                  ? "text-amber-500"
                                  : "text-red-500"
                              }`}
                            >
                              {getPasswordStrength(newPw).label}
                            </span>
                          </div>
                          {getPasswordStrength(newPw).errors.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {getPasswordStrength(newPw).errors.map((err, i) => (
                                <li
                                  key={i}
                                  className="text-[10px] text-rose-500 flex items-center gap-1"
                                >
                                  <span>•</span>
                                  {err}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                    <input
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Confirm new password"
                      maxLength={8}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-3.5 py-2 rounded-xl text-sm outline-none border border-transparent focus:border-[#2C6BED]/50"
                    />
                  </div>

                  <button
                    onClick={handleChangePassword}
                    disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                    className="px-4 py-2 text-sm font-medium bg-[#2C6BED] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl shadow-sm transition-all"
                  >
                    {pwLoading ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </>
            )}

            {/* ===== NOTIFICATIONS ===== */}
            {activePanel === "notifications" && settings && (
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Notification Preferences
                </h4>

                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-zinc-500" />
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Message Notifications
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Show in-app desktop notifications for new messages
                      </div>
                    </div>
                  </div>
                  <ToggleSwitch
                    id="toggle-notifications"
                    checked={settings.notifications_enabled}
                    onChange={(v) => toggleSetting("notifications_enabled", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-zinc-500" />
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Notification Sound
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Play a sound when a notification arrives
                      </div>
                    </div>
                  </div>
                  <ToggleSwitch
                    id="toggle-notification-sound"
                    checked={settings.notification_sound}
                    onChange={(v) => toggleSetting("notification_sound", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <Eye className="w-4 h-4 text-zinc-500" />
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Show Previews
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Show message content in notification banners
                      </div>
                    </div>
                  </div>
                  <ToggleSwitch
                    id="toggle-notification-previews"
                    checked={settings.notification_previews}
                    onChange={(v) => toggleSetting("notification_previews", v)}
                  />
                </div>
              </div>
            )}

            {/* ===== APPEARANCE ===== */}
            {activePanel === "appearance" && (
              <div>
                <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
                  Theme
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
            )}

            {/* ===== COMING SOON PANELS ===== */}
            {(activePanel === "chats" ||
              activePanel === "data" ||
              activePanel === "devices" ||
              activePanel === "help") && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                  <ShieldAlert className="w-7 h-7 text-zinc-400" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  Coming Soon
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[260px]">
                  {activePanel === "chats" &&
                    "Chat backup, media management, and conversation preferences will be available in a future update."}
                  {activePanel === "data" &&
                    "Data usage controls, storage management, and auto-download settings are coming soon."}
                  {activePanel === "devices" &&
                    "Link and manage your Signal sessions across multiple devices."}
                  {activePanel === "help" &&
                    "FAQs, support tickets, and troubleshooting guides will be available here."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
