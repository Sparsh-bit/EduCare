'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { CloudUpload, Users, CheckCircle } from 'lucide-react';

const steps = [
    {
        icon: CloudUpload,
        title: 'Register Your School',
        desc: 'Create your account, configure your classes, and upload your school branding.',
    },
    {
        icon: Users,
        title: 'Import Students & Staff',
        desc: 'Bulk import from Excel, or add individually. Fees and roles auto-assigned.',
    },
    {
        icon: CheckCircle,
        title: 'Go Live',
        desc: 'Enable parent access, activate SMS alerts, and start your first academic session.',
    },
];

export default function HowItWorksSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });

    return (
        <section className="bg-white py-24 px-6" id="how-it-works">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto">
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-brand-600)' }}>
                    Simple Setup
                </p>
                <h2 className="text-4xl font-bold text-neutral-900 leading-tight">
                    Up and running in 24 hours
                </h2>
                <p className="text-lg text-neutral-500 mt-4">
                    No lengthy implementation. No IT team required.
                    Just set up your school, import your students, and you&apos;re live.
                </p>
            </div>

            {/* Steps */}
            <div ref={ref} className="mt-16 max-w-4xl mx-auto">
                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Connecting line (desktop) */}
                    <div
                        className="hidden md:block absolute h-px top-8 z-0"
                        style={{
                            left: 'calc(16.67% + 2rem)',
                            right: 'calc(16.67% + 2rem)',
                            backgroundColor: 'var(--color-brand-100)',
                        }}
                    />

                    {steps.map((step, i) => {
                        const Icon = step.icon;
                        return (
                            <motion.div
                                key={step.title}
                                initial={{ opacity: 0, y: 24 }}
                                animate={isInView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.5, delay: i * 0.15, ease: [0.4, 0, 0.2, 1] }}
                                className="relative z-10 flex flex-col items-center text-center"
                            >
                                {/* Step circle */}
                                <div
                                    className="w-16 h-16 rounded-full border-2 flex items-center justify-center transition-colors"
                                    style={{
                                        backgroundColor: 'var(--color-brand-600)',
                                        borderColor: 'var(--color-brand-600)',
                                    }}
                                >
                                    <Icon className="w-7 h-7 text-white" />
                                </div>
                                <div className="mt-4">
                                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-brand-500)' }}>
                                        Step {i + 1}
                                    </p>
                                    <h3 className="text-base font-semibold text-neutral-900">{step.title}</h3>
                                    <p className="text-sm text-neutral-500 mt-2 max-w-[200px] mx-auto leading-relaxed">{step.desc}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
