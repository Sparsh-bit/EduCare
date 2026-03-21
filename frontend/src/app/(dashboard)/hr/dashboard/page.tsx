/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Users, GraduationCap, Briefcase, CalendarOff, Clock } from 'lucide-react';

export default function HRDashboardPage() {
    const [data, setData] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            try { setData(await api.getHrDashboard()); }
            catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load'); }
            setLoading(false);
        })();
    }, []);

    if (loading) return (
        <div className="p-6 flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-[#6c5ce7] border-t-transparent rounded-full" />
        </div>
    );

    if (error) return (
        <div className="p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
        </div>
    );

    if (!data) return <div className="p-6 text-slate-500 text-sm">Could not load HR data.</div>;

    return (
        <div className="space-y-6 p-2">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">HR Overview</h1>
                <p className="text-slate-500 text-sm mt-1">Staff summary and leave status</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-[#f1f0ff] text-[#6c5ce7] rounded-lg shrink-0">
                        <Users size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Total Staff</p>
                        <p className="text-2xl font-bold text-slate-900 mt-0.5">{(data.total_staff as number) || 0}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                        <GraduationCap size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Teaching</p>
                        <p className="text-2xl font-bold text-blue-600 mt-0.5">{(data.teaching_staff as number) || 0}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg shrink-0">
                        <Briefcase size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Non-Teaching</p>
                        <p className="text-2xl font-bold text-slate-700 mt-0.5">{(data.non_teaching_staff as number) || 0}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg shrink-0">
                        <CalendarOff size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">On Leave Today</p>
                        <p className="text-2xl font-bold text-orange-600 mt-0.5">{(data.on_leave_today as number) || 0}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-3">
                    <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-medium">Leave Requests</p>
                        <p className="text-2xl font-bold text-rose-600 mt-0.5">{(data.pending_leave_requests as number) || 0}</p>
                    </div>
                </div>
            </div>

            {/* Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Staff by Department</h3>
                    <div className="space-y-2">
                        {(!(data.department_breakdown as unknown[])?.length) ? (
                            <p className="text-slate-400 text-sm">No department data.</p>
                        ) : (
                            (data.department_breakdown as Array<Record<string, any>>).map(d => (
                                <div key={String(d.department)} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                                    <span className="text-sm text-slate-700">{String(d.department || 'Unassigned')}</span>
                                    <span className="text-sm font-semibold px-2.5 py-0.5 bg-slate-100 rounded-lg text-slate-700">{String(d.count)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Staff by Designation</h3>
                    <div className="space-y-2">
                        {(!(data.designation_breakdown as unknown[])?.length) ? (
                            <p className="text-slate-400 text-sm">No designation data.</p>
                        ) : (
                            (data.designation_breakdown as Array<Record<string, any>>).map(d => (
                                <div key={String(d.designation)} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                                    <span className="text-sm text-slate-700">{String(d.designation || 'Unassigned')}</span>
                                    <span className="text-sm font-semibold px-2.5 py-0.5 bg-slate-100 rounded-lg text-slate-700">{String(d.count)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
