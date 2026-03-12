'use client';
import { useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/runtimeConfig';

export default function ForgotPasswordPage() {
    const [username, setUsername] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Request failed');
            setSubmitted(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

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
                        {submitted ? (
                            <div className="text-center">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
                                    ✉️
                                </div>
                                <h1 className="text-2xl font-light text-[#6c5ce7] mb-3"
                                    style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                                    Check your inbox
                                </h1>
                                <p className="text-sm text-[#6c5ce7]/50 mb-8 leading-relaxed">
                                    If <strong>{username}</strong> is registered, you will receive a password reset link shortly on your email.
                                    Check your spam folder if you don&apos;t see it.
                                </p>
                                <Link href="/login"
                                    className="text-sm text-[#6c5ce7] hover:text-[#6c5ce7]/70 font-medium transition-colors">
                                    ← Back to Sign In
                                </Link>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-3xl font-light text-[#6c5ce7] mb-2"
                                    style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                                    Reset your password
                                </h1>
                                <p className="text-sm text-[#6c5ce7]/50 mb-8">
                                    Enter your registered username and we&apos;ll send a reset link to your email.
                                </p>

                                {error && (
                                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        placeholder="Enter your username"
                                        required
                                        autoComplete="username"
                                        className="w-full px-4 py-3 rounded-xl text-sm bg-white/80 border border-[#6c5ce7]/12 text-[#6c5ce7] placeholder-[#6c5ce7]/40 focus:border-[#6c5ce7]/40 focus:ring-0 transition-colors"
                                        style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'rgba(108,92,231,0.12)' }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 rounded-xl text-sm font-medium text-[#f8f9fb] bg-[#6c5ce7] hover:bg-[#5b4bd5] transition-colors disabled:opacity-50 tracking-wide"
                                    >
                                        {loading ? 'Sending...' : 'Send Reset Link'}
                                    </button>
                                </form>

                                <p className="text-center mt-6">
                                    <Link href="/login" className="text-xs text-[#6c5ce7]/40 hover:text-[#6c5ce7]/70 transition-colors">
                                        ← Back to Sign In
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
