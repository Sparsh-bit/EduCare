'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import {
    LayoutDashboard, CalendarCheck, PenLine, CalendarOff,
    BellRing, LogOut, Menu, X, GraduationCap, ChevronRight,
} from 'lucide-react';

const STAFF_ROLES = ['teacher', 'staff'];

const NAV = [
    { href: '/staff/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/staff/attendance', label: 'Mark Attendance', icon: CalendarCheck },
    { href: '/staff/marks', label: 'Enter Marks', icon: PenLine },
    { href: '/staff/leaves', label: 'My Leaves', icon: CalendarOff },
    { href: '/staff/notices', label: 'Notices', icon: BellRing },
];

function StaffNav({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <div className={`flex flex-col h-full ${mobile ? 'p-5' : 'p-6'}`}>
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-8">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
                    E
                </div>
                <div>
                    <p className="font-bold text-sm text-slate-900">EduCare</p>
                    <p className="text-[10px] text-slate-400 leading-none">Staff Portal</p>
                </div>
                {mobile && (
                    <button onClick={onClose} className="ml-auto p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* User info */}
            {user && (
                <div className="mb-6 p-4 bg-[#f1f0ff] rounded-2xl border border-[#e5e0ff]">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#6c5ce7] font-bold text-lg mb-3 shadow-sm">
                        {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-[11px] font-semibold text-[#6c5ce7] tracking-wider uppercase mt-0.5">{user.role}</p>
                </div>
            )}

            {/* Nav links */}
            <nav className="flex-1 space-y-1">
                {NAV.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname?.startsWith(href + '/');
                    return (
                        <Link
                            key={href}
                            href={href}
                            onClick={onClose}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                                active
                                    ? 'bg-[#6c5ce7] text-white shadow-md'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <Icon size={18} className={active ? 'text-white' : 'text-slate-400'} />
                            {label}
                            {active && <ChevronRight size={16} className="ml-auto text-white/50" />}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <button
                onClick={() => { logout?.(); }}
                className="mt-4 flex items-center gap-2.5 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
            >
                <LogOut size={15} />
                Sign out
            </button>
        </div>
    );
}

function StaffProtected({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
        if (!loading && user && !STAFF_ROLES.includes(user.role)) {
            // Redirect non-staff to appropriate portal
            if (user.role === 'parent') router.push('/parent');
            else router.push('/dashboard');
        }
    }, [user, loading, router]);

    // Close mobile menu on route change
    useEffect(() => { setMobileOpen(false); }, [pathname]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-sky-100 border-t-sky-600" />
            </div>
        );
    }

    if (!user || !STAFF_ROLES.includes(user.role)) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex lg:w-60 xl:w-64 flex-col bg-white border-r border-slate-100 h-screen sticky top-0 overflow-y-auto">
                <StaffNav />
            </aside>

            {/* Mobile overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                            onClick={() => setMobileOpen(false)}
                        />
                        <motion.aside
                            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                            className="fixed left-0 top-0 h-full w-64 bg-white z-50 lg:hidden shadow-xl"
                        >
                            <StaffNav mobile onClose={() => setMobileOpen(false)} />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="sticky top-0 z-30 bg-white border-b border-slate-100 px-4 sm:px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileOpen(true)}
                            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <Menu size={18} />
                        </button>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#6c5ce7]">Staff Portal</p>
                            <p className="text-sm font-bold text-slate-900">{user.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-semibold shadow-sm">
                            <GraduationCap size={15} className="text-[#6c5ce7]" />
                            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f1f0ff] rounded-full border border-[#e5e0ff] shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                            <span className="text-xs font-bold text-[#6c5ce7] uppercase tracking-wider">{user.role}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6">
                    <div className="mx-auto w-full max-w-5xl">
                        {children}
                    </div>
                </main>

                <footer className="px-6 py-3 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
                    <span>EduCare Staff Portal · {new Date().getFullYear()}</span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Online
                    </span>
                </footer>
            </div>
        </div>
    );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '12px', fontSize: '13px' } }} />
            <StaffProtected>{children}</StaffProtected>
        </AuthProvider>
    );
}
