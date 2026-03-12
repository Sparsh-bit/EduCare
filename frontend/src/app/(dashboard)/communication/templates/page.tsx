'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SmsTemplate } from '@/lib/types';

export default function SmsTemplatesPage() {
    const [templates, setTemplates] = useState<SmsTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ name: '', category: 'general', body: '', dlt_template_id: '', language: 'en' });

    const load = useCallback(async () => {
        try { setTemplates(await api.getSmsTemplates()); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load'); setTemplates([]); }
        setLoading(false);
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await load();
        })();
    }, [load]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try { await api.createSmsTemplate(form); setShowForm(false); setForm({ name: '', category: 'general', body: '', dlt_template_id: '', language: 'en' }); load(); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Operation failed'); }
    };

    const deleteTemplate = async (id: number) => {
        if (!confirm('Delete this template?')) return;
        try { await api.deleteSmsTemplate(id); load(); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Operation failed'); }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold text-gray-900">SMS Templates</h1><p className="text-sm text-gray-500 mt-1">Manage DLT-registered SMS templates</p></div>
                <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5b4dd6] text-sm font-medium shadow-sm">{showForm ? '✕ Cancel' : '+ New Template'}</button>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Template Name *" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                            <option value="attendance">Attendance</option><option value="fee">Fee</option><option value="exam">Exam</option>
                            <option value="general">General</option><option value="emergency">Emergency</option>
                        </select>
                        <input className="px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="DLT Template ID" value={form.dlt_template_id} onChange={e => setForm({ ...form, dlt_template_id: e.target.value })} />
                    </div>
                    <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" rows={3} placeholder="Template Body *" required value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
                    <p className="text-xs text-gray-400">Variables: {'{student_name}'}, {'{class}'}, {'{section}'}, {'{school_name}'}, {'{date}'}, {'{amount}'}, {'{receipt_no}'}</p>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm hover:bg-[#5b4dd6]">Save Template</button>
                    </div>
                </form>
            )}
            <div className="grid gap-4">
                {loading ? <div className="text-center text-gray-400 py-8">Loading...</div>
                    : templates.length === 0 ? <div className="text-center text-gray-400 py-8">No templates</div>
                        : templates.map(t => (
                            <div key={t.id} className="bg-white p-4 rounded-xl border shadow-sm flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-gray-900">{t.name}</span>
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{t.category}</span>
                                        {t.dlt_template_id && <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">DLT: {t.dlt_template_id}</span>}
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">{t.body}</p>
                                </div>
                                <button onClick={() => deleteTemplate(t.id)} className="text-xs text-red-500 hover:underline flex-shrink-0">Delete</button>
                            </div>
                        ))}
            </div>
        </div>
    );
}
