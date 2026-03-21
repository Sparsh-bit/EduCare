'use client';

import {
    GraduationCap, CalendarCheck, IndianRupee, BookOpen,
    Users, Building2, Landmark, MessageSquare,
    CheckCircle2, ChevronRight,
} from 'lucide-react';

const modules = [
    {
        icon: GraduationCap,
        label: 'Students',
        color: 'bg-sky-50 text-sky-600',
        accent: '#0ea5e9',
        desc: 'Full admission-to-alumni lifecycle with 40+ fields, bulk import, ID cards, and promotion workflows.',
        features: ['Bulk Excel import', 'Transfer certificates', 'ID card printing', 'Class promotion'],
    },
    {
        icon: CalendarCheck,
        label: 'Attendance',
        color: 'bg-emerald-50 text-emerald-600',
        accent: '#10b981',
        desc: 'Daily one-click marking with absent SMS alerts, eligibility enforcement, and monthly analytics.',
        features: ['SMS to parents', '75% eligibility check', 'Monthly reports', 'Leave tracking'],
    },
    {
        icon: IndianRupee,
        label: 'Fee Management',
        color: 'bg-amber-50 text-amber-600',
        accent: '#f59e0b',
        desc: 'Installment-based collection, Razorpay online payments, auto late-fee calculation, and receipts.',
        features: ['Razorpay integration', 'Installment plans', 'Auto late fees', 'Fee reminders'],
    },
    {
        icon: BookOpen,
        label: 'Examinations',
        color: 'bg-purple-50 text-purple-600',
        accent: '#8b5cf6',
        desc: 'CBSE-aligned exam management with mark entry, co-scholastic assessments, and report card generation.',
        features: ['CBSE grading', 'Co-scholastic', 'Report cards', 'Results portal'],
    },
    {
        icon: Users,
        label: 'HR & Payroll',
        color: 'bg-rose-50 text-rose-600',
        accent: '#f43f5e',
        desc: 'Staff profiles, leave management, salary structure, payroll processing, and Form 16 generation.',
        features: ['Leave management', 'Salary slips', 'Form 16', 'HR dashboard'],
    },
    {
        icon: Building2,
        label: 'Front Desk',
        color: 'bg-orange-50 text-orange-600',
        accent: '#f97316',
        desc: 'Manage enquiries, gate passes, visitors, postal records, and lost-found from one console.',
        features: ['Enquiry tracking', 'Gate passes', 'Visitor log', 'Postal records'],
    },
    {
        icon: Landmark,
        label: 'Accounts',
        color: 'bg-teal-50 text-teal-600',
        accent: '#14b8a6',
        desc: 'Track income, expenses, vendor bills, bank reconciliation, and GST-ready financial reports.',
        features: ['Income & expenses', 'Vendor bills', 'Bank reconciliation', 'GST config'],
    },
    {
        icon: MessageSquare,
        label: 'Communication',
        color: 'bg-indigo-50 text-indigo-600',
        accent: '#6366f1',
        desc: 'DLT-compliant bulk SMS with delivery tracking, targeted groups, and automated fee/attendance alerts.',
        features: ['Bulk SMS', 'DLT templates', 'Delivery reports', 'Auto alerts'],
    },
];

export default function ModulesSection() {
    return (
        <section id="modules" className="py-24 px-6" style={{ backgroundColor: 'var(--color-brand-900)' }}>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-14 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-3 text-white/40">
                            All Modules
                        </p>
                        <h2 className="text-4xl font-black text-white leading-tight max-w-md">
                            Every department.<br />One system.
                        </h2>
                        <p className="text-white/50 text-base mt-3 max-w-sm leading-relaxed">
                            8 fully integrated modules — no third-party add-ons required.
                        </p>
                    </div>
                    <a
                        href="/signup"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0"
                        style={{ backgroundColor: 'var(--color-brand-600)', color: '#fff' }}
                    >
                        Get started free <ChevronRight size={14} />
                    </a>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {modules.map((mod) => {
                        const Icon = mod.icon;
                        return (
                            <div
                                key={mod.label}
                                className="group relative rounded-2xl p-5 transition-all duration-200 border border-white/[0.06] hover:border-white/[0.14] cursor-default"
                                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${mod.color}`}>
                                    <Icon size={18} />
                                </div>

                                {/* Label + desc */}
                                <h3 className="text-sm font-bold text-white mb-1.5">{mod.label}</h3>
                                <p className="text-xs text-white/45 leading-relaxed mb-4">{mod.desc}</p>

                                {/* Feature list */}
                                <ul className="space-y-1.5">
                                    {mod.features.map(f => (
                                        <li key={f} className="flex items-center gap-2 text-xs text-white/55">
                                            <CheckCircle2 size={11} style={{ color: mod.accent }} className="shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
