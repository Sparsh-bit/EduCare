'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const slides = [
    {
        quote: '"Reduced our admin work by 60%. EduCare handles everything from fee reminders to report cards."',
        author: 'Mrs. Sunita Agarwal',
        role: 'Principal',
        school: 'Delhi Public School',
        stat: '1,247 students, 0 manual registers',
    },
    {
        quote: '"Fee collection was always a chaos. Not anymore. Parents pay online, we get instant confirmation."',
        author: 'Mr. Prakash Nair',
        role: 'Administrator',
        school: 'Ryan International School',
    stat: '₹2.4L collected in a single day',
    },
    {
        quote: '"Parents trust us more when they get instant attendance alerts. EduCare made that possible."',
        author: 'Dr. Meena Krishnamurthy',
        role: 'School Owner',
        school: 'Greenfield Academy, Pune',
        stat: '98.2% parent satisfaction',
    },
];

function Logo({ white = false }: { white?: boolean }) {
    return (
        <div className="flex items-center gap-2.5">
            <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: white ? 'rgba(255,255,255,0.15)' : 'var(--color-brand-700)' }}
            >
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth="2">
                    <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6l-8-4z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <div>
                <p className={`font-bold text-base leading-tight ${white ? 'text-white' : 'text-neutral-900'}`}>EduCare</p>
                <p className={`text-xs leading-none ${white ? 'text-white/50' : 'text-neutral-400'}`}>by Concilio</p>
            </div>
        </div>
    );
}

interface AuthLayoutProps {
    children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
    const [slideIndex, setSlideIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setSlideIndex(i => (i + 1) % slides.length), 4000);
        return () => clearInterval(timer);
    }, []);

    const slide = slides[slideIndex];

    return (
        <div className="min-h-screen flex overflow-hidden">
            {/* Left panel — dark green */}
            <div
                className="hidden lg:flex lg:w-[52%] flex-col h-screen sticky top-0 relative overflow-hidden p-12"
                style={{ backgroundColor: 'var(--color-brand-800)' }}
            >
                {/* Decorative circles */}
                <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute top-20 -left-20 w-[300px] h-[300px] rounded-full bg-white/5 pointer-events-none" />
                {/* Grid pattern */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0v40M0 0h40' stroke='white' stroke-opacity='0.04' stroke-width='1'/%3E%3C/svg%3E")`
                }} />

                {/* Top: Logo */}
                <div className="relative z-10">
                    <Logo white />
                </div>

                {/* Middle: Rotating testimonial */}
                <div className="relative z-10 flex-1 flex flex-col justify-center my-12">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={slideIndex}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
                        >
                            <p className="text-xl md:text-2xl font-medium text-white leading-relaxed mb-8">
                                {slide.quote}
                            </p>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                                    {slide.author.split(' ').map(w => w[0]).slice(0, 2).join('')}
                                </div>
                                <div>
                                    <p className="text-white font-semibold text-sm">{slide.author}</p>
                                    <p className="text-white/60 text-xs">{slide.role} · {slide.school}</p>
                                </div>
                            </div>
                            <div
                                className="inline-flex items-center gap-2.5 px-4 py-3 rounded-xl border border-white/10"
                                style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                            >
                                <div className="w-2 h-2 rounded-full bg-green-400" />
                                <span className="text-sm text-white/80 font-medium">{slide.stat}</span>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Slide indicators */}
                    <div className="flex items-center gap-2 mt-10">
                        {slides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setSlideIndex(i)}
                                className={`rounded-full transition-all ${i === slideIndex ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/30 hover:bg-white/50'}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Bottom: copyright */}
                <p className="relative z-10 text-white/40 text-sm">
                    © {new Date().getFullYear()} EduCare by Concilio
                </p>
            </div>

            {/* Right panel — white */}
            <div className="w-full lg:w-[48%] bg-white flex flex-col min-h-screen">
                {/* Mobile logo */}
                <div className="lg:hidden px-6 py-5 border-b border-neutral-100">
                    <Logo />
                </div>
                <div className="flex-1 flex items-center justify-center p-8">
                    {children}
                </div>
            </div>
        </div>
    );
}
