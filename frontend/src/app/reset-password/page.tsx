'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '@/lib/runtimeConfig';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!token) setError('Invalid reset link. Please request a new one.');
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) { setError('Passwords do not match.'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Reset failed');
            setDone(true);
            setTimeout(() => router.push('/login'), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm">
            {done ? (
                <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">✅</div>
                    <h1 className="text-2xl font-light text-[#6c5ce7] mb-3"
                        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                        Password updated!
                    </h1>
                    <p className="text-sm text-[#6c5ce7]/50 mb-6 leading-relaxed">
                        Your password has been reset. Redirecting you to sign in…
                    </p>
                    <Link href="/login" className="text-sm text-[#6c5ce7] font-medium hover:text-[#6c5ce7]/70 transition-colors">
                        Sign In →
                    </Link>
                </div>
            ) : (
                <>
                    <h1 className="text-3xl font-light text-[#6c5ce7] mb-2"
                        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                        Set new password
                    </h1>
                    <p className="text-sm text-[#6c5ce7]/50 mb-8">
                        Choose a strong password of at least 8 characters.
                    </p>

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                            {error}{' '}
                            {error.includes('expired') || error.includes('Invalid') ? (
                                <Link href="/forgot-password" className="underline font-medium">Request a new link</Link>
                            ) : null}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <input
                                type={show ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="New password"
                                required
                                autoComplete="new-password"
                                className="w-full px-4 py-3 rounded-xl text-sm bg-white/80 border border-[#6c5ce7]/12 text-[#6c5ce7] placeholder-[#6c5ce7]/40 focus:border-[#6c5ce7]/40 focus:ring-0 transition-colors pr-10"
                                style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'rgba(108,92,231,0.12)' }}
                            />
                            <button type="button" onClick={() => setShow(s => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6c5ce7]/30 hover:text-[#6c5ce7]/60 text-xs font-medium transition-colors">
                                {show ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <input
                            type={show ? 'text' : 'password'}
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            placeholder="Confirm new password"
                            required
                            autoComplete="new-password"
                            className="w-full px-4 py-3 rounded-xl text-sm bg-white/80 border border-[#6c5ce7]/12 text-[#6c5ce7] placeholder-[#6c5ce7]/40 focus:border-[#6c5ce7]/40 focus:ring-0 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'rgba(108,92,231,0.12)' }}
                        />

                        {/* Strength hint */}
                        {password && (
                            <div className="flex gap-1">
                                {[8, 12, 16].map((len, i) => (
                                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${password.length >= len
                                        ? i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-emerald-400' : 'bg-emerald-600'
                                        : 'bg-gray-200'}`} />
                                ))}
                                <span className="text-[10px] text-[#6c5ce7]/40 ml-1">
                                    {password.length < 8 ? 'Too short' : password.length < 12 ? 'Fair' : password.length < 16 ? 'Good' : 'Strong'}
                                </span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !token}
                            className="w-full py-3 rounded-xl text-sm font-medium text-[#f8f9fb] bg-[#6c5ce7] hover:bg-[#5b4bd5] transition-colors disabled:opacity-50 tracking-wide mt-2"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
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
    );
}

export default function ResetPasswordPage() {
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
                    <Suspense fallback={<div className="text-[#6c5ce7]/40 text-sm">Loading...</div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
