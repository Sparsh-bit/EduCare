'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { StaffMember } from '@/lib/types';
import toast from 'react-hot-toast';
import { Users } from 'lucide-react';

export default function StaffAttendancePage() {
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [attendance, setAttendance] = useState<Record<number, 'P' | 'A' | 'L'>>({});
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        setLoading(true);
        api.getStaffList()
            .then(res => {
                const list = res.data || [];
                setStaffList(list);
                const init: Record<number, 'P' | 'A' | 'L'> = {};
                list.forEach((s: StaffMember) => { init[s.id] = 'P'; });
                setAttendance(init);
            })
            .catch(reportApiError)
            .finally(() => setLoading(false));
    }, []);

    const markAll = (status: 'P' | 'A') => {
        const updated: Record<number, 'P' | 'A' | 'L'> = {};
        staffList.forEach(s => { updated[s.id] = status; });
        setAttendance(updated);
        toast.success(`All staff marked as ${status === 'P' ? 'Present' : 'Absent'}`);
    };

    const toggle = (id: number, status: 'P' | 'A' | 'L') => {
        setAttendance(prev => ({ ...prev, [id]: status }));
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Staff Attendance</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Mark daily attendance for all staff members</p>
                </div>
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none transition-colors"
                />
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Quick Actions */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users size={14} className="text-slate-400" />
                        <span>{staffList.length} staff members</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => markAll('P')}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-100"
                        >
                            Mark All Present
                        </button>
                        <button
                            onClick={() => markAll('A')}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-medium rounded-lg hover:bg-rose-100 transition-colors border border-rose-100"
                        >
                            Mark All Absent
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500">Emp No</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500">Name</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500">Designation</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-center">Attendance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={4} className="px-5 py-4">
                                            <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : staffList.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                                        No staff records found
                                    </td>
                                </tr>
                            ) : staffList.map(staff => (
                                <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3 font-mono text-slate-400 text-xs">
                                        EMP-{String(staff.id).padStart(3, '0')}
                                    </td>
                                    <td className="px-5 py-3 font-medium text-slate-900">{staff.name}</td>
                                    <td className="px-5 py-3 text-slate-500 text-xs">{staff.designation || 'Staff'}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex gap-1.5 justify-center">
                                            {(['P', 'A', 'L'] as const).map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => toggle(staff.id, s)}
                                                    className={`w-10 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
                                                        attendance[staff.id] === s
                                                            ? s === 'P' ? 'bg-emerald-500 text-white border-emerald-600'
                                                            : s === 'A' ? 'bg-rose-500 text-white border-rose-600'
                                                            : 'bg-amber-500 text-white border-amber-600'
                                                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
