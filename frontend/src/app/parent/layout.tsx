'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';

function ParentProtected({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.push('/login');
        if (!loading && user && user.role !== 'parent') router.push('/dashboard');
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-900/20 border-t-cyan-700" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="dashboard-area min-h-screen bg-slate-100">
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
                        <div className="mx-auto flex w-full max-w-[1520px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Parent Portal</p>
                                <h1 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">Welcome, {user.name}</h1>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm">
                                <CalendarDays className="h-4 w-4 text-cyan-700" />
                                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
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

export default function ParentLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <ParentProtected>{children}</ParentProtected>
        </AuthProvider>
    );
}
