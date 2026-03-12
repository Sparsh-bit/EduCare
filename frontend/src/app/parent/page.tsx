/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import Link from 'next/link';

export default function ParentDashboard() {
    const [children, setChildren] = useState<Record<string, any>[]>([]);
    const [notices, setNotices] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.getChildren(), api.getParentNotices()])
            .then(([c, n]) => { setChildren(c as Record<string, any>[]); setNotices(n as Record<string, any>[]); })
            .catch(reportApiError).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-gray-400 text-center py-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">🏠 Parent Portal</h1>
            <p className="text-gray-500 text-sm">Welcome! View your {"children's"} academic details.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children.map((child) => (
                    <div key={child.id} className="card-glass p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 bg-[#6c5ce7] rounded-full flex items-center justify-center text-xl font-bold text-white">{child.name.charAt(0)}</div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{child.name}</h3>
                                <p className="text-sm text-gray-500">{String(child.class_name || '').toLowerCase().startsWith('class') ? child.class_name : 'Class ' + child.class_name} - {child.section_name} · Roll: {child.current_roll_no}</p>
                                <p className="text-xs text-gray-400">{child.admission_no}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Link href={`/parent/attendance?id=${child.id}`} className="text-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                                <span className="text-lg">📋</span><p className="text-xs text-gray-600 mt-1">Attendance</p>
                            </Link>
                            <Link href={`/parent/fees?id=${child.id}`} className="text-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                                <span className="text-lg">💰</span><p className="text-xs text-gray-600 mt-1">Fees</p>
                            </Link>
                            <Link href={`/parent/results?id=${child.id}`} className="text-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                                <span className="text-lg">📝</span><p className="text-xs text-gray-600 mt-1">Results</p>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card-glass p-6">
                <h3 className="font-semibold text-gray-900 mb-4">📢 Recent Notices</h3>
                {notices.length === 0 ? <p className="text-gray-400 text-sm">No notices</p> : (
                    <div className="space-y-3">
                        {notices.slice(0, 5).map((n) => (
                            <div key={n.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.content}</p>
                                <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString('en-IN')}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
