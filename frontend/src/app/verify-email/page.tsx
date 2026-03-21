"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Mail, Check, ShieldCheck, ArrowRight } from "lucide-react";

export default function VerifyEmailPage() {
    const router = useRouter();
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        sendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    async function sendOtp() {
        setSending(true);
        setError("");
        try {
            await api.sendVerificationOtp();
            setResendCooldown(60);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to send code";
            if (msg.includes("already verified")) {
                router.push("/dashboard");
                return;
            }
            setError(msg);
        } finally {
            setSending(false);
        }
    }

    function handleDigit(index: number, value: string) {
        if (!/^\d*$/.test(value)) return;
        const next = [...otp];
        next[index] = value.slice(-1);
        setOtp(next);
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    }

    function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }

    function handlePaste(e: React.ClipboardEvent) {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (!pasted) return;
        const next = [...otp];
        for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
        setOtp(next);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const code = otp.join("");
        if (code.length < 6) { setError("Please enter the complete 6-digit code."); return; }
        setLoading(true);
        setError("");
        try {
            await api.verifyEmail(code);
            setSuccess(true);
            setTimeout(() => router.push("/dashboard"), 2500);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Invalid code. Please try again.");
            setOtp(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            <div className="w-full px-6 h-16 flex items-center border-b border-slate-100">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-[#6c5ce7] rounded-lg flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-sm">C</span>
                    </div>
                    <span className="font-bold text-slate-900">Concilio</span>
                </Link>
            </div>

            <div className="flex-1 flex items-center justify-center px-6 pb-12">
                <div className="w-full max-w-sm">
                    {success ? (
                        <div className="text-center">
                            <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                                <Check size={26} className="text-emerald-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">Email verified</h1>
                            <p className="text-sm text-slate-500">Taking you to your dashboard...</p>
                        </div>
                    ) : (
                        <div className="space-y-7">
                            <div className="text-center">
                                <div className="w-14 h-14 bg-[#f1f0ff] rounded-xl flex items-center justify-center mx-auto mb-5">
                                    <Mail size={24} className="text-[#6c5ce7]" />
                                </div>
                                <h1 className="text-2xl font-bold text-slate-900 mb-1">Verify your email</h1>
                                <p className="text-sm text-slate-500">
                                    {sending ? "Sending verification code..." : "Enter the 6-digit code we sent to your email."}
                                </p>
                            </div>

                            {error && (
                                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-sm text-center">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                                    {otp.map((digit, i) => (
                                        <input
                                            key={i}
                                            ref={el => { inputRefs.current[i] = el; }}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={e => handleDigit(i, e.target.value)}
                                            onKeyDown={e => handleKeyDown(i, e)}
                                            className={`w-11 h-14 text-center text-lg font-bold rounded-xl border transition-all outline-none ${digit ? "bg-white border-[#a29bfe] text-slate-900" : "bg-slate-50 border-slate-200 text-slate-400 focus:bg-white focus:border-[#a29bfe]"}`}
                                        />
                                    ))}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || sending || otp.join("").length < 6}
                                    className="w-full h-11 bg-[#6c5ce7] text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#5b4bd5] disabled:opacity-60 transition-colors"
                                >
                                    {loading ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying...</>
                                    ) : (
                                        <>Verify Email<ArrowRight size={16} /></>
                                    )}
                                </button>
                            </form>

                            <div className="text-center space-y-2">
                                <p className="text-sm text-slate-400">Didn&apos;t receive the code?</p>
                                <button
                                    onClick={sendOtp}
                                    disabled={resendCooldown > 0 || sending}
                                    className="text-sm font-medium text-[#6c5ce7] hover:text-[#5b4bd5] transition-colors disabled:opacity-40"
                                >
                                    {resendCooldown > 0
                                        ? `Resend in ${resendCooldown}s`
                                        : sending ? "Sending..." : "Resend code"}
                                </button>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                    <p className="text-xs text-slate-400">Secured verification</p>
                                </div>
                                <Link href="/dashboard" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                                    Skip for now
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
