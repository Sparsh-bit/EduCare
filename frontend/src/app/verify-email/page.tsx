'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function VerifyEmailPage() {
    const router = useRouter();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Auto-send OTP on mount
    useEffect(() => {
        sendOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Countdown timer for resend
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [resendCooldown]);

    async function sendOtp() {
        setSending(true);
        setError('');
        try {
            await api.sendVerificationOtp();
            setResendCooldown(60);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to send code';
            if (msg.includes('already verified')) {
                router.push('/dashboard');
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
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }

    function handlePaste(e: React.ClipboardEvent) {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        const next = [...otp];
        for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
        setOtp(next);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const code = otp.join('');
        if (code.length < 6) { setError('Please enter the full 6-digit code.'); return; }
        setLoading(true);
        setError('');
        try {
            await api.verifyEmail(code);
            setSuccess(true);
            setTimeout(() => router.push('/dashboard'), 2500);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex bg-[#f8f9fb]">
            <div className="w-full flex flex-col min-h-screen">
                <div className="px-8 py-6 flex items-center max-w-lg mx-auto w-full">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#6c5ce7] rounded-lg flex items-center justify-center">
                            <span className="text-[#f8f9fb] font-bold text-sm">C</span>
                        </div>
                        <span className="text-[#6c5ce7] font-semibold text-lg tracking-tight">Concilio</span>
                    </Link>
                </div>

                <div className="flex-1 flex items-center justify-center px-8 pb-12">
                    <div className="w-full max-w-sm">
                        {success ? (
                            <div className="text-center">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">✅</div>
                                <h1 className="text-2xl font-light text-[#6c5ce7] mb-3"
                                    style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                                    Email verified!
                                </h1>
                                <p className="text-sm text-[#6c5ce7]/50 leading-relaxed">
                                    Your email has been verified. Taking you to your dashboard…
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="w-14 h-14 bg-[#6c5ce7]/8 rounded-2xl flex items-center justify-center mb-6 text-2xl">
                                    ✉️
                                </div>
                                <h1 className="text-3xl font-light text-[#6c5ce7] mb-2"
                                    style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                                    Verify your email
                                </h1>
                                <p className="text-sm text-[#6c5ce7]/50 mb-8 leading-relaxed">
                                    {sending
                                        ? 'Sending verification code\u2026'
                                        : 'We sent a 6-digit code to your registered email. Enter it below.'}
                                </p>

                                {error && (
                                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
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
                                                className="w-12 h-14 text-center text-xl font-semibold rounded-xl border bg-white text-[#6c5ce7] focus:outline-none transition-colors"
                                                style={{ borderColor: digit ? 'rgba(108,92,231,0.5)' : 'rgba(108,92,231,0.12)' }}
                                            />
                                        ))}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || sending || otp.join('').length < 6}
                                        className="w-full py-3 rounded-xl text-sm font-medium text-[#f8f9fb] bg-[#6c5ce7] hover:bg-[#5b4bd5] transition-colors disabled:opacity-50 tracking-wide"
                                    >
                                        {loading ? 'Verifying\u2026' : 'Verify Email'}
                                    </button>
                                </form>

                                <div className="text-center mt-6">
                                    <p className="text-xs text-[#6c5ce7]/40 mb-2">Didn&apos;t receive the code?</p>
                                    <button
                                        onClick={sendOtp}
                                        disabled={resendCooldown > 0 || sending}
                                        className="text-sm text-[#6c5ce7] font-medium hover:text-[#6c5ce7]/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {resendCooldown > 0
                                            ? `Resend in ${resendCooldown}s`
                                            : sending ? 'Sending\u2026' : 'Resend code'}
                                    </button>
                                </div>

                                <p className="text-center mt-6">
                                    <Link href="/dashboard" className="text-xs text-[#6c5ce7]/30 hover:text-[#6c5ce7]/60 transition-colors">
                                        Skip for now &rarr;
                                    </Link>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
