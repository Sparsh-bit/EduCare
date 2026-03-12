/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

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

    if (loading) return <div className="p-6 flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-[#6c5ce7] border-t-transparent rounded-full"></div></div>;
    if (error) return <div className="p-6"><div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div></div>;
    if (!data) return <div className="p-6 text-gray-500">Unable to load dashboard</div>;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-gray-500 uppercase">Total Staff</p><p className="text-2xl font-bold text-gray-900 mt-1">{(data.total_staff as number) || 0}</p></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-gray-500 uppercase">Teaching</p><p className="text-2xl font-bold text-blue-600 mt-1">{(data.teaching_staff as number) || 0}</p></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-gray-500 uppercase">Non-Teaching</p><p className="text-2xl font-bold text-gray-600 mt-1">{(data.non_teaching_staff as number) || 0}</p></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-gray-500 uppercase">On Leave Today</p><p className="text-2xl font-bold text-orange-600 mt-1">{(data.on_leave_today as number) || 0}</p></div>
                <div className="bg-white p-4 rounded-xl border shadow-sm"><p className="text-xs text-gray-500 uppercase">Pending Leaves</p><p className="text-2xl font-bold text-red-600 mt-1">{(data.pending_leave_requests as number) || 0}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4">By Department</h3>
                    <div className="space-y-2">
                        {(!(data.department_breakdown as unknown[])?.length) && <p className="text-gray-400 text-sm">No data</p>}
                        {(data.department_breakdown as Array<Record<string, any>>)?.map((d) => (
                            <div key={String(d.department)} className="flex justify-between items-center"><span className="text-sm text-gray-600">{String(d.department || 'Unassigned')}</span><span className="text-sm font-medium px-2 py-0.5 bg-gray-100 rounded">{String(d.count)}</span></div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4">By Designation</h3>
                    <div className="space-y-2">
                        {(!(data.designation_breakdown as unknown[])?.length) && <p className="text-gray-400 text-sm">No data</p>}
                        {(data.designation_breakdown as Array<Record<string, any>>)?.map((d) => (
                            <div key={String(d.designation)} className="flex justify-between items-center"><span className="text-sm text-gray-600">{String(d.designation || 'Unassigned')}</span><span className="text-sm font-medium px-2 py-0.5 bg-gray-100 rounded">{String(d.count)}</span></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
