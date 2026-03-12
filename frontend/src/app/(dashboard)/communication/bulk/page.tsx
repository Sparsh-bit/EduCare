'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SmsTemplate, Recipient } from '@/lib/types';

export default function BulkMessagesPage() {
    const [templates, setTemplates] = useState<SmsTemplate[]>([]);
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [channel, setChannel] = useState('sms');
    const [recipientGroup, setRecipientGroup] = useState('all_parents');
    const [templateId, setTemplateId] = useState('');
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ total?: number; queued?: number } | null>(null);
    const [error, setError] = useState('');

    const loadTemplates = useCallback(async () => {
        try { const data = await api.getSmsTemplates(); setTemplates(data); } catch { setTemplates([]); }
    }, []);

    const loadRecipients = useCallback(async () => {
        try { const data = await api.getRecipients(recipientGroup); setRecipients(data); } catch { setRecipients([]); }
    }, [recipientGroup]);

    useEffect(() => { (async () => { await loadTemplates(); })(); }, [loadTemplates]);
    useEffect(() => { (async () => { await loadRecipients(); })(); }, [loadRecipients]);

    const handleSend = async () => {
        if (!content || recipients.length === 0) return;
        setSending(true);
        setError('');
        try {
            const data = await api.sendBulkMessage({ channel, recipients, content, template_id: templateId || undefined });
            setResult(data);
            setTimeout(() => setResult(null), 5000);
        } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to send'); }
        setSending(false);
    };

    const selectTemplate = (id: string) => {
        setTemplateId(id);
        const tpl = templates.find(t => t.id === parseInt(id));
        if (tpl) setContent(tpl.body);
    };

    return (
        <div className="space-y-8 animate-fade-in p-2">
            <div>
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Broadcast Center</h1>
                <p className="text-gray-500 text-sm mt-1.5 font-medium">Reach out to parents, staff, or custom groups instantly</p>
            </div>

            {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-3 rounded-2xl text-sm font-semibold flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-xs">✕</span>
                {error}
            </div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Composer */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-8">
                        <div>
                            <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400 mb-4 block">Communication Channel</label>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { id: 'sms', label: 'SMS Gateway', icon: '💬', color: 'bg-[#6c5ce7]' },
                                    { id: 'whatsapp', label: 'WhatsApp', icon: '📱', color: 'bg-emerald-600' },
                                    { id: 'email', label: 'Email Service', icon: '📧', color: 'bg-amber-600' }
                                ].map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setChannel(c.id)}
                                        className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold transition-all border ${channel === c.id
                                                ? `border-transparent ${c.color} text-white shadow-lg shadow-gray-200`
                                                : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100'
                                            }`}
                                    >
                                        <span className="text-lg">{c.icon}</span>
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400 ml-1">Recipient Group</label>
                                <select
                                    className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4"
                                    value={recipientGroup}
                                    onChange={e => setRecipientGroup(e.target.value)}
                                >
                                    <option value="all_parents">All Active Parents</option>
                                    <option value="all_staff">All Faculty & Staff</option>
                                    <option value="fee_defaulters">Fee Overdue Defaulters</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400 ml-1">Select Template</label>
                                <select
                                    className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4"
                                    value={templateId}
                                    onChange={e => selectTemplate(e.target.value)}
                                >
                                    <option value="">-- Custom Compose --</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400">Message Content</label>
                                <span className="text-[10px] font-bold text-[#6c5ce7] bg-[#f1f0ff] px-2 py-0.5 rounded cursor-help">Available Tags: {'{student_name}'}, {'{school_name}'}</span>
                            </div>
                            <textarea
                                className="w-full bg-gray-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#6c5ce7]/20 py-4 px-5 min-h-[160px] resize-none"
                                placeholder="Start typing your broadcast message here..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                            <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 px-2">
                                <span>{content.length} characters</span>
                                <span>Est. {Math.ceil(content.length / 160)} SMS units per recipient</span>
                            </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between bg-[#f1f0ff]/30 p-4 rounded-2xl border border-[#f1f0ff]">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold text-[#a29bfe] uppercase tracking-tighter">Ready to dispatch</span>
                                <span className="text-sm font-bold text-[#3d2e9e]">{recipients.length} validated recipients</span>
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={sending || !content || recipients.length === 0}
                                className="px-8 py-3 bg-[#6c5ce7] text-white rounded-xl text-sm font-bold hover:bg-[#5b4bd5] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-[#6c5ce7]/20 transition-all flex items-center gap-2"
                            >
                                {sending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>Dispatch Broadcast 🚀</>
                                )}
                            </button>
                        </div>
                        {result && (
                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-4 rounded-2xl text-xs font-bold animate-fade-in flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs">✓</span>
                                Broadcast successfully queued! {result.total || result.queued} messages are being dispatched via {channel.toUpperCase()}.
                            </div>
                        )}
                    </div>
                </div>

                {/* Directory Preview */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col max-h-[750px]">
                    <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                        <h3 className="font-bold text-gray-900">Directory Preview</h3>
                        <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Random sample of selected recipients</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {recipients.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center opacity-40">
                                <div className="text-4xl mb-2">👥</div>
                                <p className="text-xs font-bold uppercase tracking-tight">No Recipients Found</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {recipients.slice(0, 50).map((r, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
                                            {r.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 leading-tight">{r.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">{r.phone}</p>
                                        </div>
                                    </div>
                                ))}
                                {recipients.length > 50 && (
                                    <div className="p-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        + {recipients.length - 50} other recipients
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
