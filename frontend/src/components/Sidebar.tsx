'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid, Users, CalendarCheck, CreditCard, FileText,
    Wallet, Bell, LogOut, ChevronRight,
    Building2, GraduationCap, MessageSquare, ClipboardList,
    Receipt, Scale, Shield, Lightbulb, Home, BookOpen,
    Menu, X,
    type LucideIcon
} from 'lucide-react';

interface MenuItem {
    label: string;
    href?: string;
    icon: LucideIcon;
    children?: { label: string; href: string }[];
}

const adminMenuItems: MenuItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    {
        label: 'Front Desk', icon: Building2,
        children: [
            { label: 'Admission Enquiry', href: '/front-desk/enquiry' },
            { label: 'Gate Pass', href: '/front-desk/gate-pass' },
            { label: 'Visitors', href: '/front-desk/visitors' },
            { label: 'Postal Records', href: '/front-desk/postal' },
            { label: 'Lost & Found', href: '/front-desk/lost-found' },
        ],
    },
    {
        label: 'Students', icon: GraduationCap,
        children: [
            { label: 'All Students', href: '/students' },
            { label: 'Add Student', href: '/students/new' },
            { label: 'Bulk Upload', href: '/students/bulk-upload' },
            { label: 'Promotion', href: '/students/promotion' },
            { label: 'Withdrawal Logs', href: '/students/withdrawal' },
            { label: 'Inactive Students', href: '/students/inactive' },
            { label: 'Transfer Certificates', href: '/students/certificates' },
            { label: 'ID Cards', href: '/students/id-card' },
            { label: 'Student Reports', href: '/students/dashboard' },
        ],
    },
    {
        label: 'Staff', icon: Users,
        children: [
            { label: 'All Staff', href: '/staff' },
            { label: 'Assign Teachers', href: '/hr/assign-teachers' },
            { label: 'Leave Management', href: '/hr/leaves' },
            { label: 'Process Payroll', href: '/hr/payroll' },
            { label: 'Staff ID Cards', href: '/hr/id-card' },
            { label: 'HR Dashboard', href: '/hr/dashboard' },
        ],
    },
    {
        label: 'Attendance', icon: CalendarCheck,
        children: [
            { label: 'Student Attendance', href: '/attendance' },
            { label: 'Staff Attendance', href: '/attendance/staff' },
            { label: 'Attendance Reports', href: '/attendance/dashboard' },
        ],
    },
    {
        label: 'Communication', icon: MessageSquare,
        children: [
            { label: 'Send Messages', href: '/communication/bulk' },
            { label: 'Message Templates', href: '/communication/templates' },
            { label: 'Delivery Reports', href: '/communication/reports' },
        ],
    },
    {
        label: 'Examinations', icon: ClipboardList,
        children: [
            { label: 'Exams Overview', href: '/exams' },
            { label: 'Exam Settings', href: '/exams/settings' },
            { label: 'Enter Marks', href: '/exams/entries' },
            { label: 'Board Settings', href: '/board' },
            { label: 'Co-Scholastic', href: '/board/co-scholastic' },
            { label: 'Generate Report Cards', href: '/board/report-cards' },
        ],
    },
    {
        label: 'Accounts', icon: Wallet,
        children: [
            { label: 'Income', href: '/accounts/income' },
            { label: 'Expenses', href: '/accounts/expenses' },
            { label: 'Vendor Bills', href: '/accounts/vendor-bills' },
            { label: 'Accounts Dashboard', href: '/accounts/dashboard' },
        ],
    },
    {
        label: 'Fees', icon: CreditCard,
        children: [
            { label: 'Collect Fees', href: '/fees' },
            { label: 'Fee Reports', href: '/fees/reports' },
            { label: 'Fee Setup', href: '/fees/setup' },
            { label: 'Fee Dashboard', href: '/fees/dashboard' },
            { label: 'Payment Instruments', href: '/payments/advanced' },
        ],
    },
    {
        label: 'Tax & Payroll', icon: Receipt,
        children: [
            { label: 'Tax Settings', href: '/tax' },
            { label: 'Salary Structure', href: '/tax/salary-structure' },
        ],
    },
    {
        label: 'Compliance', icon: Scale,
        children: [
            { label: 'RTE Management', href: '/rte' },
            { label: 'UDISE Reports', href: '/udise' },
        ],
    },
    { label: 'Notices', href: '/notices', icon: Bell },
    { label: 'Team', href: '/team', icon: Shield },
    { label: 'Smart Alerts', href: '/alerts', icon: Lightbulb },
];

const accountantMenuItems: MenuItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    {
        label: 'Accounts', icon: Wallet,
        children: [
            { label: 'Income', href: '/accounts/income' },
            { label: 'Expenses', href: '/accounts/expenses' },
            { label: 'Vendor Bills', href: '/accounts/vendor-bills' },
            { label: 'Accounts Dashboard', href: '/accounts/dashboard' },
        ],
    },
    {
        label: 'Fees', icon: CreditCard,
        children: [
            { label: 'Collect Fees', href: '/fees' },
            { label: 'Fee Reports', href: '/fees/reports' },
            { label: 'Fee Dashboard', href: '/fees/dashboard' },
            { label: 'Payment Instruments', href: '/payments/advanced' },
            { label: 'Vendor Bills', href: '/accounts/vendor-bills' },
            { label: 'Payroll Overview', href: '/hr/payroll' },
        ],
    },
    { label: 'Smart Alerts', href: '/alerts', icon: Lightbulb },
];

const teacherMenuItems: MenuItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    { label: 'Students', href: '/students', icon: GraduationCap },
    { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
    { label: 'Visitors', href: '/front-desk/visitors', icon: Building2 },
    { label: 'Examinations', href: '/exams', icon: ClipboardList },
    { label: 'Co-Scholastic', href: '/board/co-scholastic', icon: FileText },
    { label: 'Notices', href: '/notices', icon: Bell },
    { label: 'Smart Alerts', href: '/alerts', icon: Lightbulb },
];

const frontDeskMenuItems: MenuItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    {
        label: 'Front Desk', icon: Building2,
        children: [
            { label: 'Admission Enquiry', href: '/front-desk/enquiry' },
            { label: 'Gate Pass', href: '/front-desk/gate-pass' },
            { label: 'Visitors', href: '/front-desk/visitors' },
            { label: 'Postal Records', href: '/front-desk/postal' },
            { label: 'Lost & Found', href: '/front-desk/lost-found' },
        ],
    },
    { label: 'Smart Alerts', href: '/alerts', icon: Lightbulb },
];

const hrMenuItems: MenuItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    {
        label: 'Staff', icon: Users,
        children: [
            { label: 'All Staff', href: '/staff' },
            { label: 'Assign Teachers', href: '/hr/assign-teachers' },
            { label: 'HR Dashboard', href: '/hr/dashboard' },
        ],
    },
    { label: 'Staff Attendance', href: '/attendance/staff', icon: CalendarCheck },
    {
        label: 'Tax & Payroll', icon: Receipt,
        children: [
            { label: 'Salary Structure', href: '/tax/salary-structure' },
            { label: 'Process Payroll', href: '/hr/payroll' },
            { label: 'Tax Settings', href: '/tax' },
        ],
    },
    { label: 'Leave Management', href: '/hr/leaves', icon: ClipboardList },
    { label: 'Smart Alerts', href: '/alerts', icon: Lightbulb },
];

const parentMenuItems: MenuItem[] = [
    { label: 'Home', href: '/parent', icon: Home },
    { label: 'Attendance', href: '/parent/attendance', icon: CalendarCheck },
    { label: 'Fees', href: '/parent/fees', icon: CreditCard },
    { label: 'Results', href: '/parent/results', icon: FileText },
    { label: 'Homework', href: '/parent/homework', icon: BookOpen },
    { label: 'Notices', href: '/parent/notices', icon: Bell },
];

function getMenuForRole(role?: string): MenuItem[] {
    switch (role) {
        case 'tenant_admin': case 'owner': case 'co-owner': case 'super_admin': case 'admin':
            return adminMenuItems;
        case 'accountant': return accountantMenuItems;
        case 'teacher': case 'staff': return teacherMenuItems;
        case 'front_desk': return frontDeskMenuItems;
        case 'hr_manager': return hrMenuItems;
        case 'parent': return parentMenuItems;
        default: return teacherMenuItems;
    }
}

function getRoleBadge(role: string) {
    const map: Record<string, { label: string; cls: string }> = {
        tenant_admin: { label: 'Admin', cls: 'bg-[#6c5ce7] text-white' },
        owner: { label: 'Owner', cls: 'bg-[#6c5ce7] text-white' },
        'co-owner': { label: 'Co-Owner', cls: 'bg-[#6c5ce7] text-white' },
        super_admin: { label: 'Super Admin', cls: 'bg-[#6c5ce7] text-white' },
        admin: { label: 'Admin', cls: 'bg-[#6c5ce7] text-white' },
        accountant: { label: 'Accountant', cls: 'bg-emerald-50 text-emerald-700' },
        teacher: { label: 'Teacher', cls: 'bg-blue-50 text-blue-700' },
        front_desk: { label: 'Front Desk', cls: 'bg-cyan-50 text-cyan-700' },
        hr_manager: { label: 'HR Manager', cls: 'bg-rose-50 text-rose-700' },
        parent: { label: 'Parent', cls: 'bg-green-50 text-green-700' },
    };
    return map[role] || { label: role, cls: 'bg-gray-50 text-gray-600' };
}

export default function Sidebar() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const menuItems = getMenuForRole(user?.role);
    const badge = getRoleBadge(user?.role || '');

    const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');
    const getBestChildMatch = (children: { label: string; href: string }[]) => {
        const matches = children
            .filter((child) => isActive(child.href))
            .sort((a, b) => b.href.length - a.href.length);
        return matches[0]?.href || null;
    };

    const toggleMenu = (label: string, currentOpen: boolean) => {
        setOpenMenus((prev) => ({ ...prev, [label]: !currentOpen }));
    };

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 px-4 flex items-center justify-between z-[60]">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm" style={{ background: 'linear-gradient(135deg, #6c5ce7, #8e44ad)' }}>E</div>
                    <span className="font-bold text-gray-900">EduCare</span>
                </div>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="p-2 bg-gray-50 rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
                >
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                        onClick={() => setMobileOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 h-full z-[55] bg-white border-r border-gray-100 w-[260px] transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>

                {/* Brand */}
                <div className="h-16 flex items-center px-5 gap-3 shrink-0 border-b border-gray-50">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm" style={{ background: 'linear-gradient(135deg, #6c5ce7, #8e44ad)' }}>
                        E
                    </div>
                    <div>
                        <span className="text-base font-bold text-gray-900 leading-none">EduCare ERP</span>
                        <p className="text-xs text-gray-400 font-medium leading-none mt-0.5">by Concilio</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                    {menuItems.map((item) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const Icon = item.icon;
                        const active = !hasChildren && isActive(item.href!);
                        const activeChildHref = hasChildren ? getBestChildMatch(item.children!) : null;
                        const childActive = Boolean(activeChildHref);
                        const isOpen = openMenus[item.label] ?? childActive;

                        if (hasChildren) {
                            return (
                                <div key={item.label}>
                                    <button
                                        onClick={() => toggleMenu(item.label, isOpen)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${childActive ? 'bg-[#f1f0ff] text-[#6c5ce7] font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" strokeWidth={childActive ? 2.5 : 2} />
                                        <span className="flex-1 text-[13px] font-medium text-left">{item.label}</span>
                                        <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                                        </motion.div>
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="ml-7 pl-3 border-l border-gray-100 mt-0.5 mb-1 space-y-0.5">
                                                    {item.children!.map(child => {
                                                        const cActive = activeChildHref === child.href;
                                                        return (
                                                            <Link
                                                                key={child.href}
                                                                href={child.href}
                                                                onClick={() => setMobileOpen(false)}
                                                                className={`block px-3 py-1.5 rounded-lg text-[13px] transition-all ${cActive ? 'text-[#6c5ce7] bg-[#f1f0ff] font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
                                                            >
                                                                {child.label}
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.label}
                                href={item.href || '#'}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${active ? 'bg-[#f1f0ff] text-[#6c5ce7] font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                            >
                                <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.5 : 2} />
                                <span className="text-[13px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile */}
                <div className="p-3 border-t border-gray-100 shrink-0">
                    <div className="flex items-center gap-3 px-2 py-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-[#f1f0ff] flex items-center justify-center text-[#6c5ce7] font-black text-sm shrink-0">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
                            <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-md ${badge.cls}`}>
                                {badge.label}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-all"
                    >
                        <LogOut className="w-4 h-4" strokeWidth={2} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Desktop Spacer */}
            <div className="hidden lg:block w-[260px] shrink-0" />
        </>
    );
}
