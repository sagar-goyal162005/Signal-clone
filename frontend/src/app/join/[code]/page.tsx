"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { Avatar } from "@/components/ui/Avatar";
import { Users, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";

interface GroupPreview {
  id: number;
  name: string;
  avatar_url?: string | null;
  member_count: number;
  created_at?: string;
}

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) || "";
  const { user, isLoading: isAuthLoading } = useAuth();
  const { joinGroup, refreshConversations } = useChat();

  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError(null);
    api
      .getGroupPreview(code)
      .then((data) => {
        setPreview(data);
      })
      .catch((err: any) => {
        setError(err.message || "Invalid or expired group invite link.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  const handleJoin = async () => {
    if (!code) return;
    setJoining(true);
    setError(null);
    try {
      await joinGroup(code);
      await refreshConversations();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to join group");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      {/* Branding */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-[#2C6BED] flex items-center justify-center shadow-lg shadow-blue-500/25">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Signal
        </span>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl w-full max-w-sm shadow-xl p-6 text-center space-y-5 animate-fade-in">
        {loading ? (
          <div className="py-12 space-y-3">
            <div className="w-8 h-8 border-2 border-[#2C6BED] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-zinc-400">Loading group invitation...</p>
          </div>
        ) : error ? (
          <div className="py-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Invalid Invite Link
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                {error}
              </p>
            </div>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-medium rounded-xl text-zinc-700 dark:text-zinc-200 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        ) : preview ? (
          <>
            <div className="space-y-3">
              <Avatar
                name={preview.name}
                src={preview.avatar_url}
                isGroup={true}
                size="xl"
                className="mx-auto"
              />
              <div>
                <span className="text-[11px] font-semibold text-[#2C6BED] uppercase tracking-wider">
                  Group Invitation
                </span>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {preview.name}
                </h2>
                <p className="text-xs text-zinc-400 mt-1 flex items-center justify-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  <span>{preview.member_count} members</span>
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              {!isAuthLoading && !user ? (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    You need to be signed in to accept this group invite.
                  </p>
                  <Link
                    href={`/login?redirect=/join/${code}`}
                    className="w-full py-2.5 px-4 bg-[#2C6BED] hover:bg-blue-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <span>Log in to Join</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full py-2.5 px-4 bg-[#2C6BED] hover:bg-blue-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                >
                  {joining ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Join Group</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}

              <Link
                href="/"
                className="block text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-1"
              >
                Cancel
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
