'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';
import { BellRing, Megaphone } from 'lucide-react';

interface Notice { id: number; title: string; content: string; target_audience: string; created_by_name?: string; created_at: string; }

export default function StaffNoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getNotices()
            .then(data => {
                const list = (data as { notices?: Notice[] }).notices || (Array.isArray(data) ? data : []);
                setNotices(list);
            })
            .catch(() => setNotices([]))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-black text-slate-900">Notices</h1>
                <p className="text-sm text-slate-500 mt-0.5">School announcements and circulars</p>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse" />)}
                </div>
            ) : notices.length === 0 ? (
                <div className="text-center py-16">
                    <Megaphone size={36} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-400 font-medium">No notices available</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notices.map((n, i) => (
                        <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:border-sky-200 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                    <BellRing size={14} className="text-emerald-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-3 flex-wrap">
                                        <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[10px] font-bold uppercase tracking-wide text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{n.target_audience}</span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{n.content}</p>
                                    {n.created_by_name && (
                                        <p className="text-xs text-slate-400 mt-2">Posted by {n.created_by_name}</p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
