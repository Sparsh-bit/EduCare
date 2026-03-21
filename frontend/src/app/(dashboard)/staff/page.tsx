'use client';
import { useState, useEffect, useRef } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { StaffMember } from '@/lib/types';
import { toast } from 'react-hot-toast';
import {
    Users, Plus, Search, MoreVertical, UserCircle, Pencil,
    Wallet, Shield, PowerOff, ChevronDown, X,
} from 'lucide-react';
import Link from 'next/link';

const STATUS_BADGE: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    inactive: 'bg-slate-100 text-slate-500 border-slate-200',
    on_leave: 'bg-amber-50 text-amber-700 border-amber-100',
};

const initialForm = {
    name: '', employee_id: '', designation: '', department: '',
    phone: '', email: '', salary: '', is_teacher: false,
};

function ActionsMenu({ staff, onDeactivate }: { staff: StaffMember; onDeactivate: (id: number) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(o => !o)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
                <MoreVertical size={16} />
            </button>
            {open && (
                <div className="absolute right-0 top-8 w-44 bg-white rounded-xl border border-slate-100 shadow-lg z-20 overflow-hidden">
                    <Link
                        href={`/staff/${staff.id}`}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setOpen(false)}
                    >
                        <UserCircle size={14} className="text-slate-400" />
                        View Profile
                    </Link>
                    <Link
                        href={`/staff/${staff.id}/edit`}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setOpen(false)}
                    >
                        <Pencil size={14} className="text-slate-400" />
                        Edit
                    </Link>
                    <Link
                        href={`/tax/salary-structure`}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setOpen(false)}
                    >
                        <Wallet size={14} className="text-slate-400" />
                        Salary Details
                    </Link>
                    <Link
                        href={`/attendance`}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setOpen(false)}
                    >
                        <Shield size={14} className="text-slate-400" />
                        Attendance
                    </Link>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                        onClick={() => { setOpen(false); onDeactivate(staff.id); }}
                        className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors w-full"
                    >
                        <PowerOff size={14} />
                        Deactivate
                    </button>
                </div>
            )}
        </div>
    );
}

export default function StaffPage() {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const loadStaff = async () => {
        setLoading(true);
        try {
            const res = await api.getStaffList();
            setStaff((res as { data?: StaffMember[] }).data || []);
        } catch (err) {
            reportApiError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadStaff(); }, []);

    const addStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.createStaff({ ...form, salary: parseFloat(form.salary) || 0 });
            setShowAdd(false);
            setForm(initialForm);
            toast.success('Staff member added successfully');
            loadStaff();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to add staff');
        } finally {
            setSaving(false);
        }
    };

    const handleDeactivate = async (id: number) => {
        if (!confirm('Deactivate this staff member?')) return;
        try {
            await api.updateStaff(id, { status: 'inactive' });
            toast.success('Staff member deactivated');
            loadStaff();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to deactivate');
        }
    };

    const departments = [...new Set(staff.map(s => s.department).filter(Boolean))];

    const filtered = staff.filter(s => {
        const q = search.toLowerCase();
        const matchSearch = !search || s.name.toLowerCase().includes(q) || (s.employee_id ?? '').toLowerCase().includes(q) || (s.designation ?? '').toLowerCase().includes(q);
        const matchDept = !filterDept || s.department === filterDept;
        const matchStatus = !filterStatus || s.status === filterStatus;
        return matchSearch && matchDept && matchStatus;
    });

    const inputCls = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors';

    return (
        <div className="space-y-5 pb-6">
            {/* Header toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
                    <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-sm font-semibold rounded-full">
                        {staff.length}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search staff…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-8 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] w-48 transition-colors"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(f => !f)}
                        className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${
                            showFilters ? 'bg-[#f1f0ff] border-[#a29bfe] text-[#6c5ce7]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        Filters <ChevronDown size={13} className={showFilters ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-semibold hover:bg-[#5b4bd5] transition-colors"
                    >
                        <Plus size={15} />
                        Add Staff
                    </button>
                </div>
            </div>

            {/* Filters panel */}
            {showFilters && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Department</label>
                        <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] min-w-[150px]">
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d} value={d!}>{d}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Status</label>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] min-w-[120px]">
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="on_leave">On Leave</option>
                        </select>
                    </div>
                    {(filterDept || filterStatus) && (
                        <div className="flex items-end">
                            <button onClick={() => { setFilterDept(''); setFilterStatus(''); }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 underline transition-colors">
                                Clear filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Emp ID</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Employee</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500 hidden md:table-cell">Department</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500 hidden lg:table-cell">Phone</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500 hidden lg:table-cell">Joined</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Status</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500 w-10" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={7} className="px-5 py-4">
                                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                    </td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-5 py-20 text-center">
                                    <Users size={36} className="text-slate-200 mx-auto mb-3" />
                                    <p className="font-semibold text-slate-500">No staff members yet</p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {search || filterDept || filterStatus
                                            ? 'No staff match your filters'
                                            : 'Add your first staff member to get started'}
                                    </p>
                                    {!search && !filterDept && !filterStatus && (
                                        <button
                                            onClick={() => setShowAdd(true)}
                                            className="mt-4 px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-semibold hover:bg-[#5b4bd5] transition-colors"
                                        >
                                            Add Staff
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ) : filtered.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-5 py-3 font-mono text-xs text-slate-400">
                                    {s.employee_id || `EMP-${String(s.id).padStart(3, '0')}`}
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-[#f1f0ff] text-[#6c5ce7] flex items-center justify-center font-bold text-sm shrink-0">
                                            {s.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{s.name}</p>
                                            <p className="text-xs text-slate-400">{s.designation || '—'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-slate-500 hidden md:table-cell">
                                    {s.department || '—'}
                                </td>
                                <td className="px-5 py-3 text-slate-500 hidden lg:table-cell">
                                    {s.phone || '—'}
                                </td>
                                <td className="px-5 py-3 text-slate-400 text-xs hidden lg:table-cell">
                                    {s.created_at
                                        ? new Date(s.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                        : '—'}
                                </td>
                                <td className="px-5 py-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border capitalize ${STATUS_BADGE[s.status?.toLowerCase()] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                        {s.status || 'active'}
                                    </span>
                                </td>
                                <td className="px-3 py-3">
                                    <ActionsMenu staff={s} onDeactivate={handleDeactivate} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Staff Modal */}
            {showAdd && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-900">Add Staff Member</h3>
                            <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={addStaff} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Full Name *</label>
                                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Enter full name" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Employee ID</label>
                                <input value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className={inputCls} placeholder="EMP-001" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Designation *</label>
                                <input required value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} className={inputCls} placeholder="e.g. Senior Teacher" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Department</label>
                                <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className={inputCls} placeholder="e.g. Science" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Phone</label>
                                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className={inputCls} placeholder="+91 98765 43210" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Email</label>
                                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} placeholder="staff@school.edu" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Monthly Salary (₹) *</label>
                                <input required type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} className={inputCls} placeholder="0" />
                            </div>
                            <div className="space-y-1.5 flex items-end">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.is_teacher}
                                        onChange={e => setForm({ ...form, is_teacher: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-300 text-[#6c5ce7] accent-[#6c5ce7]"
                                    />
                                    <span className="text-sm text-slate-700">Is a Teacher</span>
                                </label>
                            </div>
                            <div className="sm:col-span-2 flex justify-end gap-3 pt-2 border-t border-slate-100">
                                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="px-5 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-semibold hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors">
                                    {saving ? 'Adding…' : 'Add Staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
