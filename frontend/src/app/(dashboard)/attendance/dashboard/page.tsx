/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function AttendanceDashboardPage() {
    const [stats, setStats] = useState<Record<string, any> | null>(null);
    const [, setClasses] = useState<Record<string, any>[]>([]);

    useEffect(() => {
        api.getDashboardStats()
            .then(data => setStats(data as unknown as Record<string, any>))
            .catch(() => { });
        api.getClasses().then((cls) => setClasses(cls as unknown as Record<string, any>[])).catch(() => { });
    }, []);

    const attendanceRate = (stats?.today_attendance_percentage as number) || 0;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Attendance Analytics</h1>
                    <p className="text-sm text-gray-500">Real-time attendance overview across the school</p>
                </div>
                <div className="bg-green-100 px-4 py-2 rounded-lg text-green-800 font-bold border border-green-200">
                    Today&apos;s Rate: {attendanceRate}%
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col justify-center items-center min-h-[300px]">
                    <h3 className="w-full text-left font-semibold text-gray-800 mb-8 border-b pb-4">Overall Attendance (Today)</h3>

                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full flex items-center justify-center shrink-0 border-[16px] border-[#6c5ce7]/10"
                        style={{ background: `conic-gradient(#6c5ce7 ${attendanceRate}%, transparent 0)` }}>
                        <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center z-10 w-[85%] h-[85%] shadow-[inset_0_2px_15px_rgba(0,0,0,0.06)]">
                            <span className="text-xs text-gray-400 uppercase tracking-widest font-semibold pb-1 text-center">Present</span>
                            <span className="text-4xl sm:text-5xl font-black text-gray-900">
                                {attendanceRate}<span className="text-2xl text-gray-500">%</span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="font-semibold text-gray-800 mb-6 border-b pb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#fa8231]"></span>
                        Class Distribution
                    </h3>
                    <div className="space-y-5">
                        {(stats?.class_counts as Array<Record<string, any>>)?.map((c) => (
                            <div key={String(c.class_name)} className="flex flex-col gap-1 w-full">
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-gray-900">{String(c.class_name || '').toLowerCase().startsWith('class') ? c.class_name : 'Class ' + c.class_name}</span>
                                    <span className="text-gray-500 text-xs bg-gray-100 px-2 py-0.5 rounded-full">{String(c.count)} students</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                    <div className="bg-gradient-to-r from-[#fa8231] to-[#f7b731] h-2.5 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${Math.min(100, ((c.count as number) / ((stats?.total_students as number) || 1)) * 100)}%` }}></div>
                                </div>
                            </div>
                        ))}
                        {!(stats?.class_counts as unknown[])?.length && (
                            <div className="py-8 text-center text-gray-400 italic">No class data to display</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
