'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SmsTemplate } from '@/lib/types';
import toast from 'react-hot-toast';
import { Plus, X, Trash2, MessageSquare } from 'lucide-react';

export default function SmsTemplatesPage() {
    const [templates, setTemplates] = useState<SmsTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', category: 'general', body: '', dlt_template_id: '', language: 'en' });

    const load = useCallback(async () => {
        setLoading(true);
        try { setTemplates(await api.getSmsTemplates()); }
        catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to load templates'); setTemplates([]); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            await api.createSmsTemplate(form);
            toast.success('Template created successfully');
            setShowForm(false);
            setForm({ name: '', category: 'general', body: '', dlt_template_id: '', language: 'en' });
            load();
        } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to create template'); }
    };

    const deleteTemplate = async (id: number) => {
        try {
            await api.deleteSmsTemplate(id);
            toast.success('Template deleted');
            load();
        } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to delete template'); }
    };

    const inputCls = 'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Message Templates</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage DLT-registered SMS templates for bulk messaging</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showForm ? 'border border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-[#6c5ce7] text-white hover:bg-[#5b4bd5]'}`}
                >
                    {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Template</>}
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                    <h3 className="font-semibold text-slate-900 mb-4">Create Template</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-600">Template Name *</label>
                                <input required className={inputCls} placeholder="e.g. Fee Reminder" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-600">Category</label>
                                <select className={inputCls} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                    <option value="attendance">Attendance</option>
                                    <option value="fee">Fee</option>
                                    <option value="exam">Exam</option>
                                    <option value="general">General</option>
                                    <option value="emergency">Emergency</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-600">DLT Template ID</label>
                                <input className={inputCls} placeholder="Optional" value={form.dlt_template_id} onChange={e => setForm({ ...form, dlt_template_id: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-slate-600">Template Body *</label>
                            <textarea className={`${inputCls} resize-none`} rows={3} required value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
                            <p className="text-xs text-slate-400">Available variables: {'{student_name}'}, {'{class}'}, {'{section}'}, {'{school_name}'}, {'{date}'}, {'{amount}'}, {'{receipt_no}'}</p>
                        </div>
                        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                            <button type="button" onClick={() => setShowForm(false)} className="border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">Cancel</button>
                            <button type="submit" className="bg-[#6c5ce7] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#5b4bd5] transition-colors">Save Template</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-3">
                {loading ? (
                    Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)
                ) : templates.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center">
                        <MessageSquare size={24} className="text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">No templates yet. Create one to use in bulk messages.</p>
                    </div>
                ) : templates.map(t => (
                    <div key={t.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-start justify-between gap-4 hover:shadow-sm transition-shadow">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className="font-medium text-slate-900">{t.name}</span>
                                <span className="px-2.5 py-0.5 bg-[#f1f0ff] text-[#6c5ce7] rounded-lg text-xs font-medium">{t.category}</span>
                                {t.dlt_template_id && <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium">DLT: {t.dlt_template_id}</span>}
                            </div>
                            <p className="text-sm text-slate-500 line-clamp-2">{t.body}</p>
                        </div>
                        <button onClick={() => deleteTemplate(t.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0">
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
