"use client";

import { useState } from 'react';
import Link from 'next/link';
import { API_BASE } from '@/lib/runtimeConfig';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, User, Mail, Lock, Phone, MapPin, ShieldCheck,
    ArrowRight, ArrowLeft, BookOpen, LayoutGrid, ClipboardCheck,
    Eye, EyeOff, Check, Copy, GraduationCap, Zap, Users, BarChart3,
} from 'lucide-react';

const BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'Others'];
const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface FormData {
    schoolName: string; ownerName: string; email: string; password: string;
    phone: string; address: string; board: string;
    includePrePrimary: boolean; numClasses: number; sectionsPerClass: number;
}

const stepMeta = [
    { label: 'School Info', icon: Building2, desc: 'Basic details & admin account' },
    { label: 'Class Setup', icon: LayoutGrid, desc: 'Configure classes and sections' },
    { label: 'Review', icon: ClipboardCheck, desc: 'Confirm and launch' },
];

const FEATURES = [
    { icon: Users, text: 'Student records, attendance & fees in one place' },
    { icon: BarChart3, text: 'Real-time dashboard & analytics' },
    { icon: Zap, text: 'Parent portal with instant notifications' },
    { icon: ShieldCheck, text: 'Bank-grade security, data hosted in India' },
];

const inputCls = "w-full h-10 px-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/10 outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400";

export default function SignUpPage() {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>({
        schoolName: '', ownerName: '', email: '', password: '', phone: '', address: '',
        board: 'CBSE', includePrePrimary: false, numClasses: 10, sectionsPerClass: 2,
    });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [schoolCode, setSchoolCode] = useState('');
    const [copied, setCopied] = useState(false);

    const set = (key: keyof FormData, value: string | number | boolean) =>
        setForm(f => ({ ...f, [key]: value }));

    const classPreview: string[] = [];
    if (form.includePrePrimary) classPreview.push('Nursery', 'LKG', 'UKG');
    for (let i = 1; i <= form.numClasses; i++) classPreview.push(`Class ${i}`);
    const sectionPreview = SECTION_LETTERS.slice(0, form.sectionsPerClass);
    const step1Valid = form.schoolName && form.ownerName && form.email && form.password.length >= 8;

    const getPasswordStrength = () => {
        const len = form.password.length;
        if (len === 0) return { label: '', color: '', pct: 0 };
        if (len < 6) return { label: 'Weak', color: 'bg-rose-500', pct: 25 };
        if (len < 10) return { label: 'Fair', color: 'bg-amber-500', pct: 55 };
        return { label: 'Strong', color: 'bg-emerald-500', pct: 100 };
    };
    const strength = getPasswordStrength();

    const handleSubmit = async () => {
        setError(''); setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/register-school`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolName: form.schoolName, ownerName: form.ownerName,
                    email: form.email, password: form.password,
                    phone: form.phone || undefined, address: form.address || undefined,
                    board: form.board, includePrePrimary: form.includePrePrimary,
                    numClasses: form.numClasses, sectionsPerClass: form.sectionsPerClass,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');
            setSchoolCode(data.schoolCode);
            setSuccess(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally { setLoading(false); }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-md w-full"
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                        className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                        <Check size={36} className="text-emerald-600" />
                    </motion.div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">School Created!</h2>
                    <p className="text-gray-500 mb-8">
                        <span className="font-semibold text-gray-700">{form.schoolName}</span> is ready. Save your school code.
                    </p>
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-6">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Your School Code</p>
                        <div className="flex items-center justify-center gap-3 mb-5">
                            <span className="text-4xl font-black tracking-[0.2em] text-[var(--color-brand-600)] font-mono">{schoolCode}</span>
                            <button
                                onClick={() => { navigator.clipboard.writeText(schoolCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                className={`p-2.5 rounded-xl transition-all ${copied ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400 hover:bg-[var(--color-brand-50)] hover:text-[var(--color-brand-600)]'}`}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-3 py-2.5 bg-gray-50 rounded-xl">
                                <span className="text-xs text-gray-400">Login email</span>
                                <span className="text-xs font-semibold text-gray-700">{form.email}</span>
                            </div>
                            <div className="flex justify-between items-center px-3 py-2.5 bg-gray-50 rounded-xl">
                                <span className="text-xs text-gray-400">Status</span>
                                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active
                                </span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mb-5">Use your school code every time you log in. Keep it safe.</p>
                    <Link
                        href={`/login?schoolCode=${encodeURIComponent(schoolCode)}&username=${encodeURIComponent(form.email)}`}
                        className="inline-flex items-center gap-2 bg-[var(--color-brand-600)] text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-[var(--color-brand-700)] active:scale-95 transition-all shadow-sm"
                    >
                        Go to Login →
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex overflow-hidden">
            {/* ── Left panel ── */}
            <div
                className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col h-screen sticky top-0 relative overflow-hidden p-10 xl:p-12"
                style={{ backgroundColor: 'var(--color-brand-800)' }}
            >
                {/* Decorative */}
                <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute top-10 -left-20 w-[280px] h-[280px] rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cpath d='M40 0v40M0 0h40' stroke='white' stroke-opacity='0.04' stroke-width='1'/%3E%3C/svg%3E")`
                }} />

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-2.5 mb-10">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/15">
                        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth="2">
                            <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6l-8-4z" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div>
                        <p className="font-bold text-base leading-tight text-white">EduCare</p>
                        <p className="text-xs leading-none text-white/50">by Concilio</p>
                    </div>
                </div>

                {/* Heading */}
                <div className="relative z-10 mb-8">
                    <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 rounded-full px-3 py-1 text-xs font-semibold mb-4 border border-white/20">
                        Free setup · No credit card
                    </div>
                    <h2 className="text-2xl xl:text-3xl font-black text-white leading-tight">
                        Set up your school<br />in 3 quick steps
                    </h2>
                    <p className="text-white/60 text-sm mt-2">India&apos;s most trusted school ERP platform</p>
                </div>

                {/* Step indicators */}
                <div className="relative z-10 space-y-2 mb-10">
                    {stepMeta.map((s, i) => {
                        const num = i + 1;
                        const isActive = step === num;
                        const isDone = step > num;
                        const StepIcon = s.icon;
                        return (
                            <div key={s.label} className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${isActive ? 'bg-white/15 border border-white/20' : 'border border-transparent'}`}>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold transition-all ${isActive ? 'bg-white text-[var(--color-brand-600)]' : isDone ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                                    {isDone ? <Check size={14} /> : <StepIcon size={14} />}
                                </div>
                                <div>
                                    <p className={`text-sm font-semibold ${isActive ? 'text-white' : isDone ? 'text-emerald-300' : 'text-white/40'}`}>{s.label}</p>
                                    <p className="text-xs text-white/40">{s.desc}</p>
                                </div>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Feature highlights */}
                <div className="relative z-10 space-y-3 mt-auto">
                    {FEATURES.map(({ icon: Icon, text }) => (
                        <div key={text} className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                <Icon size={12} className="text-white/70" />
                            </div>
                            <p className="text-xs text-white/60">{text}</p>
                        </div>
                    ))}
                </div>

                <p className="relative z-10 text-white/30 text-xs mt-6">
                    © {new Date().getFullYear()} EduCare by Concilio
                </p>
            </div>

            {/* ── Right panel ── */}
            <div className="w-full lg:w-[58%] xl:w-[62%] bg-white flex flex-col min-h-screen">
                {/* Mobile header */}
                <div className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand-700)' }}>
                            <span className="text-white font-bold text-xs">E</span>
                        </div>
                        <span className="font-bold text-gray-900 text-sm">EduCare ERP</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3].map(n => (
                            <div key={n} className={`h-1.5 rounded-full transition-all ${step >= n ? 'w-6 bg-[var(--color-brand-600)]' : 'w-3 bg-gray-200'}`} />
                        ))}
                    </div>
                </div>

                {/* Form area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-xl mx-auto px-6 sm:px-10 py-10 sm:py-14">

                        {/* Step header */}
                        <div className="mb-10">
                            <p className="text-[11px] font-extrabold text-[var(--color-brand-600)] uppercase tracking-[0.18em] mb-2">Step {step} of 3</p>
                            <h3 className="text-[26px] sm:text-[28px] font-black text-gray-900 leading-snug tracking-tight">
                                {step === 1 ? 'School Information' : step === 2 ? 'Academic Structure' : 'Review & Confirm'}
                            </h3>
                            <p className="text-[13.5px] text-gray-400 mt-1.5 leading-relaxed">
                                {step === 1 ? 'Enter your school details and create your admin account.'
                                    : step === 2 ? 'Configure your classes, sections, and curriculum board.'
                                    : 'Verify everything looks correct before creating your account.'}
                            </p>
                        </div>

                        {error && (
                            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm flex items-center gap-2">
                                <span>⚠</span> {error}
                            </div>
                        )}

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -12 }}
                                transition={{ duration: 0.2 }}
                            >
                                {/* ── STEP 1 ── */}
                                {step === 1 && (
                                    <div className="space-y-6">
                                        {/* Row 1: School Name & Principal */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
                                            <FormField icon={<Building2 size={14} />} label="School Name" required value={form.schoolName} onChange={v => set('schoolName', v)} placeholder="e.g. City Public School" />
                                            <FormField icon={<User size={14} />} label="Principal / Owner Name" required value={form.ownerName} onChange={v => set('ownerName', v)} placeholder="Full name" />
                                        </div>

                                        {/* Row 2: Email & Phone */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
                                            <FormField icon={<Mail size={14} />} label="Email Address" required type="email" value={form.email} onChange={v => set('email', v)} placeholder="admin@school.com" />
                                            <FormField icon={<Phone size={14} />} label="Phone Number" value={form.phone} onChange={v => set('phone', v)} placeholder="+91 XXXXX XXXXX" />
                                        </div>

                                        {/* Row 3: Password — full width */}
                                        <div className="relative">
                                            <FormField icon={<Lock size={14} />} label="Password" required type={showPass ? 'text' : 'password'} value={form.password} onChange={v => set('password', v)} placeholder="Min 8 characters" />
                                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-[38px] text-gray-400 hover:text-gray-600 transition-colors">
                                                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                            {form.password.length > 0 && (
                                                <div className="mt-2.5 space-y-1">
                                                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: `${strength.pct}%` }} />
                                                    </div>
                                                    <p className={`text-[11px] font-semibold ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Row 4: Address — full width */}
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700">
                                                <MapPin size={13} className="text-gray-400" />
                                                School Address
                                                <span className="text-gray-300 font-normal ml-1 text-[11px]">— optional</span>
                                            </label>
                                            <textarea
                                                value={form.address}
                                                onChange={e => set('address', e.target.value)}
                                                rows={2}
                                                placeholder="Full school address..."
                                                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:border-[var(--color-brand-500)] focus:ring-2 focus:ring-[var(--color-brand-500)]/10 outline-none transition-all text-sm text-gray-900 placeholder:text-gray-400 resize-none"
                                            />
                                        </div>

                                        {/* Continue button */}
                                        <div className="pt-1">
                                            <button
                                                onClick={() => {
                                                    if (step1Valid) { setError(''); setStep(2); }
                                                    else setError('Please fill all required fields. Password must be at least 8 characters.');
                                                }}
                                                className="w-full h-12 bg-[var(--color-brand-600)] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2.5 hover:bg-[var(--color-brand-700)] active:scale-[0.98] transition-all shadow-sm shadow-[var(--color-brand-600)]/20 tracking-wide"
                                            >
                                                Continue <ArrowRight size={16} />
                                            </button>
                                        </div>

                                        <p className="text-center text-[13px] text-gray-400 pt-0.5">
                                            Already have an account?{' '}
                                            <Link href="/login" className="text-[var(--color-brand-600)] font-bold hover:underline">Sign in</Link>
                                        </p>
                                    </div>
                                )}

                                {/* ── STEP 2 ── */}
                                {step === 2 && (
                                    <div className="space-y-5">
                                        {/* Board */}
                                        <div className="space-y-3">
                                            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                                <BookOpen size={13} className="text-gray-400" />
                                                Curriculum Board
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {BOARDS.map(b => (
                                                    <button key={b} type="button" onClick={() => set('board', b)}
                                                        className={`h-9 rounded-xl text-sm font-semibold transition-all border-2 ${form.board === b ? 'bg-[var(--color-brand-600)] text-white border-[var(--color-brand-600)]' : 'bg-white text-gray-600 border-gray-200 hover:border-[var(--color-brand-600)]/40 hover:text-[var(--color-brand-600)]'}`}>
                                                        {b}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Pre-Primary */}
                                        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-[var(--color-brand-50)] rounded-xl flex items-center justify-center">
                                                    <GraduationCap size={14} className="text-[var(--color-brand-600)]" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">Include Pre-Primary</p>
                                                    <p className="text-xs text-gray-400">Adds Nursery, LKG, UKG</p>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => set('includePrePrimary', !form.includePrePrimary)}
                                                className={`relative w-10 h-5.5 rounded-full transition-all ${form.includePrePrimary ? 'bg-[var(--color-brand-600)]' : 'bg-gray-300'}`} style={{ height: '22px', width: '40px' }}>
                                                <div className={`absolute top-0.5 w-4.5 h-4 rounded-full bg-white shadow-sm transition-transform`} style={{ height: '18px', width: '18px', transform: form.includePrePrimary ? 'translateX(20px)' : 'translateX(2px)' }} />
                                            </button>
                                        </div>

                                        {/* Classes */}
                                        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-semibold text-gray-700">Number of Classes</label>
                                                <span className="text-sm font-bold text-[var(--color-brand-600)] bg-[var(--color-brand-50)] px-3 py-0.5 rounded-lg">1 — {form.numClasses}</span>
                                            </div>
                                            <input type="range" min={1} max={12} value={form.numClasses}
                                                onChange={e => set('numClasses', parseInt(e.target.value))}
                                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--color-brand-600)]" />
                                            <div className="flex justify-between text-[11px] text-gray-400">
                                                <span>1</span><span>6</span><span>12</span>
                                            </div>
                                        </div>

                                        {/* Sections */}
                                        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
                                            <label className="text-sm font-semibold text-gray-700">Sections per Class</label>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5, 6].map(n => (
                                                    <button key={n} type="button" onClick={() => set('sectionsPerClass', n)}
                                                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all border-2 ${form.sectionsPerClass === n ? 'bg-[var(--color-brand-600)] text-white border-[var(--color-brand-600)]' : 'bg-white text-gray-600 border-gray-200 hover:border-[var(--color-brand-600)]/40'}`}>
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                Sections: <span className="font-semibold text-gray-600">{SECTION_LETTERS.slice(0, form.sectionsPerClass).join(', ')}</span>
                                            </p>
                                        </div>

                                        {/* Summary */}
                                        <div className="bg-[var(--color-brand-50)] rounded-2xl px-4 py-3 flex items-center gap-3">
                                            <LayoutGrid size={14} className="text-[var(--color-brand-600)] shrink-0" />
                                            <p className="text-sm text-[var(--color-brand-600)] font-medium">
                                                <span className="font-black">{classPreview.length} classes</span> × <span className="font-black">{sectionPreview.length} sections</span> = <span className="font-black">{classPreview.length * sectionPreview.length} rooms</span>
                                            </p>
                                        </div>

                                        <div className="flex gap-3">
                                            <button onClick={() => setStep(1)} className="flex-1 h-11 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors">
                                                <ArrowLeft size={14} /> Back
                                            </button>
                                            <button onClick={() => { setError(''); setStep(3); }} className="flex-[2] h-11 bg-[var(--color-brand-600)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--color-brand-700)] flex items-center justify-center gap-2 shadow-sm shadow-[var(--color-brand-600)]/20 transition-all active:scale-[0.98]">
                                                Review <ArrowRight size={15} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* ── STEP 3 ── */}
                                {step === 3 && (
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <ReviewCard title="School Details" items={[
                                                { label: 'School Name', value: form.schoolName },
                                                { label: 'Contact Person', value: form.ownerName },
                                                { label: 'Board', value: form.board },
                                                { label: 'Email', value: form.email },
                                                ...(form.phone ? [{ label: 'Phone', value: form.phone }] : []),
                                            ]} />
                                            <ReviewCard title="Class Structure" items={[
                                                { label: 'Total Classes', value: String(classPreview.length) },
                                                { label: 'Sections/Class', value: `${sectionPreview.length} (${sectionPreview.join(', ')})` },
                                                { label: 'Pre-Primary', value: form.includePrePrimary ? 'Yes' : 'No' },
                                                { label: 'Total Rooms', value: String(classPreview.length * sectionPreview.length), highlight: true },
                                            ]} />
                                        </div>

                                        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
                                            <ShieldCheck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                By creating your account, you agree to Concilio&apos;s terms of service. Your password is encrypted with bcrypt and stored securely.
                                            </p>
                                        </div>

                                        <div className="flex gap-3">
                                            <button onClick={() => setStep(2)} className="flex-1 h-11 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors">
                                                <ArrowLeft size={14} /> Back
                                            </button>
                                            <button onClick={handleSubmit} disabled={loading}
                                                className="flex-[2] h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm text-white bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-700)]"
                                            >
                                                {loading ? (
                                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                                                ) : (
                                                    <>Create School Account <ArrowRight size={15} /></>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FormField({ icon, label, value, onChange, type = 'text', placeholder = '', required = false }: {
    icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void;
    type?: string; placeholder?: string; required?: boolean;
}) {
    return (
        <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 leading-none">
                <span className="text-gray-400 flex-shrink-0">{icon}</span>
                <span>{label}</span>
                {required && <span className="text-rose-400 text-[10px] ml-0.5 font-bold">*</span>}
            </label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
        </div>
    );
}

function ReviewCard({ title, items }: {
    title: string;
    items: { label: string; value: string; highlight?: boolean }[];
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">{title}</p>
            <div className="space-y-2.5">
                {items.map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">{item.label}</span>
                        <span className={`text-xs font-semibold truncate ml-3 max-w-[55%] text-right ${item.highlight ? 'text-[var(--color-brand-600)]' : 'text-gray-700'}`}>{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
