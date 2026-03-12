'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
    const [schoolCode, setSchoolCode] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const codeFromQuery = params.get('schoolCode') || params.get('code');
        const userFromQuery = params.get('username');
        if (codeFromQuery) setSchoolCode(codeFromQuery);
        if (userFromQuery) setUsername(userFromQuery);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(schoolCode, username, password);
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#f8f9fb]">
            {/* ─── Left: Login Form ─── */}
            <div className="w-full lg:w-1/2 flex flex-col min-h-screen">
                {/* Top bar */}
                <div className="px-8 py-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#6c5ce7] rounded-lg flex items-center justify-center">
                            <span className="text-[#f8f9fb] font-bold text-sm">C</span>
                        </div>
                        <span className="text-[#6c5ce7] font-semibold text-lg tracking-tight">Concilio</span>
                    </Link>
                </div>

                {/* Form area */}
                <div className="flex-1 flex items-center justify-center px-8 pb-12">
                    <div className="w-full max-w-sm">
                        <h1
                            className="text-3xl font-light text-[#6c5ce7] mb-2"
                            style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
                        >
                            Sign in to your account
                        </h1>
                        <p className="text-sm text-[#6c5ce7]/50 mb-8">
                            Enter your school code, username and password
                        </p>

                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <input
                                    type="text"
                                    value={schoolCode}
                                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                                    placeholder="School Code"
                                    required
                                    autoComplete="organization"
                                    className="w-full px-4 py-3 rounded-xl text-sm bg-white/80 border border-[#6c5ce7]/12 text-[#6c5ce7] placeholder-[#6c5ce7]/40 focus:border-[#6c5ce7]/40 focus:ring-0 focus:shadow-none transition-colors tracking-widest font-semibold"
                                    style={{ background: 'rgba(255,255,255,0.8)', color: '#6c5ce7', borderColor: 'rgba(108,92,231,0.12)', letterSpacing: '0.15em' }}
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Username"
                                    required
                                    autoComplete="username"
                                    className="w-full px-4 py-3 rounded-xl text-sm bg-white/80 border border-[#6c5ce7]/12 text-[#6c5ce7] placeholder-[#6c5ce7]/40 focus:border-[#6c5ce7]/40 focus:ring-0 focus:shadow-none transition-colors"
                                    style={{ background: 'rgba(255,255,255,0.8)', color: '#6c5ce7', borderColor: 'rgba(108,92,231,0.12)' }}
                                />
                            </div>
                            <div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    required
                                    autoComplete="current-password"
                                    className="w-full px-4 py-3 rounded-xl text-sm bg-white/80 border border-[#6c5ce7]/12 text-[#6c5ce7] placeholder-[#6c5ce7]/30 focus:border-[#6c5ce7]/40 focus:ring-0 focus:shadow-none transition-colors"
                                    style={{ background: 'rgba(255,255,255,0.8)', color: '#6c5ce7', borderColor: 'rgba(108,92,231,0.12)' }}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 rounded-xl text-sm font-medium text-[#f8f9fb] bg-[#6c5ce7] hover:bg-[#5b4bd5] transition-colors disabled:opacity-50 tracking-wide"
                            >
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>

                            <div className="text-center">
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-[#6c5ce7]/40 hover:text-[#6c5ce7]/70 transition-colors"
                                >
                                    Forgot your password?
                                </Link>
                            </div>
                        </form>

                        <p className="text-xs text-[#6c5ce7]/30 text-center mt-8">
                            Contact your administrator for login credentials
                        </p>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-2 border-t border-[#6c5ce7]/8">
                    <p className="text-xs text-[#6c5ce7]/40"
                        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                        The complete platform to manage,
                        <br className="md:hidden" /> track, and grow your school.
                    </p>
                    <p className="text-xs text-[#6c5ce7]/30">
                        © {new Date().getFullYear()} Concilio. All rights reserved.
                    </p>
                </div>
            </div>

            {/* ─── Right: ERP Preview ─── */}
            <div className="hidden lg:flex w-1/2 bg-[#e8e4dd] items-center justify-center p-10 relative overflow-hidden" >
                <div className="absolute inset-0 bg-gradient-to-br from-[#e8e4dd] to-[#ddd8d0]" />

                <div className="relative z-10 w-full max-w-lg">
                    {/* Mock Dashboard */}
                    <div className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700/30">
                        {/* Mock top bar */}
                        <div className="h-9 bg-slate-800 flex items-center px-4 gap-2 border-b border-slate-700/50">
                            <div className="w-3 h-3 rounded-full bg-red-400/60" />
                            <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                            <span className="text-[10px] text-slate-400 ml-3 tracking-wide">EduCare ERP Dashboard</span>
                        </div>

                        <div className="flex">
                            {/* Mock sidebar */}
                            <div className="w-14 bg-slate-800/60 border-r border-slate-700/30 py-4 flex flex-col items-center gap-3">
                                <div className="w-7 h-7 bg-amber-500/20 rounded-lg flex items-center justify-center text-[10px]">📊</div>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] opacity-40">🎓</div>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] opacity-40">📋</div>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] opacity-40">💰</div>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] opacity-40">📝</div>
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] opacity-40">👨‍🏫</div>
                            </div>

                            {/* Mock content */}
                            <div className="flex-1 p-4 space-y-3">
                                {/* Stat cards row */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-blue-500/10 rounded-lg p-2.5 border border-blue-500/10">
                                        <p className="text-[8px] text-slate-400">Students</p>
                                        <p className="text-sm font-bold text-white mt-0.5">847</p>
                                    </div>
                                    <div className="bg-emerald-500/10 rounded-lg p-2.5 border border-emerald-500/10">
                                        <p className="text-[8px] text-slate-400">Attendance</p>
                                        <p className="text-sm font-bold text-emerald-400 mt-0.5">94%</p>
                                    </div>
                                    <div className="bg-amber-500/10 rounded-lg p-2.5 border border-amber-500/10">
                                        <p className="text-[8px] text-slate-400">Collection</p>
                                        <p className="text-sm font-bold text-amber-400 mt-0.5">₹12.4L</p>
                                    </div>
                                </div>

                                {/* Mock bars */}
                                <div className="bg-slate-800/40 rounded-lg p-3 space-y-2">
                                    <p className="text-[8px] text-slate-400 mb-2">Class-wise Enrollment</p>
                                    {['I', 'II', 'III', 'IV', 'V', 'VI'].map((cls, i) => (
                                        <div key={cls} className="flex items-center gap-2">
                                            <span className="text-[8px] text-slate-500 w-4">{cls}</span>
                                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                                                    style={{ width: `${60 + i * 5}%` }}
                                                />
                                            </div>
                                            <span className="text-[8px] text-slate-500">{60 + i * 8}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Mock table */}
                                <div className="bg-slate-800/40 rounded-lg p-3">
                                    <p className="text-[8px] text-slate-400 mb-2">Recent Fee Payments</p>
                                    {['Aarav Kumar', 'Priya Gupta', 'Rohan Singh'].map((name) => (
                                        <div key={name} className="flex items-center justify-between py-1 border-b border-slate-700/20 last:border-0">
                                            <span className="text-[9px] text-slate-300">{name}</span>
                                            <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Paid</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom of preview */}
                    <div className="mt-8 flex items-center justify-center gap-6 text-[#6c5ce7]/30 text-xs font-medium">
                        <span>EduCare</span>
                        <span>·</span>
                        <span>School ERP</span>
                        <span>·</span>
                        <span>Concilio</span>
                    </div>
                </div>
            </div >
        </div >
    );
}
