/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, reportApiError } from '@/lib/api';

export default function ParentAttendance() {
    const searchParams = useSearchParams();
    const studentId = searchParams.get('id');
    const [data, setData] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentId) { return; }
        let active = true;
        (async () => {
            try {
                const result = await api.getChildAttendance(parseInt(studentId));
                if (active) setData(result);
            } catch (err) {
                reportApiError(err);
            }
            if (active) setLoading(false);
        })();
        return () => { active = false; };
    }, [studentId]);

    if (!studentId) return <div className="text-gray-400 text-center py-8">Select a child from the dashboard</div>;
    if (loading) return <div className="text-gray-400 text-center py-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">📋 Attendance</h1>
            {data && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="stat-card p-4"><p className="text-xs text-gray-400">Total Days</p><p className="text-2xl font-bold text-gray-900 mt-1">{data.total_days}</p></div>
                        <div className="stat-card p-4"><p className="text-xs text-gray-400">Present</p><p className="text-2xl font-bold text-emerald-600 mt-1">{data.present}</p></div>
                        <div className="stat-card p-4"><p className="text-xs text-gray-400">Absent</p><p className="text-2xl font-bold text-red-600 mt-1">{data.absent}</p></div>
                        <div className="stat-card p-4"><p className="text-xs text-gray-400">Percentage</p><p className="text-2xl font-bold text-gray-900 mt-1">{data.percentage}%</p></div>
                        <div className="stat-card p-4"><p className="text-xs text-gray-400">Exam Eligible</p><p className={`text-2xl font-bold mt-1 ${data.eligible_for_exam ? 'text-emerald-600' : 'text-red-600'}`}>{data.eligible_for_exam ? '✅ Yes' : '❌ No'}</p></div>
                    </div>
                    <div className="card-glass p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Recent Records</h3>
                        <div className="grid grid-cols-7 md:grid-cols-10 gap-2">
                            {(data.recent_records as Array<Record<string, any>>)?.map((r, i) => (
                                <div key={i} className={`p-2 rounded-lg text-center text-xs ${r.status === 'P' ? 'bg-emerald-50 text-emerald-600' : r.status === 'A' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                    <p className="font-medium">{r.status}</p>
                                    <p className="text-[10px] opacity-70">{new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
