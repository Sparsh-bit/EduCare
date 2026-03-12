'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '@/lib/runtimeConfig';

const BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'IGCSE', 'Others'];
const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface FormData {
    schoolName: string; ownerName: string; email: string; password: string;
    phone: string; address: string; board: string;
    includePrePrimary: boolean; numClasses: number; sectionsPerClass: number;
}

export default function SignUpPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormData>({
        schoolName: '', ownerName: '', email: '', password: '', phone: '', address: '',
        board: 'CBSE', includePrePrimary: false, numClasses: 10, sectionsPerClass: 2,
    });
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [schoolCode, setSchoolCode] = useState('');
    const [copied, setCopied] = useState(false);

    const set = (key: keyof FormData, value: string | number | boolean) =>
        setForm(f => ({ ...f, [key]: value }));

    const classPreview: string[] = [];
    if (form.includePrePrimary) classPreview.push('Nursery', 'LKG', 'UKG');
    for (let i = 1; i <= form.numClasses; i++) classPreview.push(`Class ${i}`);
    const sectionPreview = SECTION_LETTERS.slice(0, form.sectionsPerClass);

    const step1Valid = form.schoolName && form.ownerName && form.email && form.password.length >= 8;

    const handleSubmit = async () => {
        setError('');
        setLoading(true);
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
            setSuccess('registered');
            setTimeout(() => router.push(`/login?schoolCode=${encodeURIComponent(data.schoolCode)}&username=${encodeURIComponent(form.email)}&created=1`), 15000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-[#f8f9fb]">
            <div className="w-full flex flex-col min-h-screen">
                {/* Top bar */}
                <div className="px-4 sm:px-8 py-6 flex items-center justify-between max-w-2xl mx-auto w-full">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#6c5ce7] rounded-lg flex items-center justify-center">
                            <span className="text-[#f8f9fb] font-bold text-sm">C</span>
                        </div>
                        <span className="text-[#6c5ce7] font-semibold text-lg tracking-tight">Concilio</span>
                    </Link>
                    {/* Step indicator */}
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map(s => (
                            <div key={s} className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${step >= s ? 'bg-[#6c5ce7] text-[#f8f9fb]' : 'bg-[#6c5ce7]/10 text-[#6c5ce7]/40'}`}>{s}</div>
                                {s < 3 && <div className={`w-8 h-px ${step > s ? 'bg-[#6c5ce7]' : 'bg-[#6c5ce7]/15'}`} />}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex items-start justify-center px-4 sm:px-8 pb-12 pt-4">
                    <div className="w-full max-w-xl">

                        {success ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">🎉</div>
                                <h2 className="text-2xl font-light text-[#6c5ce7] mb-3" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                                    You&apos;re all set!
                                </h2>
                                <p className="text-sm text-[#6c5ce7]/60 leading-relaxed mb-6">
                                    Your school <strong>{form.schoolName}</strong> has been registered successfully.
                                    A welcome email with your credentials has been sent to <strong>{form.email}</strong>.
                                </p>

                                {/* School Code Card */}
                                <div className="bg-white/90 border border-[#6c5ce7]/15 rounded-2xl p-6 mx-auto max-w-sm shadow-sm">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6c5ce7]/40 mb-3">Your School Code</p>
                                    <div className="flex items-center justify-center gap-3 mb-4">
                                        <span className="text-3xl font-bold tracking-[6px] text-[#6c5ce7] font-mono">{schoolCode}</span>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(schoolCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                                            className="p-2 rounded-lg hover:bg-[#6c5ce7]/5 transition-colors text-[#6c5ce7]/50 hover:text-[#6c5ce7]" title="Copy">
                                            {copied ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><polyline points="20 6 9 17 4 12"/></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                            )}
                                        </button>
                                    </div>
                                    <div className="space-y-2 text-left text-sm">
                                        <div className="flex justify-between px-2 py-1.5 bg-[#f8f9fb]/60 rounded-lg">
                                            <span className="text-[#6c5ce7]/50">Username</span>
                                            <span className="text-[#6c5ce7] font-medium">{form.email}</span>
                                        </div>
                                        <div className="flex justify-between px-2 py-1.5 bg-[#f8f9fb]/60 rounded-lg">
                                            <span className="text-[#6c5ce7]/50">Password</span>
                                            <span className="text-[#6c5ce7] font-medium">{'•'.repeat(form.password.length)}</span>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-[#6c5ce7]/40 mt-3">Save this code — you&apos;ll need it every time you sign in.</p>
                                </div>

                                <button
                                    onClick={() => router.push(`/login?schoolCode=${encodeURIComponent(schoolCode)}&username=${encodeURIComponent(form.email)}&created=1`)}
                                    className="mt-6 px-8 py-3 rounded-xl text-sm font-medium text-[#f8f9fb] bg-[#6c5ce7] hover:bg-[#5b4bd5] transition-colors">
                                    Go to Sign In →
                                </button>
                                <p className="text-xs text-[#6c5ce7]/30 mt-3">Auto-redirecting in 15 seconds…</p>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="mb-5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>
                                )}

                                {/* ── STEP 1: School Information ── */}
                                {step === 1 && (
                                    <>
                                        <h1 className="text-3xl font-light text-[#6c5ce7] mb-1" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                                            School Information
                                        </h1>
                                        <p className="text-sm text-[#6c5ce7]/50 mb-7">Basic details for your school account</p>

                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <Field label="School Name *" value={form.schoolName} onChange={v => set('schoolName', v)} placeholder="Delhi Public School" />
                                                <Field label="Owner / Principal Name *" value={form.ownerName} onChange={v => set('ownerName', v)} placeholder="Dr. Ramesh Sharma" />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <Field label="Admin Email *" type="email" value={form.email} onChange={v => set('email', v)} placeholder="principal@school.com" />
                                                <Field label="Phone" type="tel" value={form.phone} onChange={v => set('phone', v)} placeholder="+91 98765 43210" />
                                            </div>
                                            <div className="relative">
                                                <Field label="Admin Password * (min 8 chars)" type={showPass ? 'text' : 'password'} value={form.password} onChange={v => set('password', v)} placeholder="••••••••" />
                                                <button type="button" onClick={() => setShowPass(s => !s)}
                                                    className="absolute right-3 bottom-3 text-[#6c5ce7]/30 hover:text-[#6c5ce7]/60 text-xs font-medium transition-colors">
                                                    {showPass ? 'Hide' : 'Show'}
                                                </button>
                                                {form.password && (
                                                    <div className="flex gap-1 mt-1.5 items-center">
                                                        {[8, 12, 16].map((len, i) => (
                                                            <div key={i} className={`h-1 flex-1 rounded-full ${form.password.length >= len ? i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-emerald-400' : 'bg-emerald-600' : 'bg-gray-200'}`} />
                                                        ))}
                                                        <span className="text-[10px] text-[#6c5ce7]/40 ml-1">{form.password.length < 8 ? 'Too short' : form.password.length < 12 ? 'Fair' : 'Strong'}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs text-[#6c5ce7]/60 mb-1 ml-1">School Address</label>
                                                <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2}
                                                    placeholder="Full address of the school"
                                                    className="w-full px-4 py-3 rounded-xl text-sm bg-white/80 border border-[#6c5ce7]/12 text-[#6c5ce7] placeholder-[#6c5ce7]/30 focus:border-[#6c5ce7]/40 focus:ring-0 transition-colors resize-none"
                                                    style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'rgba(108,92,231,0.12)' }} />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (step1Valid) { setError(''); setStep(2); }
                                                    else setError('Please fill all required fields and ensure password is ≥ 8 characters.');
                                                }}
                                                className="w-full py-3 rounded-xl text-sm font-medium text-[#f8f9fb] bg-[#6c5ce7] hover:bg-[#5b4bd5] transition-colors tracking-wide mt-2">
                                                Continue →
                                            </button>
                                        </div>
                                    </>
                                )}

                                {/* ── STEP 2: Academic Structure ── */}
                                {step === 2 && (
                                    <>
                                        <h1 className="text-3xl font-light text-[#6c5ce7] mb-1" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                                            Academic Structure
                                        </h1>
                                        <p className="text-sm text-[#6c5ce7]/50 mb-7">
                                            Classes and sections will be auto-created based on these settings.
                                        </p>

                                        <div className="space-y-6">
                                            {/* Board */}
                                            <div>
                                                <label className="block text-xs text-[#6c5ce7]/60 mb-2 ml-1">Curriculum Board</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {BOARDS.map(b => (
                                                        <button key={b} type="button" onClick={() => set('board', b)}
                                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${form.board === b ? 'bg-[#6c5ce7] text-[#f8f9fb] border-[#6c5ce7]' : 'bg-white/80 text-[#6c5ce7]/70 border-[#6c5ce7]/12 hover:border-[#6c5ce7]/30'}`}>
                                                            {b}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Pre-primary toggle */}
                                            <div className="flex items-center justify-between bg-white/80 rounded-xl px-4 py-3.5 border border-[#6c5ce7]/12">
                                                <div>
                                                    <p className="text-sm text-[#6c5ce7] font-medium">Include Pre-Primary Classes</p>
                                                    <p className="text-xs text-[#6c5ce7]/40 mt-0.5">Adds Nursery, LKG and UKG</p>
                                                </div>
                                                <button type="button" onClick={() => set('includePrePrimary', !form.includePrePrimary)}
                                                    className={`relative w-11 h-6 rounded-full transition-colors ${form.includePrePrimary ? 'bg-[#6c5ce7]' : 'bg-gray-200'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.includePrePrimary ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </div>

                                            {/* Number of classes slider */}
                                            <div>
                                                <label className="block text-xs text-[#6c5ce7]/60 mb-2 ml-1">Number of Standard Classes</label>
                                                <div className="flex items-center gap-4">
                                                    <input type="range" min={1} max={12} value={form.numClasses}
                                                        onChange={e => set('numClasses', parseInt(e.target.value))}
                                                        className="flex-1 accent-[#6c5ce7]" />
                                                    <span className="w-14 text-center text-xl font-bold text-[#6c5ce7]">{form.numClasses}</span>
                                                </div>
                                                <p className="text-xs text-[#6c5ce7]/40 ml-1 mt-1">
                                                    {form.includePrePrimary ? 'Nursery, LKG, UKG + ' : ''}Class 1 to {String(form.numClasses || '').toLowerCase().startsWith('class') ? form.numClasses : 'Class ' + form.numClasses}
                                                </p>
                                            </div>

                                            {/* Sections per class */}
                                            <div>
                                                <label className="block text-xs text-[#6c5ce7]/60 mb-2 ml-1">Sections per Class</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {[1, 2, 3, 4, 5, 6].map(n => (
                                                        <button key={n} type="button" onClick={() => set('sectionsPerClass', n)}
                                                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${form.sectionsPerClass === n ? 'bg-[#6c5ce7] text-[#f8f9fb] border-[#6c5ce7]' : 'bg-white/80 text-[#6c5ce7]/70 border-[#6c5ce7]/12 hover:border-[#6c5ce7]/30'}`}>
                                                            {SECTION_LETTERS.slice(0, n).join(', ')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl text-sm font-medium text-[#6c5ce7]/60 bg-white/80 border border-[#6c5ce7]/12 hover:bg-white transition-colors">
                                                    ← Back
                                                </button>
                                                <button onClick={() => { setError(''); setStep(3); }} className="flex-1 py-3 rounded-xl text-sm font-medium text-[#f8f9fb] bg-[#6c5ce7] hover:bg-[#5b4bd5] transition-colors">
                                                    Review & Register →
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── STEP 3: Review ── */}
                                {step === 3 && (
                                    <>
                                        <h1 className="text-3xl font-light text-[#6c5ce7] mb-1" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
                                            Review & Confirm
                                        </h1>
                                        <p className="text-sm text-[#6c5ce7]/50 mb-7">Confirm your details before we set up your ERP.</p>

                                        <div className="space-y-4">
                                            <div className="bg-white/80 rounded-2xl border border-[#6c5ce7]/10 p-5 space-y-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6c5ce7]/40">School Details</p>
                                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                                    <ReviewRow label="School Name" value={form.schoolName} />
                                                    <ReviewRow label="Owner" value={form.ownerName} />
                                                    <ReviewRow label="Email" value={form.email} />
                                                    <ReviewRow label="Phone" value={form.phone || '—'} />
                                                    <ReviewRow label="Board" value={form.board} />
                                                    {form.address && <><span className="text-[#6c5ce7]/50 col-span-2">Address: <span className="text-[#6c5ce7] font-medium">{form.address}</span></span></>}
                                                </div>
                                            </div>

                                            <div className="bg-white/80 rounded-2xl border border-[#6c5ce7]/10 p-5 space-y-3">
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6c5ce7]/40">Academic Structure</p>
                                                <div className="text-sm space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-[#6c5ce7]/50">Total Classes</span>
                                                        <span className="text-[#6c5ce7] font-medium">{classPreview.length}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {classPreview.map(c => (
                                                            <span key={c} className="px-2 py-0.5 bg-[#6c5ce7]/6 text-[#6c5ce7] text-xs rounded-lg">{c}</span>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-between pt-1">
                                                        <span className="text-[#6c5ce7]/50">Sections</span>
                                                        <span className="text-[#6c5ce7] font-medium">{sectionPreview.join(', ')} ({sectionPreview.length} per class)</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-[#6c5ce7]/50">Total Sections</span>
                                                        <span className="text-[#6c5ce7] font-semibold">{classPreview.length * sectionPreview.length}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="text-xs text-[#6c5ce7]/40 text-center px-4 leading-relaxed">
                                                A welcome email with your School Code will be sent to <strong>{form.email}</strong>.<br />
                                                You can configure fee structures, add subjects, and manage staff after signing in.
                                            </p>

                                            <div className="flex gap-3">
                                                <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl text-sm font-medium text-[#6c5ce7]/60 bg-white/80 border border-[#6c5ce7]/12 hover:bg-white transition-colors">
                                                    ← Edit
                                                </button>
                                                <button onClick={handleSubmit} disabled={loading}
                                                    className="flex-1 py-3 rounded-xl text-sm font-medium text-[#f8f9fb] bg-[#6c5ce7] hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors">
                                                    {loading ? 'Setting up your ERP…' : '🚀 Create My ERP'}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <p className="text-xs text-[#6c5ce7]/50 text-center mt-8">
                                    Already have an account?{' '}
                                    <Link href="/login" className="text-[#6c5ce7] hover:underline font-medium">Sign in</Link>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }: {
    label: string; value: string; onChange: (v: string) => void;
    type?: string; placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-xs text-[#6c5ce7]/60 mb-1 ml-1">{label}</label>
            <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl text-sm bg-white/80 border border-[#6c5ce7]/12 text-[#6c5ce7] placeholder-[#6c5ce7]/30 focus:border-[#6c5ce7]/40 focus:ring-0 transition-colors"
                style={{ background: 'rgba(255,255,255,0.8)', borderColor: 'rgba(108,92,231,0.12)' }} />
        </div>
    );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <>
            <span className="text-[#6c5ce7]/50">{label}</span>
            <span className="text-[#6c5ce7] font-medium text-right">{value}</span>
        </>
    );
}
