'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Play, UserCheck, TrendingUp, CalendarCheck } from 'lucide-react';

const gridSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M40 0v40M0 0h40' stroke='white' stroke-opacity='0.05' stroke-width='1'/%3E%3C/svg%3E")`;

function FloatingBadge({ children, className, delay = 0 }: { children: React.ReactNode; className: string; delay?: number }) {
    return (
        <motion.div
            className={`absolute bg-white rounded-xl shadow-xl px-4 py-3 ${className}`}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay }}
        >
            {children}
        </motion.div>
    );
}

function DashboardMockup() {
    return (
        <div className="relative max-w-4xl mx-auto mt-16">
            {/* Browser frame */}
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
                {/* Browser bar */}
                <div className="h-10 flex items-center px-4 gap-2" style={{ backgroundColor: 'rgba(20,28,21,0.85)' }}>
                    <span className="w-3 h-3 rounded-full bg-red-400/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
                    <span className="w-3 h-3 rounded-full bg-green-400/80" />
                    <div className="mx-auto h-5 w-64 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                </div>
                {/* App content */}
                <div className="flex" style={{ backgroundColor: '#f8f9fb', minHeight: 320 }}>
                    {/* Sidebar strip */}
                    <div className="w-16 shrink-0 flex flex-col items-center gap-3 py-4" style={{ backgroundColor: 'var(--color-brand-800)' }}>
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className={`w-8 h-8 rounded-lg ${i === 0 ? 'bg-white/20' : 'bg-white/8'}`} />
                        ))}
                    </div>
                    {/* Main content */}
                    <div className="flex-1 flex flex-col">
                        {/* Top header */}
                        <div className="h-10 border-b bg-white flex items-center px-4 gap-3" style={{ borderColor: '#f3f4f6' }}>
                            <div className="h-4 w-32 rounded bg-gray-100" />
                            <div className="ml-auto h-6 w-6 rounded-full bg-gray-100" />
                        </div>
                        {/* Content area */}
                        <div className="flex-1 p-4 grid grid-cols-4 gap-3 content-start">
                            {/* Stat cards */}
                            {[
                                { color: '#dcfce7', accent: '#16a34a' },
                                { color: '#dbeafe', accent: '#2563eb' },
                                { color: '#fef3c7', accent: '#d97706' },
                                { color: '#f3e8ff', accent: '#9333ea' },
                            ].map((c, i) => (
                                <div key={i} className="rounded-xl p-3" style={{ backgroundColor: c.color }}>
                                    <div className="h-3 w-12 rounded mb-2" style={{ backgroundColor: c.accent + '40' }} />
                                    <div className="h-5 w-16 rounded" style={{ backgroundColor: c.accent + '60' }} />
                                    <div className="h-2 w-8 rounded mt-2" style={{ backgroundColor: c.accent + '30' }} />
                                </div>
                            ))}
                            {/* Chart placeholder */}
                            <div className="col-span-3 rounded-xl bg-white border p-3" style={{ borderColor: '#f3f4f6' }}>
                                <div className="h-3 w-24 rounded bg-gray-100 mb-3" />
                                <div className="flex items-end gap-1 h-16">
                                    {[65, 80, 55, 90, 70, 85, 75, 95, 60, 88].map((h, i) => (
                                        <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: `var(--color-brand-${i % 3 === 0 ? '600' : i % 2 === 0 ? '400' : '300'})`, opacity: 0.7 }} />
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-xl bg-white border p-3" style={{ borderColor: '#f3f4f6' }}>
                                <div className="h-3 w-16 rounded bg-gray-100 mb-3" />
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex items-center gap-2 mb-2">
                                        <div className="w-4 h-4 rounded-full bg-gray-100" />
                                        <div className="h-2 rounded bg-gray-100" style={{ width: `${60 + i * 10}%` }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating badges */}
            <FloatingBadge className="hidden sm:flex items-center gap-2 -top-4 -left-6 z-10" delay={0}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50">
                    <UserCheck size={14} className="text-emerald-600" />
                </div>
                <div>
                    <p className="text-xs font-bold text-neutral-900">1,247</p>
                    <p className="text-[10px] text-neutral-500 leading-none">Active Students</p>
                </div>
            </FloatingBadge>

            <FloatingBadge className="hidden sm:flex items-center gap-2 -top-4 -right-6 z-10" delay={1}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50">
                    <TrendingUp size={14} className="text-emerald-600" />
                </div>
                <div>
                    <p className="text-xs font-bold text-neutral-900">₹2.4L</p>
                    <p className="text-[10px] text-neutral-500 leading-none">Collected Today</p>
                </div>
            </FloatingBadge>

            <FloatingBadge className="hidden sm:flex items-center gap-2 -bottom-4 -right-4 z-10" delay={2}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50">
                    <CalendarCheck size={14} className="text-blue-600" />
                </div>
                <div>
                    <p className="text-xs font-bold text-neutral-900">98.2%</p>
                    <p className="text-[10px] text-neutral-500 leading-none">Attendance</p>
                </div>
            </FloatingBadge>
        </div>
    );
}

export default function HeroSection() {
    return (
        <section
            id="home"
            className="relative min-h-[100svh] overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--color-brand-800)' }}
        >
            {/* Grid pattern */}
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: gridSvg }} />
            {/* Radial glow */}
            <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(74,134,84,0.3) 0%, transparent 60%)' }}
            />
            {/* Bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent, #f8f9fb)' }}
            />

            {/* Content */}
            <div className="relative flex-1 flex flex-col items-center text-center max-w-5xl mx-auto px-6 pt-32 pb-24 w-full">
                {/* Announcement badge */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-sm mb-8"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-white/90 text-sm">Now with AI-powered student insights →</span>
                </motion.div>

                {/* Heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight"
                >
                    The Complete School ERP
                    <br />
                    Built for{' '}
                    <span style={{ color: 'var(--color-brand-300)' }}>India.</span>
                </motion.h1>

                {/* Subheading */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="text-lg md:text-xl text-white/70 max-w-2xl mt-6 leading-relaxed"
                >
                    From admissions to report cards — manage every aspect of your school
                    with one powerful platform. CBSE-aligned, RTE-compliant, parent-ready.
                </motion.p>

                {/* CTA buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex items-center gap-3 mt-10 flex-wrap justify-center"
                >
                    <Link
                        href="/register"
                        className="px-6 py-3 rounded-xl text-base font-semibold text-brand-800 bg-white hover:bg-neutral-100 transition-colors shadow-lg shadow-black/20"
                        style={{ color: 'var(--color-brand-800)' }}
                    >
                        Get Started Free
                    </Link>
                    <button
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-base text-white border border-white/30 hover:bg-white/10 transition-colors"
                    >
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                            <Play size={10} fill="white" className="text-white ml-0.5" />
                        </div>
                        Watch Demo
                    </button>
                </motion.div>

                {/* Social proof */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-white/50 text-sm mt-8"
                >
                    ★★★★★&nbsp;&nbsp;Trusted by 200+ schools across India
                </motion.p>

                {/* Dashboard mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="w-full"
                >
                    <DashboardMockup />
                </motion.div>
            </div>
        </section>
    );
}
