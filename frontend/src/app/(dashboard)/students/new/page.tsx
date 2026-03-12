'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Class, Section } from '@/lib/types';

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export default function NewAdmissionPage() {
    const router = useRouter();
    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hindiLoading, setHindiLoading] = useState(false);
    const [hindiError, setHindiError] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<{ class_name: string; class_id: number | null; reason: string } | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [form, setForm] = useState({
        name: '', name_hi: '', dob: '', gender: 'male', aadhaar: '', category: 'GEN', religion: '', blood_group: '', address: '', city: '', state: '', pincode: '',
        father_name: '', father_phone: '', father_occupation: '', father_email: '', mother_name: '', mother_phone: '', mother_occupation: '',
        guardian_name: '', guardian_phone: '', guardian_relation: '',
        current_class_id: '', current_section_id: '', sr_no: '', admission_date: new Date().toISOString().split('T')[0], previous_school: '', previous_class: '',
    });

    // Load classes on mount
    useEffect(() => {
        api.getClasses().then(setClasses).catch(() => setClasses([]));
    }, []);

    // Load sections when class changes
    useEffect(() => {
        if (form.current_class_id) {
            api.getSections(parseInt(form.current_class_id)).then(setSections).catch(() => setSections([]));
        } else {
            setSections([]);
        }
    }, [form.current_class_id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        // Reset section when class changes
        if (name === 'current_class_id') {
            setForm(prev => ({ ...prev, [name]: value, current_section_id: '' }));
        }
    };

    // Auto-generate Hindi name when English name changes (debounced 800ms)
    const generateHindiName = useCallback(async (name: string) => {
        if (!name || name.trim().length < 2) return;
        setHindiLoading(true);
        setHindiError(false);
        try {
            const result = await api.getHindiName(name.trim());
            if (result.hindi_name) {
                setForm(prev => ({ ...prev, name_hi: result.hindi_name }));
            } else {
                setHindiError(true);
            }
        } catch {
            setHindiError(true);
        } finally {
            setHindiLoading(false);
        }
    }, []);

    // Debounced auto-trigger: generate Hindi name 800ms after user stops typing
    useEffect(() => {
        if (form.name.trim().length < 2) return;
        const timer = setTimeout(() => generateHindiName(form.name), 800);
        return () => clearTimeout(timer);
    }, [form.name, generateHindiName]);

    // AI class suggestion when name + DOB are available
    const getClassSuggestion = useCallback(async () => {
        if (!form.name || !form.dob) return;
        setAiLoading(true);
        try {
            const result = await api.suggestClass({
                name: form.name,
                dob: form.dob,
                previous_school: form.previous_school || undefined,
                previous_class: form.previous_class || undefined,
            });
            setAiSuggestion({
                class_name: result.suggested_class,
                class_id: result.suggested_class_id,
                reason: result.reason,
            });
        } catch { /* AI unavailable */ }
        finally { setAiLoading(false); }
    }, [form.name, form.dob, form.previous_school, form.previous_class]);

    const applySuggestion = () => {
        if (aiSuggestion?.class_id) {
            setForm(prev => ({ ...prev, current_class_id: aiSuggestion.class_id!.toString(), current_section_id: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { current_class_id, current_section_id, previous_class: _previous_class, ...rest } = form;
            await api.createStudent({ ...rest, current_class_id: parseInt(current_class_id), current_section_id: parseInt(current_section_id) } as Parameters<typeof api.createStudent>[0]);
            router.push('/students');
        } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to save'); }
        finally { setLoading(false); }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">New Admission</h1>
                <p className="text-gray-500 text-sm mt-1">Fill student details for new admission</p>
            </div>
            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* ── Personal Information ── */}
                <Section title="👤 Personal Information">
                    <div>
                        <Field label="Full Name (English) *" name="name" value={form.name} onChange={handleChange} required />
                        {hindiLoading && (
                            <p className="mt-1 text-xs text-[#6c5ce7] font-medium animate-pulse">✨ Generating Hindi name...</p>
                        )}
                        {hindiError && !hindiLoading && form.name.length >= 2 && (
                            <button type="button" onClick={() => generateHindiName(form.name)}
                                className="mt-1 text-xs text-amber-600 hover:text-amber-800 font-medium">
                                ⚠️ AI unavailable — click to retry or type Hindi name manually
                            </button>
                        )}
                    </div>
                    <div>
                        <Field label="Name (Hindi / हिन्दी)" name="name_hi" value={form.name_hi} onChange={handleChange} />
                        <p className="text-[10px] text-gray-400 mt-0.5">Auto-generated by AI — you can edit this</p>
                    </div>
                    <Field label="Date of Birth *" name="dob" type="date" value={form.dob} onChange={handleChange} required />
                    <Sel label="Gender *" name="gender" value={form.gender} onChange={handleChange} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
                    <Field label="Aadhaar" name="aadhaar" value={form.aadhaar} onChange={handleChange} maxLength={12} />
                    <Sel label="Category" name="category" value={form.category} onChange={handleChange} options={[{ value: 'GEN', label: 'General' }, { value: 'OBC', label: 'OBC' }, { value: 'SC', label: 'SC' }, { value: 'ST', label: 'ST' }, { value: 'EWS', label: 'EWS' }]} />
                    <Field label="Religion" name="religion" value={form.religion} onChange={handleChange} />
                    <Sel label="Blood Group" name="blood_group" value={form.blood_group} onChange={handleChange} options={[{ value: '', label: 'Select' }, ...['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => ({ value: v, label: v }))]} />
                </Section>

                {/* ── Address ── */}
                <Section title="🏠 Address">
                    <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Address</label>
                        <textarea name="address" value={form.address} onChange={handleChange} rows={2} className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 focus:ring-2 focus:ring-[#6c5ce7] focus:border-transparent" />
                    </div>
                    <Field label="City" name="city" value={form.city} onChange={handleChange} />
                    <Sel label="State" name="state" value={form.state} onChange={handleChange}
                        options={[{ value: '', label: 'Select State' }, ...INDIAN_STATES.map(s => ({ value: s, label: s }))]} />
                    <Field label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} maxLength={6} />
                </Section>

                {/* ── Parent Details ── */}
                <Section title="👨‍👩‍👧 Parent Details">
                    <Field label="Father's Name *" name="father_name" value={form.father_name} onChange={handleChange} required />
                    <Field label="Father's Phone" name="father_phone" value={form.father_phone} onChange={handleChange} />
                    <Field label="Father's Occupation" name="father_occupation" value={form.father_occupation} onChange={handleChange} />
                    <Field label="Father's Email" name="father_email" type="email" value={form.father_email} onChange={handleChange} />
                    <Field label="Mother's Name" name="mother_name" value={form.mother_name} onChange={handleChange} />
                    <Field label="Mother's Phone" name="mother_phone" value={form.mother_phone} onChange={handleChange} />
                    <Field label="Mother's Occupation" name="mother_occupation" value={form.mother_occupation} onChange={handleChange} />
                    <Field label="Guardian Name" name="guardian_name" value={form.guardian_name} onChange={handleChange} />
                    <Field label="Guardian Phone" name="guardian_phone" value={form.guardian_phone} onChange={handleChange} />
                    <Field label="Guardian Relation" name="guardian_relation" value={form.guardian_relation} onChange={handleChange} />
                </Section>

                {/* ── Academic Details ── */}
                <Section title="📚 Academic Details">
                    <Field label="Previous School" name="previous_school" value={form.previous_school} onChange={handleChange} />
                    <Field label="Previous Class" name="previous_class" value={form.previous_class} onChange={handleChange} />

                    {/* AI Class Suggestion */}
                    <div className="col-span-2">
                        {form.name && form.dob && (
                            <div className="mb-3 p-3 bg-[#f1f0ff] border border-[#6c5ce7]/20 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#6c5ce7] text-sm font-semibold">🤖 AI Class Suggestion</span>
                                    </div>
                                    <button type="button" onClick={getClassSuggestion} disabled={aiLoading}
                                        className="px-3 py-1 text-xs font-semibold bg-[#6c5ce7] text-white rounded-lg hover:bg-[#6c5ce7] disabled:opacity-50 transition-colors">
                                        {aiLoading ? 'Analyzing...' : 'Get AI Suggestion'}
                                    </button>
                                </div>
                                {aiSuggestion && (
                                    <div className="mt-2 text-sm">
                                        <p className="text-gray-700">
                                            Suggested: <span className="font-bold text-[#6c5ce7]">{aiSuggestion.class_name}</span>
                                        </p>
                                        <p className="text-gray-500 text-xs mt-0.5">{aiSuggestion.reason}</p>
                                        {aiSuggestion.class_id && (
                                            <button type="button" onClick={applySuggestion}
                                                className="mt-1.5 text-xs font-semibold text-[#6c5ce7] hover:text-[#4a3ab5] underline">
                                                ✅ Apply this suggestion
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <Sel label="Class *" name="current_class_id" value={form.current_class_id} onChange={handleChange}
                        options={[{ value: '', label: 'Select Class' }, ...classes.map((c) => ({ value: c.id.toString(), label: String(c.name || '').toLowerCase().startsWith('class') ? c.name : `Class ${c.name}` }))]} />
                    <Sel label="Section *" name="current_section_id" value={form.current_section_id} onChange={handleChange}
                        options={[{ value: '', label: form.current_class_id ? 'Select Section' : 'Select class first' }, ...sections.map((s) => ({ value: s.id.toString(), label: s.name }))]} />
                    <div>
                        <Field label="SR No. (Serial Register)" name="sr_no" value={form.sr_no} onChange={handleChange} />
                        <p className="text-[10px] text-gray-400 mt-0.5">Optional — school&apos;s internal register number. Roll number is auto-generated.</p>
                    </div>
                    <Field label="Admission Date" name="admission_date" type="date" value={form.admission_date} onChange={handleChange} />
                </Section>

                <div className="flex gap-3">
                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-[#6c5ce7] text-white rounded-xl text-sm font-semibold hover:bg-[#6c5ce7] disabled:opacity-50 transition-all shadow-md shadow-[#6c5ce7]/20">
                        {loading ? 'Saving...' : '💾 Save Admission'}
                    </button>
                    <button type="button" onClick={() => router.back()} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
        </div>
    );
}

function Field({ label, name, value, onChange, type = 'text', required = false, maxLength }: {
    label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string; required?: boolean; maxLength?: number;
}) {
    return (
        <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
            <input type={type} name={name} value={value} onChange={onChange} required={required} maxLength={maxLength}
                className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 focus:ring-2 focus:ring-[#6c5ce7] focus:border-transparent transition-all" />
        </div>
    );
}

function Sel({ label, name, value, onChange, options }: {
    label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{label}</label>
            <select name={name} value={value} onChange={onChange}
                className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 focus:ring-2 focus:ring-[#6c5ce7] focus:border-transparent transition-all bg-white">
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}
