'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Building2, User, Lock, Eye, EyeOff, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/auth/AuthLayout';

const ERROR_MAP: Record<string, string> = {
    INVALID_CREDENTIALS: 'Incorrect username or password. Please try again.',
    SCHOOL_NOT_FOUND: 'School code not found. Check with your administrator.',
    ACCOUNT_INACTIVE: 'Your account has been deactivated. Contact your administrator.',
    ACCOUNT_LOCKED: 'Account locked due to multiple failed attempts. Try again in 15 minutes.',
};

function mapError(msg: string): string {
    for (const [code, friendly] of Object.entries(ERROR_MAP)) {
        if (msg.toUpperCase().includes(code)) return friendly;
    }
    if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('incorrect')) {
        return ERROR_MAP.INVALID_CREDENTIALS;
    }
    if (msg.toLowerCase().includes('school')) return ERROR_MAP.SCHOOL_NOT_FOUND;
    if (msg.toLowerCase().includes('locked')) return ERROR_MAP.ACCOUNT_LOCKED;
    if (msg.toLowerCase().includes('inactive') || msg.toLowerCase().includes('deactivated')) {
        return ERROR_MAP.ACCOUNT_INACTIVE;
    }
    return msg;
}

const fieldVariants = {
    initial: { opacity: 0, y: 12 },
    animate: (i: number) => ({
        opacity: 1, y: 0,
        transition: { duration: 0.35, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
    }),
};

function Field({ label, error, children, hint, index }: {
    label: string; error?: string; children: React.ReactNode; hint?: string; index: number;
}) {
    return (
        <motion.div custom={index} variants={fieldVariants} initial="initial" animate="animate">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">{label}</label>
            {children}
            {hint && !error && <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>}
            {error && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={11} /> {error}
                </p>
            )}
        </motion.div>
    );
}

export default function LoginPage() {
    const [schoolCode, setSchoolCode] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const failCount = useRef(0);
    const { login, user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;
        if (!user) return;
        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        const redirect = params.get('redirect');
        if (redirect && redirect.startsWith('/')) { router.replace(redirect); return; }
        if (user.role === 'parent') router.replace('/parent');
        else if (user.role === 'teacher' || user.role === 'staff') router.replace('/staff/dashboard');
        else router.replace('/dashboard');
    }, [user, authLoading, router]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('schoolCode') || params.get('code');
        const usr = params.get('username');
        if (code) setSchoolCode(code.toUpperCase());
        if (usr) setUsername(usr);
    }, []);

    const inputCls = (hasErr = false) =>
        `w-full h-10 bg-white border rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 outline-none transition-all px-3 ${
            hasErr
                ? 'border-red-400 ring-1 ring-red-400/20'
                : 'border-neutral-200 focus:border-brand-500 focus:ring-1'
        }`;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (failCount.current >= 10) {
            setError('Too many failed attempts. Please wait before trying again.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await login(schoolCode.trim(), username.trim(), password);
            // redirect is handled by the useEffect above that watches user + role
        } catch (err: unknown) {
            failCount.current += 1;
            const msg = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
            setError(mapError(msg));
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-neutral-200 border-t-brand-600 animate-spin" style={{ borderTopColor: 'var(--color-brand-600)' }} />
            </div>
        );
    }

    return (
        <AuthLayout>
            <div className="w-full max-w-[400px]">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-neutral-900">Welcome back</h1>
                    <p className="text-sm text-neutral-500 mt-1">Sign in to your school&apos;s ERP dashboard</p>
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
                    <Field label="School Code" hint="Your school's unique code (ask your administrator)" index={0}>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                            <input
                                type="text"
                                value={schoolCode}
                                onChange={e => setSchoolCode(e.target.value.toUpperCase())}
                                placeholder="e.g. NDPS"
                                required
                                autoComplete="organization"
                                className={`${inputCls()} pl-9 font-mono uppercase`}
                            />
                        </div>
                    </Field>

                    <Field label="Username / Phone / Email" index={1}>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                                autoComplete="username"
                                className={`${inputCls()} pl-9`}
                            />
                        </div>
                    </Field>

                    <Field label="Password" index={2}>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                autoComplete="current-password"
                                className={`${inputCls()} pl-9 pr-10`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </Field>

                    <motion.div
                        custom={3}
                        variants={fieldVariants}
                        initial="initial"
                        animate="animate"
                        className="flex items-center justify-between"
                    >
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={e => setRemember(e.target.checked)}
                                className="w-4 h-4 rounded border-neutral-300 accent-brand-600"
                            />
                            <span className="text-sm text-neutral-600">Remember me</span>
                        </label>
                        <Link href="/forgot-password" className="text-sm font-medium transition-colors hover:opacity-80" style={{ color: 'var(--color-brand-600)' }}>
                            Forgot password?
                        </Link>
                    </motion.div>

                    <motion.button
                        custom={4}
                        variants={fieldVariants}
                        initial="initial"
                        animate="animate"
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-xl text-white text-base font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 mt-1"
                        style={{ backgroundColor: 'var(--color-brand-700)' }}
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Signing in...
                            </>
                        ) : 'Sign in'}
                    </motion.button>
                </form>

                <p className="text-center text-sm text-neutral-500 mt-6">
                    New school?{' '}
                    <Link href="/signup" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: 'var(--color-brand-600)' }}>
                        Create your school →
                    </Link>
                </p>

                <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                    <ShieldCheck size={12} />
                    Protected by end-to-end encryption. Your data never leaves India.
                </div>
            </div>
        </AuthLayout>
    );
}
