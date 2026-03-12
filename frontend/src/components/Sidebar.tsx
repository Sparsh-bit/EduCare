'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutGrid, Users, CalendarCheck, CreditCard, FileText,
    Wallet, Bell, LogOut, ChevronDown, ChevronRight,
    Building2, GraduationCap, MessageSquare, ClipboardList,
    Receipt, Scale, Shield, Bot, Home, BookOpen,
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
            { label: 'Active Students', href: '/students' },
            { label: 'Add Student', href: '/students/new' },
            { label: 'Inactive Students', href: '/students/inactive' },
            { label: 'Certificates', href: '/students/certificates' },
            { label: 'ID Card', href: '/students/id-card' },
            { label: 'Student Dashboard', href: '/students/dashboard' },
        ],
    },
    {
        label: 'Human Resource', icon: Users,
        children: [
            { label: 'Manage Employees', href: '/staff' },
            { label: 'Assign Teachers', href: '/hr/assign-teachers' },
            { label: 'Staff ID Card', href: '/hr/id-card' },
            { label: 'HR Dashboard', href: '/hr/dashboard' },
        ],
    },
    {
        label: 'Attendance', icon: CalendarCheck,
        children: [
            { label: 'Student Attendance', href: '/attendance' },
            { label: 'Employee Attendance', href: '/attendance/staff' },
            { label: 'Attendance Dashboard', href: '/attendance/dashboard' },
        ],
    },
    {
        label: 'Communication', icon: MessageSquare,
        children: [
            { label: 'Bulk Messages', href: '/communication/bulk' },
            { label: 'SMS Templates', href: '/communication/templates' },
            { label: 'Delivery Report', href: '/communication/reports' },
        ],
    },
    {
        label: 'Examination', icon: ClipboardList,
        children: [
            { label: 'Exam Dashboard', href: '/exams' },
            { label: 'Exam Settings', href: '/exams/settings' },
            { label: 'Report Card Entries', href: '/exams/entries' },
            { label: 'Board Configuration', href: '/board' },
            { label: 'Co-Scholastic Grading', href: '/board/co-scholastic' },
            { label: 'Generate Report Cards', href: '/board/report-cards' },
        ],
    },
    {
        label: 'Accounts', icon: Wallet,
        children: [
            { label: 'Income Report', href: '/accounts/income' },
            { label: 'Manage Expense', href: '/accounts/expenses' },
            { label: 'Vendor Bills', href: '/accounts/vendor-bills' },
            { label: 'Accounts Dashboard', href: '/accounts/dashboard' },
        ],
    },
    {
        label: 'Fees', icon: CreditCard,
        children: [
            { label: 'Fee Payment', href: '/fees' },
            { label: 'Fee Reports', href: '/fees/reports' },
            { label: 'Fees Setup', href: '/fees/setup' },
            { label: 'Fees Dashboard', href: '/fees/dashboard' },
            { label: 'Payment Instruments', href: '/payments/advanced' },
        ],
    },
    {
        label: 'Tax & Payroll', icon: Receipt,
        children: [
            { label: 'Tax Configuration', href: '/tax' },
            { label: 'Salary Structure', href: '/tax/salary-structure' },
        ],
    },
    {
        label: 'Compliance', icon: Scale,
        children: [
            { label: 'RTE Management', href: '/rte' },
            { label: 'UDISE+ Reports', href: '/udise' },
        ],
    },
    { label: 'Notices', href: '/notices', icon: Bell },
    { label: 'Team', href: '/team', icon: Shield },
    { label: 'AI Assistant', href: '/alerts', icon: Bot },
];

const accountantMenuItems: MenuItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    {
        label: 'Accounts', icon: Wallet,
        children: [
            { label: 'Income Report', href: '/accounts/income' },
            { label: 'Manage Expense', href: '/accounts/expenses' },
            { label: 'Vendor Bills', href: '/accounts/vendor-bills' },
            { label: 'Accounts Dashboard', href: '/accounts/dashboard' },
        ],
    },
    {
        label: 'Fees', icon: CreditCard,
        children: [
            { label: 'Fee Payment', href: '/fees' },
            { label: 'Fee Reports', href: '/fees/reports' },
            { label: 'Fees Dashboard', href: '/fees/dashboard' },
            { label: 'Payment Instruments', href: '/payments/advanced' },
        ],
    },
    { label: 'AI Assistant', href: '/alerts', icon: Bot },
];

const teacherMenuItems: MenuItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    { label: 'Students', href: '/students', icon: GraduationCap },
    { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
    { label: 'Visitors', href: '/front-desk/visitors', icon: Building2 },
    { label: 'Examinations', href: '/exams', icon: ClipboardList },
    { label: 'Co-Scholastic', href: '/board/co-scholastic', icon: FileText },
    { label: 'Notices', href: '/notices', icon: Bell },
    { label: 'AI Assistant', href: '/alerts', icon: Bot },
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
    { label: 'AI Assistant', href: '/alerts', icon: Bot },
];

const hrMenuItems: MenuItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    {
        label: 'Human Resource', icon: Users,
        children: [
            { label: 'Manage Employees', href: '/staff' },
            { label: 'Assign Teachers', href: '/hr/assign-teachers' },
            { label: 'HR Dashboard', href: '/hr/dashboard' },
        ],
    },
    { label: 'Employee Attendance', href: '/attendance/staff', icon: CalendarCheck },
    {
        label: 'Tax & Payroll', icon: Receipt,
        children: [
            { label: 'Salary Structure', href: '/tax/salary-structure' },
            { label: 'Process Payroll', href: '/tax' },
        ],
    },
    { label: 'AI Assistant', href: '/alerts', icon: Bot },
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
        tenant_admin: { label: 'Tenant Admin', cls: 'bg-amber-50 text-amber-700' },
        owner: { label: 'Admin', cls: 'bg-amber-50 text-amber-700' },
        'co-owner': { label: 'Co-Admin', cls: 'bg-purple-50 text-purple-700' },
        super_admin: { label: 'Super Admin', cls: 'bg-red-50 text-red-700' },
        admin: { label: 'Admin', cls: 'bg-indigo-50 text-indigo-700' },
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
    const toggleMenu = (label: string) => setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));

    return (
        <>
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-[60] p-2.5 bg-white rounded-xl shadow-lg border border-gray-100 text-[#6c5ce7] hover:bg-[#f1f0ff] transition-colors"
            >
                {mobileOpen ? '\u2715' : '\u2630'}
            </button>

            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={() => setMobileOpen(false)} />
            )}

            <aside className={`fixed top-0 left-0 h-full z-50 bg-white border-r border-[#f0f1f4] w-[270px] transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
                <div className="h-[72px] flex items-center px-6 gap-3 shrink-0 border-b border-[#f0f1f4]">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#6c5ce7] to-[#8e44ad] rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-[#6c5ce7]/25">
                        S
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-black text-[#1e1e2d] tracking-tight leading-none">Schoooli</span>
                        <span className="text-[9px] font-bold text-[#6c5ce7] tracking-[0.2em] uppercase mt-0.5">Management</span>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    {menuItems.map((item) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const Icon = item.icon;
                        const active = !hasChildren && isActive(item.href!);
                        const childActive = hasChildren && item.children!.some(c => isActive(c.href));
                        const isOpen = openMenus[item.label] || childActive;

                        if (hasChildren) {
                            return (
                                <div key={item.label}>
                                    <button
                                        onClick={() => toggleMenu(item.label)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-left ${childActive ? 'bg-[#f1f0ff] text-[#6c5ce7]' : 'text-[#7b7e8c] hover:bg-gray-50 hover:text-[#1e1e2d]'}`}
                                    >
                                        <div className={`p-1.5 rounded-lg transition-colors ${childActive ? 'bg-white shadow-sm text-[#6c5ce7]' : 'group-hover:text-[#6c5ce7]'}`}>
                                            <Icon className="w-[18px] h-[18px]" strokeWidth={childActive ? 2.5 : 2} />
                                        </div>
                                        <span className="flex-1 text-[13px] font-semibold">{item.label}</span>
                                        {isOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-40" />}
                                    </button>
                                    {isOpen && (
                                        <div className="ml-[42px] mt-1 mb-1 space-y-0.5 border-l-2 border-[#f0f1f4] pl-3">
                                            {item.children!.map(child => {
                                                const cActive = isActive(child.href);
                                                return (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        onClick={() => setMobileOpen(false)}
                                                        className={`block px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors ${cActive ? 'text-[#6c5ce7] bg-[#f1f0ff] font-semibold' : 'text-[#7b7e8c] hover:text-[#1e1e2d] hover:bg-gray-50'}`}
                                                    >
                                                        {child.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.label}
                                href={item.href || '#'}
                                onClick={() => setMobileOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${active ? 'bg-[#f1f0ff] text-[#6c5ce7]' : 'text-[#7b7e8c] hover:bg-gray-50 hover:text-[#1e1e2d]'}`}
                            >
                                <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-white shadow-sm text-[#6c5ce7]' : 'group-hover:text-[#6c5ce7]'}`}>
                                    <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.5 : 2} />
                                </div>
                                <span className="text-[13px] font-semibold">{item.label}</span>
                                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#6c5ce7]" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-[#f0f1f4] shrink-0 space-y-2">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-9 h-9 rounded-xl bg-[#f1f0ff] flex items-center justify-center text-[#6c5ce7] font-bold text-sm shrink-0">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-[#1e1e2d] truncate">{user?.name || 'User'}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.cls}`}>
                                {badge.label}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-[13px] text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            <div className="hidden lg:block w-[270px] shrink-0" />
        </>
    );
}
