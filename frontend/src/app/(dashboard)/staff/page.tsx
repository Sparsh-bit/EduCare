'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import type { Leave, StaffMember } from '@/lib/types';

const initialStaffForm = {
    name: '',
    designation: '',
    department: '',
    phone: '',
    email: '',
    salary: '',
    is_teacher: false,
    employee_id: '',
};

export default function StaffPage() {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [tab, setTab] = useState<'list' | 'leaves'>('list');
    const [form, setForm] = useState(initialStaffForm);

    const openAddForm = () => {
        setForm(initialStaffForm);
        setShowAdd(true);
    };

    const closeAddForm = () => {
        setShowAdd(false);
        setForm(initialStaffForm);
    };

    const loadData = async () => {
        try {
            const [s, l] = await Promise.all([api.getStaffList(), api.getLeaves()]);
            setStaff((s as { data?: StaffMember[] }).data || []);
            setLeaves((l as Leave[]) || []);
        } catch {
            toast.error('Failed to load staff data');
        }
        setLoading(false);
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            await loadData();
        })();
    }, []);

    const addStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createStaff({ ...form, salary: parseFloat(form.salary) });
            closeAddForm();
            toast.success('Staff member added successfully');
            loadData();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to add staff');
        }
    };

    const leaveAction = async (id: number, status: string) => {
        try {
            await api.updateLeave(id, status);
            toast.success(`Leave ${status}`);
            loadData();
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : 'Failed to update leave');
        }
    };

    return (
        <div className="p-6 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-[#f1f0ff] flex items-center justify-center text-2xl shadow-sm">👥</span>
                        Human Resource
                    </h1>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium ml-1">Manage institutional workforce, roles, and leave applications</p>
                </div>
                <button
                    onClick={() => (showAdd ? closeAddForm() : openAddForm())}
                    className="flex items-center gap-2 px-6 py-3 bg-[#6c5ce7] text-white rounded-2xl text-sm font-bold hover:bg-[#5b4bd5] transition-all shadow-xl shadow-[#6c5ce7]/15"
                >
                    {showAdd ? '✕ Cancel' : '＋ Add Employee'}
                </button>
            </div>

            {/* Stats / Tabs */}
            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-72 space-y-4">
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                        <button
                            onClick={() => setTab('list')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${tab === 'list' ? 'bg-[#f1f0ff] text-[#6c5ce7] shadow-sm' : 'hover:bg-gray-50 text-gray-400 font-bold uppercase tracking-widest text-[10px]'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">📋</span>
                                <span className={tab === 'list' ? 'font-bold' : ''}>Staff Directory</span>
                            </div>
                            <span className="bg-white/50 px-2 py-0.5 rounded-lg text-xs font-bold">{staff.length}</span>
                        </button>
                        <button
                            onClick={() => setTab('leaves')}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${tab === 'leaves' ? 'bg-[#f1f0ff] text-[#6c5ce7] shadow-sm' : 'hover:bg-gray-50 text-gray-400 font-bold uppercase tracking-widest text-[10px]'}`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg">📅</span>
                                <span className={tab === 'leaves' ? 'font-bold' : ''}>Leave Requests</span>
                            </div>
                            <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-lg text-xs font-bold">
                                {leaves.filter((l) => l.status === 'pending').length}
                            </span>
                        </button>
                    </div>

                    <div className="bg-gradient-to-br from-[#6c5ce7] to-[#8e44ad] p-6 rounded-3xl text-white shadow-xl shadow-[#6c5ce7]/10 relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Payroll</p>
                            <p className="text-2xl font-black mt-1">₹{staff.reduce((acc, curr) => acc + (parseFloat(String(curr.salary ?? 0)) || 0), 0).toLocaleString('en-IN')}</p>
                            <p className="text-[10px] mt-2 font-bold opacity-80 italic">Monthly liability estimate</p>
                        </div>
                        <div className="absolute -right-4 -bottom-4 text-7xl opacity-10">💰</div>
                    </div>
                </div>

                <div className="flex-1 space-y-6">
                    {showAdd && (
                        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-xl animate-in slide-in-from-top duration-300">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">✍️</span>
                                Register New Staff Member
                            </h3>
                            <form onSubmit={addStaff} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Full Name</label>
                                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-2xl text-sm font-semibold py-3.5 px-4 focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="e.g. John Doe" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Employee ID</label>
                                    <input value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-2xl text-sm font-semibold py-3.5 px-4 focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="e.g. EMP-101" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Designation</label>
                                    <input required value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-2xl text-sm font-semibold py-3.5 px-4 focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="e.g. PGT Teacher" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Department</label>
                                    <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-2xl text-sm font-semibold py-3.5 px-4 focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="e.g. Science" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Phone Number</label>
                                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-2xl text-sm font-semibold py-3.5 px-4 focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="+91 ..." />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase font-black text-gray-400 ml-1">Monthly Salary (₹)</label>
                                    <input required type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })}
                                        className="w-full bg-gray-50 border-none rounded-2xl text-sm font-semibold py-3.5 px-4 focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="0.00" />
                                </div>
                                <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-50 mt-2">
                                    <button type="button" onClick={closeAddForm} className="px-6 py-3 font-bold text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-600">Dismiss</button>
                                    <button type="submit" className="px-8 py-3 bg-[#6c5ce7] text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-[#6c5ce7]/10 hover:bg-[#5b4bd5]">Save Contractor</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                            <h3 className="font-bold text-gray-900 tracking-tight">{tab === 'list' ? 'Staff Members' : 'Leave Management'}</h3>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Sync</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            {tab === 'list' ? (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Employee</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Position</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Salary</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading ? (
                                            Array(4).fill(0).map((_, i) => <tr key={i}><td colSpan={4} className="px-8 py-6 h-16 animate-pulse bg-gray-50/10" /></tr>)
                                        ) : staff.length === 0 ? (
                                            <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic">No employees found</td></tr>
                                        ) : staff.map((s) => (
                                            <tr key={s.id} className="hover:bg-gray-50/50 transition-all group">
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f1f0ff] to-[#f1f0ff] flex items-center justify-center font-black text-[#a29bfe] text-xs shadow-sm">
                                                            {s.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{s.employee_id || 'TEMP-ID'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-sm font-semibold text-gray-700">{s.designation}</p>
                                                    <p className="text-[10px] font-bold text-gray-400">{s.department || 'General'}</p>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <span className="text-sm font-black text-gray-900">₹{(parseFloat(String(s.salary ?? 0)) || 0).toLocaleString('en-IN')}</span>
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                        {s.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Employee</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Dates</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Decision</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {leaves.length === 0 ? (
                                            <tr><td colSpan={3} className="p-12 text-center text-gray-400 italic font-medium">No leave applications found</td></tr>
                                        ) : (
                                            leaves.map((l) => (
                                                <tr key={l.id} className="hover:bg-gray-50/50 transition-all">
                                                    <td className="px-8 py-6">
                                                        <p className="font-bold text-gray-900 text-sm">{l.staff_name}</p>
                                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mt-0.5">{l.leave_type}</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-sm font-semibold text-gray-700">{new Date(l.from_date).toLocaleDateString()} → {new Date(l.to_date).toLocaleDateString()}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 italic">Reason: {l.reason || 'Not provided'}</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        {l.status === 'pending' ? (
                                                            <div className="flex gap-2">
                                                                <button onClick={() => leaveAction(l.id, 'approved')} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-emerald-100 transition-all">Approve</button>
                                                                <button onClick={() => leaveAction(l.id, 'rejected')} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-rose-100 transition-all">Reject</button>
                                                            </div>
                                                        ) : (
                                                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter ${l.status === 'approved' ? 'text-emerald-500 bg-emerald-50/50' : 'text-rose-500 bg-rose-50/50'}`}>
                                                                {l.status}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
