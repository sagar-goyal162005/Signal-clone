"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Lock, User as UserIcon } from "lucide-react";

const DEMO_USERS = [
  { username: "alex", label: "Alex Rivers", role: "Primary User" },
  { username: "sarah", label: "Sarah Connor", role: "Contact" },
  { username: "john", label: "John Doe", role: "Contact" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Invalid username or password");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoUsername: string) => {
    setUsername(demoUsername);
    setPassword("Password123!");
    setLoading(true);
    setError(null);
    try {
      await login(demoUsername, "Password123!");
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] dark:bg-[#0E1116] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-8 shadow-xl shadow-zinc-200/40 dark:shadow-none animate-fade-in">
        {/* Signal Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#2C6BED] flex items-center justify-center text-white shadow-md shadow-blue-500/20 mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Signal Messenger
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Privacy that fits in your pocket
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Username
            </label>
            <div className="relative flex items-center">
              <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 outline-none focus:border-[#2C6BED] focus:ring-2 focus:ring-[#2C6BED]/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 outline-none focus:border-[#2C6BED] focus:ring-2 focus:ring-[#2C6BED]/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#2C6BED] hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>{loading ? "Signing in..." : "Continue"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="mt-8 pt-6 border-t border-zinc-200/80 dark:border-zinc-800">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-3">
            Quick One-Click Demo Logins
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_USERS.map((demo) => (
              <button
                key={demo.username}
                type="button"
                onClick={() => handleQuickDemoLogin(demo.username)}
                className="flex flex-col items-center p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-zinc-200/70 dark:border-zinc-700/60 hover:border-[#2C6BED]/50 transition-all group"
              >
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-[#2C6BED]">
                  {demo.label}
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5">
                  @{demo.username}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Sign up link */}
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-[#2C6BED] font-semibold hover:underline"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
