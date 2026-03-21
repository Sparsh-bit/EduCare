'use client';
import Link from 'next/link';
import { useState } from 'react';

const fullFeatures = [
    {
        icon: '🎓',
        title: 'Student Lifecycle Management',
        desc: 'From initial enquiry to alumni status, EduCare tracks the complete student journey in one unified view. Parents and teachers always have access to the latest records, disciplinary notes, and past performance.',
        points: ['Digital Admission Forms', 'Document Repository', 'Alumni Tracking', 'Health & Disciplinary Records']
    },
    {
        icon: '📋',
        title: 'Smart Attendance System',
        desc: 'Automate daily attendance right from the native portal. EduCare automatically calculates percentages and flags students falling below the 75% CBSE mandatory criteria before exams.',
        points: ['Biometric & RFID Integration Ready', 'Subject-wise Tracking', 'Automated Parent Alerts', 'Low Attendance Warnings']
    },
    {
        icon: '💰',
        title: 'Comprehensive Fee Management',
        desc: 'Stop chasing payments. Our system supports flexible installments, custom fine structures, and integrates directly with modern Indian payment gateways like Razorpay.',
        points: ['Automated Late Fees', 'Custom Concessions (Sibling/Staff)', 'Online & Cash Receipting', 'Defaulter Reports']
    },
    {
        icon: '📝',
        title: 'Examinations & Results',
        desc: 'Generate report cards that strictly adhere to CBSE circulars and NEP 2020 guidelines. Manage complex weighting, co-scholastic grades, and instant publishing to the parent portal.',
        points: ['NEP 2020 Compliant Report Cards', 'Custom Scaling & Weightage', 'Bulk Marks Entry', 'Graphical Performance Analytics']
    },
    {
        icon: '👨‍🏫',
        title: 'HR & Staff Management',
        desc: 'Manage your most valuable assets with ease. Track staff attendance, process complex salary structures with PF/ESI deductions, and manage leave requests digitally.',
        points: ['Automated Payroll Processing', 'Leave Workflow Approvals', 'Teacher Substitution Mapping', 'Document Management']
    },
    {
        icon: '📱',
        title: 'Dedicated Portals',
        desc: 'Give parents, students, and staff their own dedicated, secure logins. Everyone sees exactly what they need, fostering transparency and reducing administrative phone calls.',
        points: ['Parent Mobile View', 'Teacher Dashboard', 'Homework & Assignments', 'Library Management Access']
    }
];

export default function FeaturesPage() {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const closeMobileNav = () => setMobileNavOpen(false);

    return (
        <div className="min-h-screen bg-[#f8f9fb] scroll-smooth selection:bg-[#6c5ce7]/20">
            {/* ─── Navbar ─── */}
            <nav className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md border-b border-[#6c5ce7]/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#6c5ce7] rounded-lg flex items-center justify-center">
                            <span className="text-[#f8f9fb] font-bold text-sm">C</span>
                        </div>
                        <span className="text-[#6c5ce7] font-semibold text-lg tracking-tight">Concilio</span>
                    </Link>
                    <div className="hidden lg:flex items-center gap-8 text-[13px] font-semibold text-[#6c5ce7]/70 tracking-wide">
                        <Link href="/" className="hover:text-[#6c5ce7] transition-colors">Home</Link>

                        <div className="relative group cursor-pointer inline-block py-2">
                            <Link href="/features" className="text-[#6c5ce7] font-bold transition-colors flex items-center gap-1.5">
                                Features
                                <svg className="w-3.5 h-3.5 text-[#6c5ce7]/80 group-hover:text-[#6c5ce7] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </Link>
                            {/* Dropdown menu */}
                            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#6c5ce7]/10 rounded-xl shadow-xl shadow-[#6c5ce7]/5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 p-2">
                                <Link href="#academic" className="block px-4 py-2.5 text-xs text-[#6c5ce7]/70 hover:text-[#6c5ce7] hover:bg-[#f8f9fb] rounded-lg transition-colors">Academic Management</Link>
                                <Link href="#finance" className="block px-4 py-2.5 text-xs text-[#6c5ce7]/70 hover:text-[#6c5ce7] hover:bg-[#f8f9fb] rounded-lg transition-colors">Fee & Finance</Link>
                                <Link href="#hr" className="block px-4 py-2.5 text-xs text-[#6c5ce7]/70 hover:text-[#6c5ce7] hover:bg-[#f8f9fb] rounded-lg transition-colors">HR & Payroll</Link>
                                <Link href="#portals" className="block px-4 py-2.5 text-xs text-[#6c5ce7]/70 hover:text-[#6c5ce7] hover:bg-[#f8f9fb] rounded-lg transition-colors">Student/Parent Portals</Link>
                            </div>
                        </div>

                        <Link href="/#about" className="hover:text-[#6c5ce7] transition-colors">About Us</Link>
                        <Link href="/register" className="hover:text-[#6c5ce7] transition-colors">Contact</Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/register"
                            className="px-5 py-2 text-sm font-medium text-[#6c5ce7] hover:text-[#6c5ce7]/70 transition-colors tracking-wide hidden sm:block"
                        >
                            REQUEST SETUP
                        </Link>
                        <Link
                            href="/login"
                            className="px-5 py-2 text-sm font-medium text-[#f8f9fb] bg-[#6c5ce7] rounded-full hover:bg-[#5b4bd5] transition-colors tracking-wide"
                        >
                            SIGN IN
                        </Link>
                        <button
                            type="button"
                            aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
                            onClick={() => setMobileNavOpen((prev) => !prev)}
                            className="lg:hidden h-9 w-9 rounded-lg border border-[#6c5ce7]/20 text-[#6c5ce7] flex items-center justify-center"
                        >
                            {mobileNavOpen ? '✕' : '☰'}
                        </button>
                    </div>
                </div>
                {mobileNavOpen && (
                    <div className="lg:hidden border-t border-[#6c5ce7]/10 bg-[#f8f9fb] px-4 py-3">
                        <div className="flex flex-col gap-1 text-sm font-medium text-[#6c5ce7]/80">
                            <Link href="/" onClick={closeMobileNav} className="px-3 py-2 rounded-lg hover:bg-[#6c5ce7]/5">Home</Link>
                            <Link href="/features" onClick={closeMobileNav} className="px-3 py-2 rounded-lg hover:bg-[#6c5ce7]/5">Features</Link>
                            <Link href="/#about" onClick={closeMobileNav} className="px-3 py-2 rounded-lg hover:bg-[#6c5ce7]/5">About Us</Link>
                            <Link href="/register" onClick={closeMobileNav} className="px-3 py-2 rounded-lg hover:bg-[#6c5ce7]/5">Contact</Link>
                            <Link href="/register" onClick={closeMobileNav} className="px-3 py-2 rounded-lg hover:bg-[#6c5ce7]/5">Request Setup</Link>
                        </div>
                    </div>
                )}
            </nav>

            {/* ─── Header Section ─── */}
            <section className="pt-32 pb-16 px-6 max-w-4xl mx-auto text-center">
                <p className="text-xs font-medium text-[#6c5ce7]/50 tracking-[0.2em] uppercase mb-4">
                    EduCare Core Modules
                </p>
                <h1
                    className="text-4xl md:text-6xl font-light text-[#6c5ce7] leading-tight mb-6"
                    style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
                >
                    Engineered for excellence, <br className="hidden md:block" /> built for Indian schools.
                </h1>
                <p className="text-lg text-[#6c5ce7]/60 leading-relaxed">
                    Explore the exhaustive suite of features designed to eliminate paperwork and bring
                    real-time transparency to administrators, teachers, and parents alike.
                </p>
            </section>

            {/* ─── Features Grid ─── */}
            <section className="py-12 px-6 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                    {fullFeatures.map((feature, idx) => (
                        <div
                            key={idx}
                            className="group bg-white/60 backdrop-blur-sm border border-[#6c5ce7]/10 rounded-3xl p-8 md:p-10 hover:shadow-xl hover:shadow-[#6c5ce7]/5 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden"
                        >
                            {/* Subtle background gradient on hover */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#6c5ce7]/0 to-[#6c5ce7]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-[#6c5ce7]/5 rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-sm border border-[#6c5ce7]/5 group-hover:scale-110 transition-transform duration-500">
                                    {feature.icon}
                                </div>
                                <h3 className="text-2xl font-semibold text-[#6c5ce7] mb-4">
                                    {feature.title}
                                </h3>
                                <p className="text-[#6c5ce7]/70 leading-relaxed mb-8 text-sm md:text-base">
                                    {feature.desc}
                                </p>
                                <ul className="space-y-3">
                                    {feature.points.map((point, pIdx) => (
                                        <li key={pIdx} className="flex items-start gap-3 text-sm text-[#6c5ce7]/80">
                                            <svg className="w-5 h-5 text-[#6c5ce7]/40 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── CTA Section ─── */}
            <section className="py-24 px-6 text-center">
                <h2 className="text-3xl font-light text-[#6c5ce7] mb-8" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                    Ready to upgrade your school&apos;s digital infrastructure?
                </h2>
                <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium text-[#f8f9fb] bg-[#6c5ce7] rounded-full hover:bg-[#5b4bd5] transition-all hover:shadow-lg shadow-[#6c5ce7]/20"
                >
                    REQUEST EDUCARE SETUP
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </Link>
            </section>

            {/* ─── Footer ─── */}
            <footer className="py-8 px-6 border-t border-[#6c5ce7]/10 bg-[#f8f9fb]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-[#6c5ce7] rounded-md flex items-center justify-center">
                            <span className="text-[#f8f9fb] font-bold text-[10px]">C</span>
                        </div>
                        <span className="text-[#6c5ce7] font-semibold text-sm">Concilio</span>
                    </div>
                    <p className="text-xs text-[#6c5ce7]/40">
                        The complete platform to manage, track, and grow your school.
                    </p>
                    <p className="text-xs text-[#6c5ce7]/40">
                        © {new Date().getFullYear()} Concilio. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
