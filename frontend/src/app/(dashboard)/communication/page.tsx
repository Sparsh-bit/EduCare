'use client';
import Link from 'next/link';
import { MessageSquare, Send, BarChart2, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function CommunicationPage() {
    const [templateCount, setTemplateCount] = useState(0);

    useEffect(() => {
        api.getSmsTemplates().then(data => setTemplateCount(data.length)).catch(() => {});
    }, []);

    const SECTIONS = [
        {
            href: '/communication/templates',
            icon: MessageSquare,
            title: 'SMS Templates',
            desc: 'Create and manage DLT-registered message templates for bulk SMS campaigns.',
            badge: templateCount > 0 ? `${templateCount} templates` : null,
            color: 'bg-[#f1f0ff] text-[#6c5ce7]',
        },
        {
            href: '/communication/bulk',
            icon: Send,
            title: 'Send Bulk Message',
            desc: 'Send SMS, WhatsApp, or email notifications to parents, students, or staff.',
            badge: null,
            color: 'bg-emerald-50 text-emerald-600',
        },
        {
            href: '/communication/reports',
            icon: BarChart2,
            title: 'Delivery Reports',
            desc: 'View message delivery status and campaign analytics.',
            badge: null,
            color: 'bg-amber-50 text-amber-600',
        },
    ];

    return (
        <div className="space-y-6 pb-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Communication</h1>
                <p className="text-sm text-slate-500 mt-0.5">Send messages and manage communication templates</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {SECTIONS.map(s => {
                    const Icon = s.icon;
                    return (
                        <Link
                            key={s.href}
                            href={s.href}
                            className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 hover:shadow-md hover:border-slate-200 transition-all group"
                        >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${s.color}`}>
                                <Icon size={20} />
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-slate-900">{s.title}</h3>
                                {s.badge && (
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">
                                        {s.badge}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[#6c5ce7] group-hover:gap-2 transition-all">
                                Open <ChevronRight size={12} />
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
