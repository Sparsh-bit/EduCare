'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Circle, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { AuthLayout } from '@/components/auth/AuthLayout';
import showToast from '@/lib/toast';

function calcStrength(pwd: string): number {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[@#$%^&*!]/.test(pwd)) score++;
    return score;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];

function Requirement({ met, label }: { met: boolean; label: string }) {
    return (
        <div className={`flex items-center gap-2 text-xs transition-colors ${met ? 'text-emerald-600' : 'text-neutral-400'}`}>
            {met ? <CheckCircle size={13} /> : <Circle size={13} />}
            {label}
        </div>
    );
}

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token') ?? '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmTouched, setConfirmTouched] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!token) setError('Invalid reset link. Please request a new one.');
    }, [token]);

    const strength = calcStrength(password);
    const passwordsMatch = password === confirm;
    const confirmError = confirmTouched && confirm && !passwordsMatch ? 'Passwords do not match' : '';
    const canSubmit = strength >= 3 && passwordsMatch && confirm.length > 0 && !!token;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setError('');
        setLoading(true);
        try {
            await api.resetPassword(token, password);
            setDone(true);
            showToast.success('Password reset successfully. Please log in.');
            setTimeout(() => router.push('/login'), 1500);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Reset failed. Please try again.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const inputBase = 'w-full h-10 bg-white border rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-all px-3 focus:border-brand-500 focus:ring-1';

    if (done) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center w-full max-w-[400px]"
            >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-emerald-50">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h1 className="text-2xl font-bold text-neutral-900 mb-2">Password updated!</h1>
                <p className="text-sm text-neutral-500">Redirecting you to login...</p>
            </motion.div>
        );
    }

    return (
        <div className="w-full max-w-[400px]">
            <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 mb-8 transition-colors group"
            >
                <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                Back to login
            </Link>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-neutral-900">Create new password</h1>
                <p className="text-sm text-neutral-500 mt-1">Your new password must be at least 8 characters.</p>
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2"
                >
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <div className="text-sm text-red-700">
                        {error}
                        {(error.includes('expired') || error.includes('Invalid')) && (
                            <div className="mt-1.5">
                                <Link href="/forgot-password" className="underline font-medium text-xs text-red-700">
                                    Request a new reset link
                                </Link>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* New password */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">New Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        <input
                            type={showPwd ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Min 8 characters"
                            required
                            autoComplete="new-password"
                            className={`${inputBase} pl-9 pr-10`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPwd(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>

                    {/* Strength bar */}
                    {password && (
                        <div className="mt-2">
                            <div className="flex gap-1 mb-1">
                                {[1, 2, 3, 4].map(i => (
                                    <div
                                        key={i}
                                        className="h-1 flex-1 rounded-full transition-all duration-300"
                                        style={{
                                            backgroundColor: strength >= i ? STRENGTH_COLORS[strength] : '#e5e7eb',
                                        }}
                                    />
                                ))}
                            </div>
                            <p className="text-xs" style={{ color: STRENGTH_COLORS[strength] || '#6b7280' }}>
                                {STRENGTH_LABELS[strength]}
                            </p>
                        </div>
                    )}

                    {/* Requirements */}
                    <div className="mt-3 grid grid-cols-2 gap-1.5">
                        <Requirement met={password.length >= 8} label="At least 8 characters" />
                        <Requirement met={/[a-z]/.test(password) && /[A-Z]/.test(password)} label="Upper & lowercase" />
                        <Requirement met={/[0-9]/.test(password)} label="At least one number" />
                        <Requirement met={/[@#$%^&*!]/.test(password)} label="Special character" />
                    </div>
                </div>

                {/* Confirm password */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">Confirm Password</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            onBlur={() => setConfirmTouched(true)}
                            placeholder="Repeat your password"
                            required
                            autoComplete="new-password"
                            className={`${inputBase} pl-9 pr-10 ${confirmError ? 'border-red-400 ring-1 ring-red-400/20' : confirm && passwordsMatch ? 'border-emerald-400' : ''}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                        >
                            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                    {confirmError && (
                        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle size={11} /> {confirmError}
                        </p>
                    )}
                    {confirm && passwordsMatch && !confirmError && (
                        <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                            <CheckCircle size={11} /> Passwords match
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading || !canSubmit}
                    className="w-full h-11 rounded-xl text-white text-base font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-brand-700)' }}
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Updating...
                        </>
                    ) : 'Reset Password'}
                </button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <AuthLayout>
            <Suspense fallback={
                <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-brand-600 animate-spin" />
            }>
                <ResetPasswordForm />
            </Suspense>
        </AuthLayout>
    );
}
