'use client';

import { useEffect, useRef, useState } from 'react';

const gridSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M40 0v40M0 0h40' stroke='white' stroke-opacity='0.05' stroke-width='1'/%3E%3C/svg%3E")`;

const stats = [
    { value: 200, suffix: '+', label: 'Schools Enrolled', prefix: '' },
    { value: 50000, suffix: '+', label: 'Students Managed', prefix: '' },
    { value: 10, suffix: 'Cr+', label: 'Fees Processed', prefix: '₹' },
    { value: 99.9, suffix: '%', label: 'Uptime SLA', prefix: '' },
];

function AnimatedCounter({ value, prefix, suffix, inView }: {
    value: number; prefix: string; suffix: string; inView: boolean;
}) {
    const [display, setDisplay] = useState(0);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        if (!inView) return;
        const start = performance.now();
        const duration = 2000;
        const isDecimal = value % 1 !== 0;

        function animate(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = isDecimal
                ? Math.round(value * ease * 10) / 10
                : Math.round(value * ease);
            setDisplay(current);
            if (progress < 1) frameRef.current = requestAnimationFrame(animate);
        }
        frameRef.current = requestAnimationFrame(animate);
        return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
    }, [inView, value]);

    const formatted = value >= 1000 ? display.toLocaleString('en-IN') : display.toString();
    return <span>{prefix}{formatted}{suffix}</span>;
}

export default function StatsSection() {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setInView(true); },
            { threshold: 0.3 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <section
            ref={ref}
            className="py-20 relative overflow-hidden"
            style={{ backgroundColor: 'var(--color-brand-800)' }}
        >
            {/* Background grid */}
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: gridSvg }} />

            <div className="relative max-w-6xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4">
                    {stats.map((stat, i) => (
                        <div key={stat.label} className="relative flex flex-col items-center text-center p-8">
                            {/* Vertical divider (desktop) */}
                            {i < stats.length - 1 && (
                                <div className="hidden md:block absolute right-0 top-8 bottom-8 w-px bg-white/10" />
                            )}
                            {/* Horizontal divider (mobile, between rows) */}
                            {i < 2 && (
                                <div className="md:hidden absolute bottom-0 left-8 right-8 h-px bg-white/10" />
                            )}
                            <p className="text-5xl font-bold text-white tabular-nums">
                                <AnimatedCounter
                                    value={stat.value}
                                    prefix={stat.prefix}
                                    suffix={stat.suffix}
                                    inView={inView}
                                />
                            </p>
                            <p className="text-base text-white/60 mt-2">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
