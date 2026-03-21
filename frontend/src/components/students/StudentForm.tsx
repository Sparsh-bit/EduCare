'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, FileText, CheckCircle, X, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import type { Student, Class, Section } from '@/lib/types';
import { Button, Input, Select, Textarea, Badge } from '@/components/ui';

// ─── Constants ──────────────────────────────────────────────
export const INDIAN_STATES = [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam',
    'Bihar', 'Chandigarh', 'Chhattisgarh',
    'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat',
    'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka',
    'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const TABS = ['Personal', 'Contact', 'Parents', 'Academic', 'Medical', 'Documents'] as const;
type Tab = typeof TABS[number];

const DOCUMENT_TYPES = [
    'Birth Certificate', 'Aadhaar Card (Student)', 'Aadhaar Card (Father)',
    'Aadhaar Card (Mother)', 'Previous School TC', 'Previous Marksheet',
    'Caste Certificate', 'Income Certificate', 'Passport Photos',
    'Medical Fitness Certificate', 'Migration Certificate', 'RTE Certificate',
    'Disability Certificate', 'Address Proof',
];

// ─── Form Data ──────────────────────────────────────────────
export interface StudentFormData {
    // Personal
    first_name: string; last_name: string;
    dob: string; gender: string; blood_group: string;
    religion: string; category: string; sub_caste: string;
    nationality: string; mother_tongue: string;
    aadhaar: string; apaar_id: string;
    photo?: File | null; photo_url?: string;
    // Contact
    phone: string; phone2: string; email: string;
    current_street: string; current_locality: string;
    current_city: string; current_state: string; current_pincode: string;
    same_address: boolean;
    perm_street: string; perm_locality: string;
    perm_city: string; perm_state: string; perm_pincode: string;
    // Parents
    father_name: string; father_phone: string; father_email: string;
    father_occupation: string; father_qualification: string;
    father_aadhaar: string; father_income: string;
    mother_name: string; mother_phone: string; mother_email: string;
    mother_occupation: string; mother_qualification: string;
    mother_aadhaar: string; mother_income: string;
    guardian_name: string; guardian_relation: string;
    guardian_phone: string; guardian_email: string; guardian_address: string;
    primary_contact: 'father' | 'mother' | 'guardian';
    // Academic
    admission_no: string; admission_date: string;
    admission_type: string; class_id: string; section_id: string;
    roll_number: string; stream: string; house: string; fee_group: string;
    prev_school: string; prev_board: string; prev_class: string; prev_tc: string;
    // Medical
    allergies: string; conditions: string;
    disability: string; disability_cert_no: string;
    emergency_name: string; emergency_phone: string;
    emergency_relation: string; preferred_hospital: string;
    // Documents
    documents: Record<string, File | null>;
}

export function studentToFormData(s: Student): Partial<StudentFormData> {
    const parts = s.name.split(' ');
    const first_name = parts[0] ?? '';
    const last_name = parts.slice(1).join(' ');
    return {
        first_name, last_name,
        dob: s.dob ?? '', gender: s.gender ?? '', blood_group: s.blood_group ?? '',
        religion: s.religion ?? '', category: s.category ?? '', nationality: s.nationality ?? 'Indian',
        aadhaar: s.aadhaar ?? '', phone: s.phone ?? '', email: s.email ?? '',
        current_street: s.address ?? '', current_city: s.city ?? '',
        current_state: s.state ?? '', current_pincode: s.pincode ?? '',
        same_address: true,
        father_name: s.father_name ?? '', father_phone: s.father_phone ?? '',
        father_email: s.father_email ?? '', father_occupation: s.father_occupation ?? '',
        mother_name: s.mother_name ?? '', mother_phone: s.mother_phone ?? '',
        mother_occupation: s.mother_occupation ?? '',
        guardian_name: s.guardian_name ?? '', guardian_phone: s.guardian_phone ?? '',
        guardian_relation: s.guardian_relation ?? '',
        primary_contact: 'father',
        admission_no: s.admission_no ?? '',
        class_id: String(s.class_id ?? ''), section_id: String(s.section_id ?? ''),
        current_roll_no: s.current_roll_no ?? '',
        prev_school: s.previous_school ?? '',
        photo_url: undefined,
        documents: {},
    } as Partial<StudentFormData>;
}

function emptyForm(): StudentFormData {
    return {
        first_name: '', last_name: '', dob: '', gender: '', blood_group: '',
        religion: '', category: '', sub_caste: '', nationality: 'Indian',
        mother_tongue: '', aadhaar: '', apaar_id: '',
        phone: '', phone2: '', email: '',
        current_street: '', current_locality: '', current_city: '',
        current_state: '', current_pincode: '',
        same_address: true,
        perm_street: '', perm_locality: '', perm_city: '', perm_state: '', perm_pincode: '',
        father_name: '', father_phone: '', father_email: '',
        father_occupation: '', father_qualification: '', father_aadhaar: '', father_income: '',
        mother_name: '', mother_phone: '', mother_email: '',
        mother_occupation: '', mother_qualification: '', mother_aadhaar: '', mother_income: '',
        guardian_name: '', guardian_relation: '', guardian_phone: '', guardian_email: '', guardian_address: '',
        primary_contact: 'father',
        admission_no: '', admission_date: '', admission_type: '', class_id: '', section_id: '',
        roll_number: '', stream: '', house: '', fee_group: '',
        prev_school: '', prev_board: '', prev_class: '', prev_tc: '',
        allergies: '', conditions: '', disability: 'None', disability_cert_no: '',
        emergency_name: '', emergency_phone: '', emergency_relation: '', preferred_hospital: '',
        documents: {},
    };
}

// ─── Props ──────────────────────────────────────────────────
interface StudentFormProps {
    mode: 'create' | 'edit';
    initialData?: Student;
    onSubmit: (data: StudentFormData) => Promise<void>;
    loading: boolean;
}

// ─── Main Component ──────────────────────────────────────────
export function StudentForm({ mode, initialData, onSubmit, loading }: StudentFormProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('Personal');
    const [form, setForm] = useState<StudentFormData>(() => {
        const base = emptyForm();
        if (initialData) return { ...base, ...studentToFormData(initialData) } as StudentFormData;
        return base;
    });
    const [errors, setErrors] = useState<Partial<Record<keyof StudentFormData, string>>>({});
    const [photoPreview, setPhotoPreview] = useState<string | null>(initialData ? null : null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Classes / sections
    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [loadingSections, setLoadingSections] = useState(false);

    useEffect(() => { api.getClasses().then(setClasses).catch(() => {}); }, []);
    useEffect(() => {
        if (!form.class_id) { setSections([]); return; }
        setLoadingSections(true);
        api.getSections(Number(form.class_id))
            .then(setSections)
            .catch(() => {})
            .finally(() => setLoadingSections(false));
    }, [form.class_id]);

    const set = (field: keyof StudentFormData, value: unknown) =>
        setForm(f => ({ ...f, [field]: value }));

    const setErr = (field: keyof StudentFormData, msg: string) =>
        setErrors(e => ({ ...e, [field]: msg }));
    const clearErr = (field: keyof StudentFormData) =>
        setErrors(e => { const n = { ...e }; delete n[field]; return n; });

    // ── Photo ──
    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { alert('Photo must be under 2MB'); return; }
        set('photo', file);
        const reader = new FileReader();
        reader.onload = ev => setPhotoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    // ── Age calculation ──
    const nowMs = new Date().getTime();
    const age = form.dob ? Math.floor((nowMs - new Date(form.dob).getTime()) / (365.25 * 86400000)) : null;

    // ── Validate ──
    const validate = (): boolean => {
        const errs: Partial<Record<keyof StudentFormData, string>> = {};
        if (!form.first_name.trim()) errs.first_name = 'Required';
        if (!form.last_name.trim()) errs.last_name = 'Required';
        if (!form.dob) errs.dob = 'Required';
        else {
            const a = Math.floor((Date.now() - new Date(form.dob).getTime()) / (365.25 * 86400000));
            if (a < 3 || a > 25) errs.dob = 'Age must be between 3 and 25 years';
        }
        if (!form.gender) errs.gender = 'Required';
        if (!form.category) errs.category = 'Required';
        if (!form.nationality.trim()) errs.nationality = 'Required';
        if (form.aadhaar && !/^\d{12}$/.test(form.aadhaar.replace(/\s/g, ''))) errs.aadhaar = '12 digits required';
        if (!form.phone.trim()) errs.phone = 'Required';
        else if (!/^[6-9]\d{9}$/.test(form.phone)) errs.phone = 'Enter valid 10-digit mobile';
        if (form.phone2 && !/^[6-9]\d{9}$/.test(form.phone2)) errs.phone2 = 'Enter valid 10-digit mobile';
        if (!form.current_street.trim()) errs.current_street = 'Required';
        if (!form.current_city.trim()) errs.current_city = 'Required';
        if (!form.current_state) errs.current_state = 'Required';
        if (!form.current_pincode.trim()) errs.current_pincode = 'Required';
        else if (!/^\d{6}$/.test(form.current_pincode)) errs.current_pincode = '6 digits required';
        if (!form.father_name.trim()) errs.father_name = 'Required';
        if (!form.father_phone.trim()) errs.father_phone = 'Required';
        else if (!/^[6-9]\d{9}$/.test(form.father_phone)) errs.father_phone = 'Enter valid 10-digit mobile';
        if (mode === 'create' && !form.class_id) errs.class_id = 'Required';
        if (mode === 'create' && !form.section_id) errs.section_id = 'Required';
        if (!form.admission_date) errs.admission_date = 'Required';
        if (!form.admission_type) errs.admission_type = 'Required';
        if (!form.fee_group) errs.fee_group = 'Required';
        if (!form.emergency_name.trim()) errs.emergency_name = 'Required';
        if (!form.emergency_phone.trim()) errs.emergency_phone = 'Required';
        else if (!/^[6-9]\d{9}$/.test(form.emergency_phone)) errs.emergency_phone = 'Enter valid 10-digit mobile';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            // Jump to first tab with error
            const tabFields: Record<Tab, (keyof StudentFormData)[]> = {
                Personal: ['first_name', 'last_name', 'dob', 'gender', 'category', 'nationality', 'aadhaar'],
                Contact: ['phone', 'phone2', 'current_street', 'current_city', 'current_state', 'current_pincode'],
                Parents: ['father_name', 'father_phone'],
                Academic: ['class_id', 'section_id', 'admission_date', 'admission_type', 'fee_group'],
                Medical: ['emergency_name', 'emergency_phone'],
                Documents: [],
            };
            for (const tab of TABS) {
                if (tabFields[tab].some(f => errors[f])) { setActiveTab(tab); break; }
            }
            return;
        }
        await onSubmit(form);
    };

    const stateOptions = [{ value: '', label: 'Select State' }, ...INDIAN_STATES.map(s => ({ value: s, label: s }))];
    const classOptions = [{ value: '', label: 'Select Class' }, ...classes.map(c => ({ value: String(c.id), label: c.name }))];
    const sectionOptions = [{ value: '', label: 'Select Section' }, ...sections.map(s => ({ value: String(s.id), label: s.name }))];

    const numClass = classes.find(c => String(c.id) === form.class_id)?.numeric_level ?? 0;
    const showStream = numClass >= 11;

    return (
        <form onSubmit={handleSubmit} className="flex flex-col min-h-screen">
            {/* ── Tab Bar ── */}
            <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-6">
                <div className="flex gap-1 overflow-x-auto">
                    {TABS.map(tab => {
                        const tabFields: Record<Tab, (keyof StudentFormData)[]> = {
                            Personal: ['first_name', 'last_name', 'dob', 'gender', 'category', 'nationality', 'aadhaar'],
                            Contact: ['phone', 'phone2', 'current_street', 'current_city', 'current_state', 'current_pincode'],
                            Parents: ['father_name', 'father_phone'],
                            Academic: ['class_id', 'section_id', 'admission_date', 'admission_type', 'fee_group'],
                            Medical: ['emergency_name', 'emergency_phone'],
                            Documents: [],
                        };
                        const hasError = tabFields[tab].some(f => errors[f]);
                        return (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                                    activeTab === tab
                                        ? 'border-brand-600 text-brand-700'
                                        : 'border-transparent text-neutral-500 hover:text-neutral-700'
                                }`}
                                style={activeTab === tab ? { borderBottomColor: 'var(--color-brand-600)' } : {}}
                            >
                                {tab}
                                {hasError && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Tab Content (CSS hidden to preserve state) ── */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

                    {/* Personal */}
                    <div style={{ display: activeTab === 'Personal' ? undefined : 'none' }}>
                        <PersonalTab
                            form={form} set={set} errors={errors}
                            clearErr={clearErr} setErr={setErr}
                            age={age} photoPreview={photoPreview}
                            photoInputRef={photoInputRef}
                            onPhotoSelect={handlePhotoSelect}
                        />
                    </div>

                    {/* Contact */}
                    <div style={{ display: activeTab === 'Contact' ? undefined : 'none' }}>
                        <ContactTab form={form} set={set} errors={errors} clearErr={clearErr} stateOptions={stateOptions} />
                    </div>

                    {/* Parents */}
                    <div style={{ display: activeTab === 'Parents' ? undefined : 'none' }}>
                        <ParentsTab form={form} set={set} errors={errors} clearErr={clearErr} />
                    </div>

                    {/* Academic */}
                    <div style={{ display: activeTab === 'Academic' ? undefined : 'none' }}>
                        <AcademicTab
                            form={form} set={set} errors={errors} clearErr={clearErr}
                            mode={mode} classOptions={classOptions}
                            sectionOptions={sectionOptions}
                            loadingSections={loadingSections}
                            showStream={showStream}
                        />
                    </div>

                    {/* Medical */}
                    <div style={{ display: activeTab === 'Medical' ? undefined : 'none' }}>
                        <MedicalTab form={form} set={set} errors={errors} clearErr={clearErr} />
                    </div>

                    {/* Documents */}
                    <div style={{ display: activeTab === 'Documents' ? undefined : 'none' }}>
                        <DocumentsTab form={form} set={set} />
                    </div>
                </div>
            </div>

            {/* ── Sticky Footer ── */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-neutral-200 px-6 py-4 flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                    {mode === 'edit' && initialData?.created_at
                        ? `Last updated ${new Date(initialData.created_at).toLocaleDateString('en-IN')}`
                        : '* Required fields'}
                </span>
                <div className="flex gap-3">
                    <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
                    {mode === 'create' && (
                        <Button type="button" variant="outline" onClick={() => onSubmit({ ...form, _draft: true } as StudentFormData)}>
                            Save as Draft
                        </Button>
                    )}
                    <Button type="submit" variant="primary" loading={loading}>
                        {mode === 'create' ? 'Save Student' : 'Update Student'}
                    </Button>
                </div>
            </div>
        </form>
    );
}

// ─── Tab: Personal ───────────────────────────────────────────
function PersonalTab({ form, set, errors, clearErr, age, photoPreview, photoInputRef, onPhotoSelect }: {
    form: StudentFormData;
    set: (f: keyof StudentFormData, v: unknown) => void;
    errors: Partial<Record<keyof StudentFormData, string>>;
    clearErr: (f: keyof StudentFormData) => void;
    setErr: (f: keyof StudentFormData, v: string) => void;
    age: number | null;
    photoPreview: string | null;
    photoInputRef: React.RefObject<HTMLInputElement | null>;
    onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="space-y-6">
            {/* Photo */}
            <div className="flex flex-col items-center">
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={onPhotoSelect} />
                <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-24 h-24 rounded-full border-2 border-dashed border-neutral-300 hover:border-brand-400 flex items-center justify-center relative overflow-hidden transition-colors group"
                >
                    {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center gap-1 text-neutral-400 group-hover:text-brand-500">
                            <Camera size={24} />
                            <span className="text-xs">Add Photo</span>
                        </div>
                    )}
                </button>
                <p className="text-xs text-neutral-400 mt-2">JPG/PNG, max 2MB</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <Input label="First Name *" value={form.first_name} onChange={e => { set('first_name', e.target.value); clearErr('first_name'); }} error={errors.first_name} maxLength={50} />
                <Input label="Last Name *" value={form.last_name} onChange={e => { set('last_name', e.target.value); clearErr('last_name'); }} error={errors.last_name} maxLength={50} />

                <div>
                    <Input
                        label="Date of Birth *"
                        type="date"
                        value={form.dob}
                        onChange={e => { set('dob', e.target.value); clearErr('dob'); }}
                        error={errors.dob}
                        max={new Date().toISOString().split('T')[0]}
                    />
                    {age !== null && !errors.dob && (
                        <p className="text-xs text-neutral-500 mt-1">Age: {age} years</p>
                    )}
                </div>

                <Select
                    label="Gender *"
                    options={[{ value: '', label: 'Select' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]}
                    value={form.gender}
                    onChange={e => { set('gender', e.target.value); clearErr('gender'); }}
                    error={errors.gender}
                />

                <Select
                    label="Blood Group"
                    options={[{ value: '', label: 'Unknown' }, ...['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(v => ({ value: v, label: v }))]}
                    value={form.blood_group}
                    onChange={e => set('blood_group', e.target.value)}
                />

                <Select
                    label="Religion"
                    options={[{ value: '', label: 'Select' }, ...['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'].map(v => ({ value: v, label: v }))]}
                    value={form.religion}
                    onChange={e => set('religion', e.target.value)}
                />

                <Select
                    label="Category *"
                    options={[{ value: '', label: 'Select' }, ...['General', 'OBC', 'SC', 'ST', 'EWS'].map(v => ({ value: v, label: v }))]}
                    value={form.category}
                    onChange={e => { set('category', e.target.value); clearErr('category'); }}
                    error={errors.category}
                />

                <Input label="Sub-Caste" value={form.sub_caste} onChange={e => set('sub_caste', e.target.value)} />

                <Input
                    label="Nationality *"
                    value={form.nationality}
                    onChange={e => { set('nationality', e.target.value); clearErr('nationality'); }}
                    error={errors.nationality}
                />

                <Select
                    label="Mother Tongue"
                    options={[{ value: '', label: 'Select' }, ...['Hindi', 'English', 'Punjabi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Gujarati', 'Kannada', 'Malayalam', 'Odia', 'Urdu', 'Other'].map(v => ({ value: v, label: v }))]}
                    value={form.mother_tongue}
                    onChange={e => set('mother_tongue', e.target.value)}
                />

                <Input
                    label="Aadhaar Number"
                    value={form.aadhaar}
                    onChange={e => { set('aadhaar', e.target.value.replace(/\D/g, '').slice(0, 12)); clearErr('aadhaar'); }}
                    error={errors.aadhaar}
                    placeholder="12 digits"
                    maxLength={12}
                />

                <Input label="APAAR ID / ABC ID" value={form.apaar_id} onChange={e => set('apaar_id', e.target.value)} />
            </div>
        </div>
    );
}

// ─── Tab: Contact ────────────────────────────────────────────
function ContactTab({ form, set, errors, clearErr, stateOptions }: {
    form: StudentFormData;
    set: (f: keyof StudentFormData, v: unknown) => void;
    errors: Partial<Record<keyof StudentFormData, string>>;
    clearErr: (f: keyof StudentFormData) => void;
    stateOptions: { value: string; label: string }[];
}) {
    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
                <Input label="Primary Phone *" value={form.phone} onChange={e => { set('phone', e.target.value.replace(/\D/g, '').slice(0, 10)); clearErr('phone'); }} error={errors.phone} placeholder="10-digit mobile" type="tel" />
                <Input label="Secondary Phone" value={form.phone2} onChange={e => { set('phone2', e.target.value.replace(/\D/g, '').slice(0, 10)); clearErr('phone2'); }} error={errors.phone2} placeholder="10-digit mobile" type="tel" />
                <Input label="Email" value={form.email} onChange={e => set('email', e.target.value)} type="email" className="md:col-span-2" />
            </div>

            <div>
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">Current Address</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="House No / Street *" value={form.current_street} onChange={e => { set('current_street', e.target.value); clearErr('current_street'); }} error={errors.current_street} className="md:col-span-2" />
                    <Input label="Locality / Area" value={form.current_locality} onChange={e => set('current_locality', e.target.value)} className="md:col-span-2" />
                    <Input label="City *" value={form.current_city} onChange={e => { set('current_city', e.target.value); clearErr('current_city'); }} error={errors.current_city} />
                    <Select label="State *" options={stateOptions} value={form.current_state} onChange={e => { set('current_state', e.target.value); clearErr('current_state'); }} error={errors.current_state} />
                    <Input label="PIN Code *" value={form.current_pincode} onChange={e => { set('current_pincode', e.target.value.replace(/\D/g, '').slice(0, 6)); clearErr('current_pincode'); }} error={errors.current_pincode} placeholder="6 digits" maxLength={6} />
                </div>
            </div>

            <div>
                <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-neutral-700">Permanent Address</h3>
                    <label className="flex items-center gap-1.5 text-sm text-neutral-600 cursor-pointer ml-4">
                        <input
                            type="checkbox"
                            checked={form.same_address}
                            onChange={e => set('same_address', e.target.checked)}
                            className="rounded border-neutral-300"
                        />
                        Same as current address
                    </label>
                </div>
                {!form.same_address && (
                    <div className="grid md:grid-cols-2 gap-4">
                        <Input label="House No / Street" value={form.perm_street} onChange={e => set('perm_street', e.target.value)} className="md:col-span-2" />
                        <Input label="Locality / Area" value={form.perm_locality} onChange={e => set('perm_locality', e.target.value)} className="md:col-span-2" />
                        <Input label="City" value={form.perm_city} onChange={e => set('perm_city', e.target.value)} />
                        <Select label="State" options={stateOptions} value={form.perm_state} onChange={e => set('perm_state', e.target.value)} />
                        <Input label="PIN Code" value={form.perm_pincode} onChange={e => set('perm_pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits" maxLength={6} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Tab: Parents ────────────────────────────────────────────
function ParentsTab({ form, set, errors, clearErr }: {
    form: StudentFormData;
    set: (f: keyof StudentFormData, v: unknown) => void;
    errors: Partial<Record<keyof StudentFormData, string>>;
    clearErr: (f: keyof StudentFormData) => void;
}) {
    const [showGuardian, setShowGuardian] = useState(false);

    return (
        <div className="space-y-6">
            <ParentSection title="Father's Details" defaultOpen>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Name *" value={form.father_name} onChange={e => { set('father_name', e.target.value); clearErr('father_name'); }} error={errors.father_name} />
                    <Input label="Phone *" value={form.father_phone} onChange={e => { set('father_phone', e.target.value.replace(/\D/g, '').slice(0, 10)); clearErr('father_phone'); }} error={errors.father_phone} type="tel" />
                    <Input label="Email" value={form.father_email} onChange={e => set('father_email', e.target.value)} type="email" />
                    <Input label="Occupation" value={form.father_occupation} onChange={e => set('father_occupation', e.target.value)} />
                    <Input label="Qualification" value={form.father_qualification} onChange={e => set('father_qualification', e.target.value)} />
                    <Input label="Aadhaar" value={form.father_aadhaar} onChange={e => set('father_aadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="12 digits" />
                    <Input label="Annual Income (₹)" value={form.father_income} onChange={e => set('father_income', e.target.value)} type="number" />
                </div>
            </ParentSection>

            <ParentSection title="Mother's Details" defaultOpen>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Name" value={form.mother_name} onChange={e => set('mother_name', e.target.value)} />
                    <Input label="Phone" value={form.mother_phone} onChange={e => set('mother_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} type="tel" />
                    <Input label="Email" value={form.mother_email} onChange={e => set('mother_email', e.target.value)} type="email" />
                    <Input label="Occupation" value={form.mother_occupation} onChange={e => set('mother_occupation', e.target.value)} />
                    <Input label="Qualification" value={form.mother_qualification} onChange={e => set('mother_qualification', e.target.value)} />
                    <Input label="Aadhaar" value={form.mother_aadhaar} onChange={e => set('mother_aadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder="12 digits" />
                    <Input label="Annual Income (₹)" value={form.mother_income} onChange={e => set('mother_income', e.target.value)} type="number" />
                </div>
            </ParentSection>

            <div>
                <button
                    type="button"
                    onClick={() => setShowGuardian(v => !v)}
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    style={{ color: 'var(--color-brand-600)' }}
                >
                    {showGuardian ? '− Hide' : '+ Add'} Guardian Details (if different from parents)
                </button>
                {showGuardian && (
                    <div className="mt-4 grid md:grid-cols-2 gap-4">
                        <Input label="Name" value={form.guardian_name} onChange={e => set('guardian_name', e.target.value)} />
                        <Select
                            label="Relation *"
                            options={[{ value: '', label: 'Select' }, ...['Grandfather', 'Grandmother', 'Uncle', 'Aunt', 'Sibling', 'Other'].map(v => ({ value: v, label: v }))]}
                            value={form.guardian_relation}
                            onChange={e => set('guardian_relation', e.target.value)}
                        />
                        <Input label="Phone" value={form.guardian_phone} onChange={e => set('guardian_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} type="tel" />
                        <Input label="Email" value={form.guardian_email} onChange={e => set('guardian_email', e.target.value)} type="email" />
                        <Textarea label="Address" value={form.guardian_address} onChange={e => set('guardian_address', e.target.value)} className="md:col-span-2" rows={2} />
                    </div>
                )}
            </div>

            <div>
                <p className="text-sm font-semibold text-neutral-700 mb-3">Primary Contact for Notifications</p>
                <div className="flex gap-6">
                    {(['father', 'mother', 'guardian'] as const).map(v => (
                        <label key={v} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                                type="radio"
                                name="primary_contact"
                                value={v}
                                checked={form.primary_contact === v}
                                onChange={() => set('primary_contact', v)}
                                className="accent-brand-600"
                            />
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ParentSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(defaultOpen ?? false);
    return (
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
            <button type="button" onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 text-sm font-semibold text-neutral-700 hover:bg-neutral-100">
                {title}
                <span className="text-neutral-400">{open ? '−' : '+'}</span>
            </button>
            {open && <div className="p-4">{children}</div>}
        </div>
    );
}

// ─── Tab: Academic ───────────────────────────────────────────
function AcademicTab({ form, set, errors, clearErr, mode, classOptions, sectionOptions, loadingSections, showStream }: {
    form: StudentFormData;
    set: (f: keyof StudentFormData, v: unknown) => void;
    errors: Partial<Record<keyof StudentFormData, string>>;
    clearErr: (f: keyof StudentFormData) => void;
    mode: 'create' | 'edit';
    classOptions: { value: string; label: string }[];
    sectionOptions: { value: string; label: string }[];
    loadingSections: boolean;
    showStream: boolean;
}) {
    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <Input
                        label="Admission Number"
                        value={form.admission_no}
                        onChange={e => set('admission_no', e.target.value)}
                        disabled={mode === 'edit'}
                        placeholder={mode === 'create' ? 'Will be auto-generated' : undefined}
                    />
                    {mode === 'edit' && <p className="text-xs text-neutral-400 mt-1">Cannot be changed after admission</p>}
                </div>

                <Input
                    label="Admission Date *"
                    type="date"
                    value={form.admission_date}
                    onChange={e => { set('admission_date', e.target.value); clearErr('admission_date'); }}
                    error={errors.admission_date}
                    max={new Date().toISOString().split('T')[0]}
                />

                <Select
                    label="Admission Type *"
                    options={[{ value: '', label: 'Select' }, ...['New', 'Transfer', 'Re-admission', 'RTE'].map(v => ({ value: v, label: v }))]}
                    value={form.admission_type}
                    onChange={e => { set('admission_type', e.target.value); clearErr('admission_type'); }}
                    error={errors.admission_type}
                />

                <Select
                    label="Class *"
                    options={classOptions}
                    value={form.class_id}
                    onChange={e => { set('class_id', e.target.value); set('section_id', ''); clearErr('class_id'); }}
                    error={errors.class_id}
                    disabled={mode === 'edit'}
                />

                <Select
                    label="Section *"
                    options={sectionOptions}
                    value={form.section_id}
                    onChange={e => { set('section_id', e.target.value); clearErr('section_id'); }}
                    error={errors.section_id}
                    disabled={!form.class_id || loadingSections || mode === 'edit'}
                />

                <Input label="Roll Number" value={form.roll_number} onChange={e => set('roll_number', e.target.value)} type="number" />

                {showStream && (
                    <Select
                        label="Stream"
                        options={[{ value: '', label: 'N/A' }, ...['Science', 'Commerce', 'Arts'].map(v => ({ value: v, label: v }))]}
                        value={form.stream}
                        onChange={e => set('stream', e.target.value)}
                    />
                )}

                <Input label="House" value={form.house} onChange={e => set('house', e.target.value)} placeholder="e.g. Red House" />

                <Select
                    label="Fee Group *"
                    options={[{ value: '', label: 'Select' }, ...['Regular', 'RTE', 'Staff Ward', 'Scholarship', 'Special'].map(v => ({ value: v, label: v }))]}
                    value={form.fee_group}
                    onChange={e => { set('fee_group', e.target.value); clearErr('fee_group'); }}
                    error={errors.fee_group}
                />
            </div>

            <div>
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">Previous School</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Previous School Name" value={form.prev_school} onChange={e => set('prev_school', e.target.value)} className="md:col-span-2" />
                    <Select
                        label="Previous Board"
                        options={[{ value: '', label: 'Select' }, ...['CBSE', 'ICSE', 'State Board', 'Other'].map(v => ({ value: v, label: v }))]}
                        value={form.prev_board}
                        onChange={e => set('prev_board', e.target.value)}
                    />
                    <Input label="Previous Class" value={form.prev_class} onChange={e => set('prev_class', e.target.value)} />
                    <Input label="TC Number" value={form.prev_tc} onChange={e => set('prev_tc', e.target.value)} />
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Medical ────────────────────────────────────────────
function MedicalTab({ form, set, errors, clearErr }: {
    form: StudentFormData;
    set: (f: keyof StudentFormData, v: unknown) => void;
    errors: Partial<Record<keyof StudentFormData, string>>;
    clearErr: (f: keyof StudentFormData) => void;
}) {
    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
                <Textarea label="Known Allergies" value={form.allergies} onChange={e => set('allergies', e.target.value)} rows={2} className="md:col-span-2" />
                <Textarea label="Chronic Conditions" value={form.conditions} onChange={e => set('conditions', e.target.value)} rows={2} className="md:col-span-2" />

                <Select
                    label="Disability"
                    options={[{ value: 'None', label: 'None' }, ...['Visual', 'Hearing', 'Physical', 'Learning', 'Intellectual', 'Other'].map(v => ({ value: v, label: v }))]}
                    value={form.disability}
                    onChange={e => set('disability', e.target.value)}
                />

                {form.disability !== 'None' && (
                    <Input label="Disability Certificate No" value={form.disability_cert_no} onChange={e => set('disability_cert_no', e.target.value)} />
                )}
            </div>

            <div>
                <h3 className="text-sm font-semibold text-neutral-700 mb-3">Emergency Contact</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <Input label="Name *" value={form.emergency_name} onChange={e => { set('emergency_name', e.target.value); clearErr('emergency_name'); }} error={errors.emergency_name} />
                    <Input label="Phone *" value={form.emergency_phone} onChange={e => { set('emergency_phone', e.target.value.replace(/\D/g, '').slice(0, 10)); clearErr('emergency_phone'); }} error={errors.emergency_phone} type="tel" />
                    <Input label="Relation" value={form.emergency_relation} onChange={e => set('emergency_relation', e.target.value)} />
                    <Input label="Preferred Hospital" value={form.preferred_hospital} onChange={e => set('preferred_hospital', e.target.value)} />
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Documents ──────────────────────────────────────────
function DocumentsTab({ form, set }: {
    form: StudentFormData;
    set: (f: keyof StudentFormData, v: unknown) => void;
}) {
    const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

    const handleFileSelect = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        if (file && file.size > 5 * 1024 * 1024) { alert('File must be under 5MB'); return; }
        set('documents', { ...form.documents, [docType]: file });
    };

    const removeFile = (docType: string) => {
        set('documents', { ...form.documents, [docType]: null });
        if (fileRefs.current[docType]) fileRefs.current[docType]!.value = '';
    };

    return (
        <div className="space-y-3">
            <p className="text-sm text-neutral-500">Upload supporting documents. PDF, JPG, PNG accepted (max 5MB each).</p>
            {DOCUMENT_TYPES.map(docType => {
                const file = form.documents[docType];
                return (
                    <div key={docType} className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-neutral-50">
                        <div className="flex items-center gap-3">
                            <FileText size={16} className="text-neutral-400" />
                            <span className="text-sm text-neutral-700">{docType}</span>
                            <Badge variant="default" size="sm">Optional</Badge>
                        </div>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            className="hidden"
                            ref={el => { fileRefs.current[docType] = el; }}
                            onChange={e => handleFileSelect(docType, e)}
                        />
                        {file ? (
                            <div className="flex items-center gap-2">
                                <CheckCircle size={14} className="text-emerald-500" />
                                <span className="text-xs text-neutral-600 max-w-[120px] truncate">{file.name}</span>
                                <button type="button" onClick={() => window.open(URL.createObjectURL(file))} className="text-neutral-400 hover:text-neutral-600">
                                    <Upload size={14} />
                                </button>
                                <button type="button" onClick={() => removeFile(docType)} className="text-neutral-400 hover:text-red-500">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <Button type="button" variant="outline" size="sm" onClick={() => fileRefs.current[docType]?.click()}>
                                Upload
                            </Button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
