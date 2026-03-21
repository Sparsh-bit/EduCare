'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { SmsTemplate, Recipient } from '@/lib/types';
import toast from 'react-hot-toast';
import { Send, MessageSquare, Users } from 'lucide-react';

export default function BulkMessagesPage() {
    const [templates, setTemplates] = useState<SmsTemplate[]>([]);
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [channel, setChannel] = useState('sms');
    const [recipientGroup, setRecipientGroup] = useState('all_parents');
    const [templateId, setTemplateId] = useState('');
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);

    const loadTemplates = useCallback(async () => {
        try { const data = await api.getSmsTemplates(); setTemplates(data); } catch { setTemplates([]); }
    }, []);

    const loadRecipients = useCallback(async () => {
        try { const data = await api.getRecipients(recipientGroup); setRecipients(data); } catch { setRecipients([]); }
    }, [recipientGroup]);

    useEffect(() => { loadTemplates(); }, [loadTemplates]);
    useEffect(() => { loadRecipients(); }, [loadRecipients]);

    const handleSend = async () => {
        if (!content) { toast.error('Please enter a message'); return; }
        if (recipients.length === 0) { toast.error('No recipients found for this group'); return; }
        setSending(true);
        try {
            const data = await api.sendBulkMessage({ channel, recipients, content, template_id: templateId || undefined });
            toast.success(`Message sent to ${data.total ?? data.queued ?? recipients.length} recipients`);
            setContent('');
            setTemplateId('');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to send message');
        }
        setSending(false);
    };

    const selectTemplate = (id: string) => {
        setTemplateId(id);
        const tpl = templates.find(t => t.id === parseInt(id));
        if (tpl) setContent(tpl.body);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Send Bulk Message</h1>
                <p className="text-sm text-slate-500 mt-0.5">Send SMS, WhatsApp, or email to parents and staff</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Message Composer */}
                <div className="lg:col-span-2 space-y-5">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5">
                        {/* Channel */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-2">Send via</label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'sms', label: 'SMS' },
                                    { id: 'whatsapp', label: 'WhatsApp' },
                                    { id: 'email', label: 'Email' },
                                ].map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => setChannel(c.id)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            channel === c.id
                                                ? 'bg-[#6c5ce7] text-white'
                                                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Recipients + Template */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-600">Send to</label>
                                <select
                                    value={recipientGroup}
                                    onChange={e => setRecipientGroup(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors"
                                >
                                    <option value="all_parents">All Parents</option>
                                    <option value="all_staff">All Staff</option>
                                    <option value="fee_defaulters">Students with Pending Fees</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-slate-600">Use template</label>
                                <select
                                    value={templateId}
                                    onChange={e => selectTemplate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors"
                                >
                                    <option value="">Write custom message</option>
                                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Message */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-slate-600">Message</label>
                                <span className="text-xs text-slate-400">
                                    {content.length} chars &bull; ~{Math.ceil(content.length / 160)} SMS
                                </span>
                            </div>
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Type your message here... Use {student_name} or {school_name} as placeholders."
                                rows={5}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#a29bfe] outline-none rounded-lg text-sm transition-colors resize-none"
                            />
                        </div>

                        {/* Send */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Users size={14} className="text-slate-400" />
                                <span>{recipients.length} recipients selected</span>
                            </div>
                            <button
                                onClick={handleSend}
                                disabled={sending || !content}
                                className="flex items-center gap-2 bg-[#6c5ce7] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#5b4bd5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {sending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send size={14} />
                                        Send Message
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Recipients Preview */}
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[500px]">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900 text-sm">Recipients</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Preview of selected group</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        {recipients.length === 0 ? (
                            <div className="py-10 text-center">
                                <MessageSquare size={24} className="text-slate-200 mx-auto mb-2" />
                                <p className="text-xs text-slate-400">No recipients found</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {recipients.slice(0, 50).map((r, i) => (
                                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-500">
                                            {r.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{r.name}</p>
                                            <p className="text-xs text-slate-400">{r.phone}</p>
                                        </div>
                                    </div>
                                ))}
                                {recipients.length > 50 && (
                                    <p className="text-center text-xs text-slate-400 py-3">
                                        + {recipients.length - 50} more recipients
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
