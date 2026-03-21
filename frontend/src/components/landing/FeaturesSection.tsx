'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
    GraduationCap, IndianRupee, CalendarCheck, BookOpen,
    Users, MessageSquare, Building2, Landmark,
    BarChart2, FileText, Shield, Cpu,
} from 'lucide-react';

const features = [
    {
        icon: GraduationCap,
        bg: 'bg-green-50',
        color: 'text-green-700',
        title: 'Student Management',
        desc: 'Complete student lifecycle from admission to alumni, with bulk import and document tracking.',
    },
    {
        icon: IndianRupee,
        bg: 'bg-emerald-50',
        color: 'text-emerald-700',
        title: 'Fee Management',
        desc: 'Installment-based fee collection, Razorpay integration, automatic receipts, and due tracking.',
    },
    {
        icon: CalendarCheck,
        bg: 'bg-blue-50',
        color: 'text-blue-700',
        title: 'Attendance Tracking',
        desc: 'Daily student and staff attendance with parent SMS alerts and 75% eligibility enforcement.',
    },
    {
        icon: BookOpen,
        bg: 'bg-purple-50',
        color: 'text-purple-700',
        title: 'Examination & Results',
        desc: 'CBSE-aligned mark entry, grade computation, and report card generation in one flow.',
    },
    {
        icon: Users,
        bg: 'bg-orange-50',
        color: 'text-orange-700',
        title: 'HR & Payroll',
        desc: 'Staff records, leave management, salary processing, and biometric integration.',
    },
    {
        icon: MessageSquare,
        bg: 'bg-pink-50',
        color: 'text-pink-700',
        title: 'Communication',
        desc: 'Bulk SMS and WhatsApp messaging with DLT-compliant templates for parents and staff.',
    },
    {
        icon: Building2,
        bg: 'bg-cyan-50',
        color: 'text-cyan-700',
        title: 'Front Desk',
        desc: 'Admission enquiries, gate passes, visitor log, and postal management from one screen.',
    },
    {
        icon: Landmark,
        bg: 'bg-amber-50',
        color: 'text-amber-700',
        title: 'Accounts',
        desc: 'Income tracking, expense management, vendor bills, and P&L overview for the school.',
    },
    {
        icon: BarChart2,
        bg: 'bg-rose-50',
        color: 'text-rose-700',
        title: 'Analytics Dashboard',
        desc: 'Role-specific dashboards with live stats, charts, and actionable insights.',
    },
    {
        icon: FileText,
        bg: 'bg-teal-50',
        color: 'text-teal-700',
        title: 'Certificates & Reports',
        desc: 'Transfer certificates, bonafide, character certificates, and APAAR consent forms.',
    },
    {
        icon: Shield,
        bg: 'bg-violet-50',
        color: 'text-violet-700',
        title: 'Multi-Tenant Security',
        desc: 'Complete school data isolation, JWT auth, rate limiting, and audit trail on every action.',
    },
    {
        icon: Cpu,
        bg: 'bg-lime-50',
        color: 'text-lime-700',
        title: 'AI Integration',
        desc: 'AI-powered Hindi name suggestions, class recommendations, and smart chatbot for staff.',
    },
];

const container = {
    animate: { transition: { staggerChildren: 0.06 } },
};
const item = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
};

export default function FeaturesSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });

    return (
        <section id="features" className="bg-neutral-50 py-24 px-6">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto">
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-brand-600)' }}>
                    Everything You Need
                </p>
                <h2 className="text-4xl font-bold text-neutral-900 leading-tight">
                    One platform for every corner of your school
                </h2>
                <p className="text-lg text-neutral-500 mt-4">
                    From the front gate to the classroom — all your school operations in a single, unified system.
                </p>
            </div>

            {/* Grid */}
            <motion.div
                ref={ref}
                variants={container}
                initial="initial"
                animate={isInView ? 'animate' : 'initial'}
                className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
            >
                {features.map((f) => {
                    const Icon = f.icon;
                    return (
                        <motion.div
                            key={f.title}
                            variants={item}
                            className="bg-white rounded-2xl p-6 border border-neutral-200 hover:shadow-md hover:border-neutral-300 transition-all duration-200 hover:-translate-y-0.5"
                        >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.bg}`}>
                                <Icon className={`w-5 h-5 ${f.color}`} />
                            </div>
                            <h3 className="text-base font-semibold text-neutral-900 mb-2">{f.title}</h3>
                            <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
                        </motion.div>
                    );
                })}
            </motion.div>
        </section>
    );
}
