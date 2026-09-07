"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Lock, User as UserIcon, Phone, KeyRound } from "lucide-react";

export default function RegisterPage() {
  const { register, verifyOtp } = useAuth();
  const router = useRouter();

  // Step 1: Details, Step 2: OTP Verification
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("123456");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError(null);
    try {
      const res = await register(username.trim(), password, phone.trim() || undefined);
      if (res.otp_code) {
        setOtp(res.otp_code);
      }
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Registration failed. Username may be taken.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await verifyOtp(username.trim(), otp.trim());
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Invalid verification code");
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
            {step === 1 ? "Create Account" : "Verify Code"}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {step === 1
              ? "Join Signal Messenger for private, encrypted conversations"
              : `Enter the code sent to your device (Dev OTP: ${otp})`}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-300">
            {error}
          </div>
        )}

        {step === 1 ? (
          /* Step 1: Register credentials */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
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
                  placeholder="e.g. alice"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 outline-none focus:border-[#2C6BED] focus:ring-2 focus:ring-[#2C6BED]/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Password <span className="font-normal text-zinc-400">(max 8 characters, must be strong)</span>
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. Ab1@defg"
                  required
                  maxLength={8}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 outline-none focus:border-[#2C6BED] focus:ring-2 focus:ring-[#2C6BED]/20 transition-all"
                />
              </div>
              {/* Password strength indicator */}
              {password.length > 0 && (() => {
                const errors: string[] = [];
                if (password.length < 4) errors.push("Min 4 characters");
                if (!/[A-Z]/.test(password)) errors.push("Need uppercase letter");
                if (!/[a-z]/.test(password)) errors.push("Need lowercase letter");
                if (!/[0-9]/.test(password)) errors.push("Need a digit");
                if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/~`]/.test(password)) errors.push("Need special character");
                const score = Math.max(0, 5 - errors.length);
                const label = score <= 2 ? "Weak" : score <= 3 ? "Fair" : "Strong";
                const color = score <= 2 ? "bg-red-500" : score <= 3 ? "bg-amber-500" : "bg-emerald-500";
                const textColor = score <= 2 ? "text-red-500" : score <= 3 ? "text-amber-500" : "text-emerald-500";
                return (
                  <div className="mt-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${(score / 5) * 100}%` }} />
                      </div>
                      <span className={`text-[10px] font-semibold ${textColor}`}>{label}</span>
                    </div>
                    {errors.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {errors.map((err, i) => (
                          <li key={i} className="text-[10px] text-rose-500 flex items-center gap-1">
                            <span>•</span>{err}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })()}
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                Phone Number (optional)
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 202 555 0199"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 outline-none focus:border-[#2C6BED] focus:ring-2 focus:ring-[#2C6BED]/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#2C6BED] hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>{loading ? "Registering..." : "Send Verification Code"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* Step 2: OTP Verification */
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                6-digit Code
              </label>
              <div className="relative flex items-center">
                <KeyRound className="w-4 h-4 text-zinc-400 absolute left-3.5" />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  required
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 outline-none focus:border-[#2C6BED] focus:ring-2 focus:ring-[#2C6BED]/20 tracking-widest text-center font-mono font-bold text-lg"
                />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5 text-center">
                Dev environment OTP is automatically set to <span className="font-mono font-bold text-[#2C6BED]">123456</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#2C6BED] hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>{loading ? "Verifying..." : "Verify & Complete"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              Back to details
            </button>
          </form>
        )}

        {/* Login link */}
        <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[#2C6BED] font-semibold hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
