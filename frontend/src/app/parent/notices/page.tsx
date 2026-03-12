/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';

export default function ParentNotices() {
    const [notices, setNotices] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { api.getParentNotices().then(n => setNotices(n as Record<string, any>[])).catch(reportApiError).finally(() => setLoading(false)); }, []);

    if (loading) return <div className="text-gray-400 text-center py-8">Loading...</div>;
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">📢 Notices</h1>
            {notices.map((n) => (
                <div key={n.id} className="card-glass p-5">
                    <h3 className="font-semibold text-gray-900">{n.title}</h3>
                    <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{n.content}</p>
                    <p className="text-xs text-gray-400 mt-3">{new Date(n.created_at).toLocaleDateString('en-IN')}</p>
                </div>
            ))}
        </div>
    );
}
