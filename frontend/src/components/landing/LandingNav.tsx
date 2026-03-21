'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Modules', href: '#modules' },
    { label: 'Pricing', href: '#pricing' },
];

function scrollTo(id: string) {
    const el = document.querySelector(id);
    el?.scrollIntoView({ behavior: 'smooth' });
}

export default function LandingNav() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 60);
        window.addEventListener('scroll', handler, { passive: true });
        handler();
        return () => window.removeEventListener('scroll', handler);
    }, []);

    const transparent = !scrolled && !mobileOpen;

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
                transparent
                    ? 'bg-transparent'
                    : 'bg-white/95 backdrop-blur-md shadow-sm border-b border-neutral-100'
            }`}
        >
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <button
                    onClick={() => scrollTo('#home')}
                    className="flex items-center gap-2 group"
                >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: transparent ? 'rgba(255,255,255,0.15)' : 'var(--color-brand-800)' }}>
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth="2">
                            <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6l-8-4z" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className={`font-bold text-lg tracking-tight transition-colors ${transparent ? 'text-white' : 'text-brand-800'}`}
                        style={!transparent ? { color: 'var(--color-brand-800)' } : undefined}>
                        EduCare
                    </span>
                </button>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <button
                            key={link.href}
                            onClick={() => scrollTo(link.href)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                transparent
                                    ? 'text-white/80 hover:text-white hover:bg-white/10'
                                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                            }`}
                        >
                            {link.label}
                        </button>
                    ))}
                </nav>

                {/* Desktop CTA */}
                <div className="hidden md:flex items-center gap-3">
                    <button
                        onClick={() => window.location.href = 'mailto:official.concilio@gmail.com'}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            transparent
                                ? 'text-white/80 hover:text-white hover:bg-white/10'
                                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                        }`}
                    >
                        Contact Sales
                    </button>
                    <Link
                        href="/login"
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                            transparent
                                ? 'border border-white/40 text-white hover:bg-white/10'
                                : 'text-white hover:opacity-90'
                        }`}
                        style={!transparent ? { backgroundColor: 'var(--color-brand-700)' } : undefined}
                    >
                        Login
                    </Link>
                </div>

                {/* Mobile hamburger */}
                <button
                    className={`md:hidden p-2 rounded-lg ${transparent ? 'text-white hover:bg-white/10' : 'text-neutral-700 hover:bg-neutral-100'}`}
                    onClick={() => setMobileOpen(v => !v)}
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="md:hidden overflow-hidden bg-white border-b border-neutral-100"
                    >
                        <div className="px-6 py-4 flex flex-col gap-1">
                            {navLinks.map((link) => (
                                <button
                                    key={link.href}
                                    onClick={() => { scrollTo(link.href); setMobileOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
                                >
                                    {link.label}
                                </button>
                            ))}
                            <div className="pt-3 border-t border-neutral-100 mt-2 flex flex-col gap-2">
                                <button 
                                    onClick={() => { window.location.href = 'mailto:official.concilio@gmail.com'; setMobileOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
                                >
                                    Contact Sales
                                </button>
                                <Link
                                    href="/login"
                                    className="px-4 py-2.5 text-sm font-semibold text-white rounded-lg text-center"
                                    style={{ backgroundColor: 'var(--color-brand-700)' }}
                                    onClick={() => setMobileOpen(false)}
                                >
                                    Login
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
