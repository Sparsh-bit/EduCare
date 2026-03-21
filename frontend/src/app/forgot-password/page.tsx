'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import { AuthLayout } from '@/components/auth/AuthLayout';

type Step = 'form' | 'sent';

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<Step>('form');
    const [username, setUsername] = useState('');
    const [schoolCode, setSchoolCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.forgotPassword(username.trim(), schoolCode.trim() || undefined);
            setStep('sent');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
            // Always show success to prevent username enumeration
            if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no user')) {
                setStep('sent');
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const inputCls = 'w-full h-10 bg-white border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-all px-3 focus:border-brand-500 focus:ring-1';

    return (
        <AuthLayout>
            <div className="w-full max-w-[400px]">
                <AnimatePresence mode="wait">
                    {step === 'form' ? (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 mb-8 transition-colors group"
                            >
                                <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                                Back to login
                            </Link>

                            <div className="mb-8">
                                <h1 className="text-2xl font-bold text-neutral-900">Forgot password?</h1>
                                <p className="text-sm text-neutral-500 mt-1">
                                    Enter your username or email. We&apos;ll send a reset link to your registered address.
                                </p>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2"
                                >
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                        School Code
                                    </label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={schoolCode}
                                            onChange={e => setSchoolCode(e.target.value.toUpperCase())}
                                            placeholder="e.g. NDPS"
                                            className={`${inputCls} pl-9 font-mono uppercase`}
                                            autoComplete="organization"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                                        Username or Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            placeholder="Enter your username or email"
                                            required
                                            autoComplete="username"
                                            className={`${inputCls} pl-9`}
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !username.trim()}
                                    className="w-full h-11 rounded-xl text-white text-base font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 mt-1"
                                    style={{ backgroundColor: 'var(--color-brand-700)' }}
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>Send Reset Link <ArrowRight size={16} /></>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="sent"
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.35 }}
                            className="text-center"
                        >
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                                style={{ backgroundColor: 'var(--color-brand-50)' }}
                            >
                                <CheckCircle className="w-8 h-8" style={{ color: 'var(--color-brand-600)' }} />
                            </div>
                            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Check your email</h1>
                            <p className="text-sm text-neutral-500 mb-8 max-w-xs mx-auto leading-relaxed">
                                If <strong>{username}</strong> is registered, you&apos;ll receive a password reset link within a few minutes.
                            </p>
                            <p className="text-xs text-neutral-400 mb-6">
                                Don&apos;t see it? Check your spam folder. Reset links expire after 1 hour.
                            </p>
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
                                style={{ color: 'var(--color-brand-600)' }}
                            >
                                <ArrowLeft size={14} />
                                Back to login
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </AuthLayout>
    );
}
