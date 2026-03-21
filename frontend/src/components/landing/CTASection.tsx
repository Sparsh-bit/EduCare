'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

const gridSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M40 0v40M0 0h40' stroke='white' stroke-opacity='0.05' stroke-width='1'/%3E%3C/svg%3E")`;

const badges = [
    'Free 30-day trial',
    'No credit card',
    'Setup in 24 hours',
];

export default function CTASection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });

    return (
        <section
            className="py-24 px-6 relative overflow-hidden"
            style={{ backgroundColor: 'var(--color-brand-800)' }}
        >
            {/* Background grid */}
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: gridSvg }} />
            {/* Radial glow */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(74,134,84,0.25) 0%, transparent 70%)' }}
            />

            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="relative max-w-2xl mx-auto text-center"
            >
                <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                    Ready to modernize your school?
                </h2>
                <p className="text-lg text-white/70 mt-4">
                    Join 200+ schools already using EduCare.
                    No credit card required to get started.
                </p>

                <div className="mt-10 flex gap-4 justify-center flex-wrap">
                    <Link
                        href="/register"
                        className="px-8 py-3.5 rounded-xl font-semibold text-base bg-white hover:bg-neutral-100 transition-colors shadow-lg"
                        style={{ color: 'var(--color-brand-800)' }}
                    >
                        Start Free Trial
                    </Link>
                    <button
                        className="px-8 py-3.5 rounded-xl font-semibold text-base text-white border border-white/30 hover:bg-white/10 transition-colors"
                    >
                        Talk to Sales
                    </button>
                </div>

                <div className="mt-12 flex items-center justify-center gap-6 md:gap-8 flex-wrap">
                    {badges.map((b) => (
                        <div key={b} className="flex items-center gap-2 text-sm text-white/60">
                            <CheckCircle className="w-4 h-4" style={{ color: 'var(--color-brand-400)' }} />
                            {b}
                        </div>
                    ))}
                </div>
            </motion.div>
        </section>
    );
}
