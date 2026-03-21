'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, Bell, CheckCircle2, AlertTriangle, Info, XCircle, X, Trash2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationProvider, useNotifications, type Notification } from '@/contexts/NotificationContext';
import ErrorBoundary from '@/components/ErrorBoundary';

const notifIcons: Record<string, React.ElementType> = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};
const notifColors: Record<string, string> = {
    success: 'text-emerald-600 bg-emerald-50',
    error: 'text-rose-600 bg-rose-50',
    warning: 'text-amber-600 bg-amber-50',
    info: 'text-[#6c5ce7] bg-[#f1f0ff]',
};

function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
    const { notifications, markAllRead, dismiss, clearAll } = useNotifications();

    useEffect(() => { markAllRead(); }, [markAllRead]);

    return (
        <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden"
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                <div className="flex items-center gap-1">
                    {notifications.length > 0 && (
                        <button onClick={clearAll} className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Clear all">
                            <Trash2 size={13} />
                        </button>
                    )}
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={13} />
                    </button>
                </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="py-12 text-center">
                        <Bell size={28} className="text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">No notifications yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {notifications.map((n: Notification) => {
                            const Icon = notifIcons[n.type] || Info;
                            const color = notifColors[n.type] || notifColors.info;
                            return (
                                <div key={n.id} className="flex gap-3 px-4 py-3 hover:bg-gray-50/60 group transition-colors">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                                        <Icon size={13} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-gray-900 leading-snug">{n.title}</p>
                                        {n.message && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>}
                                        <p className="text-[11px] text-gray-300 mt-1">{timeAgo(n.timestamp)}</p>
                                    </div>
                                    <button
                                        onClick={() => dismiss(n.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-gray-500 rounded-lg transition-all shrink-0 self-start mt-0.5"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

interface RouteInfo { category: string; title: string; }

function getRouteInfo(pathname: string | null): RouteInfo {
    if (!pathname || pathname === '/') return { category: 'HOME', title: 'Dashboard' };

    const clean = pathname
        .replace(/^\//, '')
        .replace(/\(dashboard\)\//g, '')
        .split('/')
        .filter(Boolean);

    const segment = clean[0] || 'dashboard';
    const subSegment = clean[1];

    switch (segment) {
        case 'dashboard': return { category: 'OVERVIEW', title: 'Dashboard' };
        case 'students': {
            if (subSegment === 'new') return { category: 'STUDENTS', title: 'Add Student' };
            if (subSegment === 'inactive') return { category: 'STUDENTS', title: 'Inactive Students' };
            if (subSegment === 'certificates') return { category: 'STUDENTS', title: 'Certificates' };
            if (subSegment === 'id-card') return { category: 'STUDENTS', title: 'ID Cards' };
            if (subSegment === 'dashboard') return { category: 'STUDENTS', title: 'Student Reports' };
            if (subSegment === 'bulk-upload') return { category: 'STUDENTS', title: 'Bulk Upload' };
            if (subSegment === 'promotion') return { category: 'STUDENTS', title: 'Student Promotion' };
            if (subSegment === 'withdrawal') return { category: 'STUDENTS', title: 'Withdrawal Logs' };
            return { category: 'MANAGEMENT', title: 'Students' };
        }
        case 'attendance': {
            if (subSegment === 'staff') return { category: 'ATTENDANCE', title: 'Staff Attendance' };
            if (subSegment === 'dashboard') return { category: 'ATTENDANCE', title: 'Attendance Reports' };
            return { category: 'MANAGEMENT', title: 'Attendance' };
        }
        case 'fees': {
            if (subSegment === 'reports') return { category: 'FEES', title: 'Fee Reports' };
            if (subSegment === 'setup') return { category: 'FEES', title: 'Fee Setup' };
            if (subSegment === 'dashboard') return { category: 'FEES', title: 'Fee Dashboard' };
            return { category: 'FINANCE', title: 'Collect Fees' };
        }
        case 'accounts': {
            if (subSegment === 'income') return { category: 'ACCOUNTS', title: 'Income' };
            if (subSegment === 'expenses') return { category: 'ACCOUNTS', title: 'Expenses' };
            if (subSegment === 'vendor-bills') return { category: 'ACCOUNTS', title: 'Vendor Bills' };
            if (subSegment === 'dashboard') return { category: 'ACCOUNTS', title: 'Accounts Dashboard' };
            return { category: 'FINANCE', title: 'Accounts' };
        }
        case 'exams': return { category: 'ACADEMICS', title: 'Examinations' };
        case 'front-desk': {
            if (subSegment === 'enquiry') return { category: 'FRONT DESK', title: 'Admission Enquiry' };
            if (subSegment === 'gate-pass') return { category: 'FRONT DESK', title: 'Gate Pass' };
            if (subSegment === 'visitors') return { category: 'FRONT DESK', title: 'Visitors' };
            if (subSegment === 'postal') return { category: 'FRONT DESK', title: 'Postal Records' };
            if (subSegment === 'lost-found') return { category: 'FRONT DESK', title: 'Lost & Found' };
            return { category: 'OPERATIONS', title: 'Front Desk' };
        }
        case 'communication': return { category: 'COMMUNICATION', title: 'Messaging' };
        case 'hr': {
            if (subSegment === 'assign-teachers') return { category: 'HUMAN RESOURCES', title: 'Assign Teachers' };
            if (subSegment === 'id-card') return { category: 'HUMAN RESOURCES', title: 'Staff ID Cards' };
            if (subSegment === 'dashboard') return { category: 'HUMAN RESOURCES', title: 'HR Dashboard' };
            if (subSegment === 'leaves') return { category: 'HUMAN RESOURCES', title: 'Leave Management' };
            if (subSegment === 'payroll') return { category: 'HUMAN RESOURCES', title: 'Payroll Processing' };
            return { category: 'PEOPLE', title: 'Human Resources' };
        }
        case 'staff': return { category: 'PEOPLE', title: 'Staff Management' };
        case 'tax': {
            if (subSegment === 'salary-structure') return { category: 'TAX & PAYROLL', title: 'Salary Structure' };
            return { category: 'FINANCE', title: 'Tax & Payroll' };
        }
        case 'board': {
            if (subSegment === 'co-scholastic') return { category: 'REPORT CARDS', title: 'Co-Scholastic' };
            if (subSegment === 'report-cards') return { category: 'REPORT CARDS', title: 'Generate Report Cards' };
            return { category: 'ACADEMICS', title: 'Board Settings' };
        }
        case 'alerts': return { category: 'MONITORING', title: 'Smart Alerts' };
        case 'notices': return { category: 'COMMUNICATION', title: 'Notices' };
        case 'team': return { category: 'SETTINGS', title: 'Team' };
        case 'rte': return { category: 'COMPLIANCE', title: 'RTE Management' };
        case 'udise': return { category: 'COMPLIANCE', title: 'UDISE Reports' };
        case 'payments': return { category: 'FINANCE', title: 'Payment Instruments' };
        default:
            return {
                category: 'MANAGEMENT',
                title: segment.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
            };
    }
}

function ProtectedContent({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    // Sidebar manages its own mobile state via the hamburger in the mobile header
    // We track a ref only for potential programmatic close — sidebar is self-contained

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (!loading && !user) router.push('/login');
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

    const [notifOpen, setNotifOpen] = useState(false);
    const { unreadCount, addNotification } = useNotifications();
    const routeInfo = getRouteInfo(pathname);

    useEffect(() => {
        if (!user) return;
        const sessionKey = `educare_session_notified_${user.id}`;
        if (typeof window !== 'undefined' && !sessionStorage.getItem(sessionKey)) {
            sessionStorage.setItem(sessionKey, '1');
            addNotification(
                'success',
                `Welcome back, ${user.name?.split(' ')[0] || 'there'}!`,
                `Logged in as ${user.role} · ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
            );
        }
    }, [user, addNotification]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb]">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#f1f0ff] border-t-[#6c5ce7]" />
                    <p className="text-sm text-gray-400 font-medium">Loading EduCare ERP...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="relative min-h-screen bg-[#f8f9fb]">
            {/* Decorative blobs */}
            <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-[0.08] blur-[120px] pointer-events-none animate-pulse-slow" style={{ background: 'linear-gradient(135deg, #6c5ce7, #a855f7)' }} />
            <div className="fixed bottom-[-10%] left-[20%] w-[400px] h-[400px] rounded-full opacity-[0.06] blur-[100px] pointer-events-none animate-pulse-slow" style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', animationDelay: '2s' }} />
            <div className="fixed top-[20%] left-[-5%] w-[300px] h-[300px] rounded-full opacity-[0.04] blur-[80px] pointer-events-none animate-pulse-slow" style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', animationDelay: '4s' }} />

            <div className="relative flex min-h-screen">
                <Sidebar />

                <div className="flex min-w-0 flex-1 flex-col pt-16 lg:pt-0">
                    {/* Header */}
                    <header
                        className={`sticky top-0 z-[40] transition-all duration-300 ${
                            scrolled ? 'bg-white/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.02)]' : 'bg-transparent'
                        } border-b border-gray-100/50`}
                    >
                        <div className="flex w-full items-center justify-between gap-4 px-5 lg:px-8 py-3.5">
                            {/* Left: Mobile hamburger + Breadcrumb */}
                            <div className="flex items-center gap-3 min-w-0">
                                        {/* Mobile hamburger is in Sidebar's own mobile header */}
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-none mb-0.5 hidden sm:block">
                                        {routeInfo.category}
                                    </p>
                                    <h1 className="text-base font-extrabold text-gray-900 leading-tight truncate">
                                        {routeInfo.title}
                                    </h1>
                                </div>
                            </div>

                            {/* Right: Date + Live badge + Notifications */}
                            <div className="flex items-center gap-2.5 shrink-0">
                                {/* Date */}
                                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500 font-medium">
                                    <CalendarDays size={13} className="text-[#6c5ce7]" />
                                    {todayLabel}
                                </div>

                                {/* Live Data badge */}
                                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-semibold text-emerald-700">✦ Live Data</span>
                                </div>

                                {/* Notification bell */}
                                <div className="relative">
                                    <button
                                        onClick={() => setNotifOpen(v => !v)}
                                        className="p-2 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-[#6c5ce7] hover:bg-[#f1f0ff] hover:border-[#6c5ce7]/20 transition-all"
                                    >
                                        <Bell size={16} />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 border-[1.5px] border-white rounded-full flex items-center justify-center text-[9px] text-white font-bold px-0.5">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </button>
                                    <AnimatePresence>
                                        {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Main content */}
                    <main className="flex-1 p-4 sm:p-6 lg:p-8">
                        <ErrorBoundary>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={pathname}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] } }}
                                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                                    className="mx-auto w-full max-w-[1520px]"
                                >
                                    {children}
                                </motion.div>
                            </AnimatePresence>
                        </ErrorBoundary>
                    </main>

                    <footer className="px-6 lg:px-8 py-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-400">
                            &copy; {new Date().getFullYear()} <span className="font-semibold text-gray-500">Concilio</span> EduCare
                        </p>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-xs text-gray-400">All systems online</span>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <NotificationProvider>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: '500',
                            padding: '12px 16px',
                            background: '#ffffff',
                            color: '#111827',
                            border: '1px solid #f3f4f6',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                        },
                    }}
                />
                <ProtectedContent>{children}</ProtectedContent>
            </NotificationProvider>
        </AuthProvider>
    );
}
