'use client';

import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import { Bell, Calendar, Search } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ParentNotices() {
    const [notices, setNotices] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        api.getParentNotices()
            .then(n => setNotices(n as Record<string, any>[]))
            .catch(reportApiError)
            .finally(() => setLoading(false));
    }, []);

    const filteredNotices = notices.filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Notices</h1>
                    <p className="text-sm text-slate-500 mt-0.5">School announcements and circulars</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search notices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none w-full sm:w-56"
                    />
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : filteredNotices.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-16 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Bell size={22} className="text-slate-300" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">No notices found</p>
                    <p className="text-xs text-slate-400 mt-1">
                        {searchTerm ? 'Try a different search term' : 'Check back later for new announcements'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredNotices.map((n, i) => (
                        <div
                            key={n.id}
                            className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:border-slate-200 transition-colors"
                        >
                            <div className="flex items-start gap-4">
                                <div className="p-2.5 rounded-lg bg-[#f1f0ff] text-[#6c5ce7] shrink-0">
                                    <Bell size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="font-semibold text-slate-900">{n.title}</h3>
                                        {i === 0 && (
                                            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-xs font-medium">
                                                Latest
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                                        <Calendar size={12} />
                                        {new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                    <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
                                        {n.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
