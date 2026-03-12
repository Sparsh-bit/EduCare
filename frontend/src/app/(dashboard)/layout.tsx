'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, Sparkles } from 'lucide-react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'react-hot-toast';

function routeTitle(pathname: string | null): string {
    if (!pathname || pathname === '/') return 'Dashboard';

    const clean = pathname
        .replace(/^\//, '')
        .replace(/\(dashboard\)\//g, '')
        .split('/')
        .filter(Boolean);

    const mapped = clean[0] || 'dashboard';
    switch (mapped) {
        case 'dashboard':
            return 'Operations Dashboard';
        case 'students':
            return 'Student Management';
        case 'attendance':
            return 'Attendance Control';
        case 'fees':
            return 'Fees & Collections';
        case 'accounts':
            return 'Accounts & Finance';
        case 'exams':
            return 'Examinations';
        case 'front-desk':
            return 'Front Desk';
        case 'communication':
            return 'Communication';
        case 'hr':
            return 'Human Resources';
        case 'tax':
            return 'Tax & Payroll';
        case 'board':
            return 'Board & Reports';
        case 'alerts':
            return 'Alerts & AI Assistant';
        default:
            return mapped
                .split('-')
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
    }
}

function ProtectedContent({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    const todayLabel = useMemo(
        () =>
            new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            }),
        []
    );

    const pageTitle = routeTitle(pathname);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-900/20 border-t-cyan-700" />
                    <p className="text-sm font-semibold tracking-wide text-slate-600">Loading workspace...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="dashboard-area relative min-h-screen overflow-x-hidden bg-slate-100">
            <div className="pointer-events-none absolute inset-0 opacity-70">
                <div className="absolute -left-40 top-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-300/20 blur-3xl" />
                <div className="absolute -right-32 top-24 h-[320px] w-[320px] rounded-full bg-emerald-300/20 blur-3xl" />
            </div>

            <div className="relative flex min-h-screen">
                <Sidebar />

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
                        <div className="mx-auto flex w-full max-w-[1520px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">EduCare ERP</p>
                                <h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">{pageTitle}</h1>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="hidden items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm sm:inline-flex">
                                    <CalendarDays className="h-4 w-4 text-cyan-700" />
                                    {todayLabel}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-300 shadow-sm">
                                    <Sparkles className="h-4 w-4" />
                                    Live Data
                                </span>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 p-4 sm:p-6 lg:p-8">
                        <div className="mx-auto w-full max-w-[1520px]">{children}</div>
                    </main>
                </div>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        borderRadius: '12px',
                        fontSize: '14px',
                        padding: '12px 20px',
                        background: '#0f172a',
                        color: '#f8fafc',
                        border: '1px solid rgba(148, 163, 184, 0.35)',
                    },
                }}
            />
            <ProtectedContent>{children}</ProtectedContent>
        </AuthProvider>
    );
}
