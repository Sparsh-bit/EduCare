'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Notice } from '@/lib/types';

type NoticeWithMeta = Notice & { created_by_name?: string };

export default function NoticesPage() {
    const [notices, setNotices] = useState<NoticeWithMeta[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: '', content: '', target_audience: 'all' });
    const [loading, setLoading] = useState(true);

    useEffect(() => { api.getNotices().then(setNotices).finally(() => setLoading(false)); }, []);

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        try { await api.createNotice(form); setShowCreate(false); setForm({ title: '', content: '', target_audience: 'all' }); setNotices(await api.getNotices()); }
        catch (e: unknown) { alert(e instanceof Error ? e.message : 'Operation failed'); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">📢 Notices</h1>
                <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-sm">➕ New Notice</button>
            </div>
            {showCreate && (
                <form onSubmit={create} className="card-glass p-6 space-y-4">
                    <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm" required />
                    <textarea placeholder="Content" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} className="w-full px-3 py-2 rounded-lg text-sm" required />
                    <select value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })} className="px-3 py-2 rounded-lg text-sm">
                        <option value="all">All</option><option value="students">Students</option><option value="parents">Parents</option><option value="staff">Staff</option>
                    </select>
                    <div className="flex gap-3"><button type="submit" className="btn-primary text-sm">Publish</button><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-sm">Cancel</button></div>
                </form>
            )}
            {loading ? <div className="text-gray-400 text-center py-8">Loading...</div> :
                <div className="space-y-4">
                    {notices.map((n) => (
                        <div key={n.id} className="card-glass p-5">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-gray-900">{n.title}</h3>
                                <span className="badge badge-blue text-xs">{n.target_audience}</span>
                            </div>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.content}</p>
                            <p className="text-xs text-gray-400 mt-3">By {n.created_by_name} · {new Date(n.created_at).toLocaleDateString('en-IN')}</p>
                        </div>
                    ))}
                </div>
            }
        </div>
    );
}
