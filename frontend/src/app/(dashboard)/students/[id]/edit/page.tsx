/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const EMPTY_FORM = {
    name: '', name_hi: '', dob: '', gender: 'male', aadhaar: '', category: 'GEN', religion: '', blood_group: '',
    address: '', city: '', state: '', pincode: '',
    father_name: '', father_phone: '', father_occupation: '', father_email: '',
    mother_name: '', mother_phone: '', mother_occupation: '',
    guardian_name: '', guardian_phone: '', guardian_relation: '',
    sr_no: '', previous_school: '', status: 'active',
};

export default function EditStudentPage() {
    const router = useRouter();
    const params = useParams();
    const studentId = params.id as string;

    const [form, setForm] = useState(EMPTY_FORM);
    const [meta, setMeta] = useState({ admission_no: '', current_roll_no: '', student_uid: '', class_name: '', section_name: '', academic_year: '' });
    const [pageLoading, setPageLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        api.getStudent(parseInt(studentId))
            .then((s) => {
                setForm({
                    name: s.name || '',
                    name_hi: s.name_hi || '',
                    dob: s.dob ? s.dob.split('T')[0] : '',
                    gender: s.gender || 'male',
                    aadhaar: '',
                    category: s.category || 'GEN',
                    religion: s.religion || '',
                    blood_group: s.blood_group || '',
                    address: s.address || '',
                    city: s.city || '',
                    state: s.state || '',
                    pincode: s.pincode || '',
                    father_name: s.father_name || '',
                    father_phone: s.father_phone || '',
                    father_occupation: s.father_occupation || '',
                    father_email: s.father_email || '',
                    mother_name: s.mother_name || '',
                    mother_phone: s.mother_phone || '',
                    mother_occupation: s.mother_occupation || '',
                    guardian_name: s.guardian_name || '',
                    guardian_phone: s.guardian_phone || '',
                    guardian_relation: s.guardian_relation || '',
                    sr_no: s.sr_no || '',
                    previous_school: s.previous_school || '',
                    status: s.status || 'active',
                });
                setMeta({
                    admission_no: s.admission_no || '',
                    current_roll_no: s.current_roll_no || '',
                    student_uid: s.student_uid || '',
                    class_name: s.class_name || '',
                    section_name: s.section_name || '',
                    academic_year: s.academic_year || '',
                });
            })
            .catch(() => setError('Failed to load student data'))
            .finally(() => setPageLoading(false));
    }, [studentId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const payload: Record<string, any> = { ...form };
            if (!payload.aadhaar) delete payload.aadhaar;
            await api.updateStudent(parseInt(studentId), payload as Parameters<typeof api.updateStudent>[1]);
            setSuccess(true);
            setTimeout(() => router.push('/students'), 1200);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    if (pageLoading) return (
        <div className="flex items-center justify-center min-h-64">
            <div className="w-8 h-8 border-4 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Student</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Update student record details</p>
                </div>
            </div>

            {/* Read-only identity panel */}
            <div className="bg-[#f1f0ff] border border-[#f1f0ff] rounded-2xl px-6 py-4 flex flex-wrap gap-6">
                <Info label="Admission No." value={meta.admission_no} />
                <Info label="Roll No." value={meta.current_roll_no || '—'} />
                {meta.student_uid && <Info label="Student UID" value={meta.student_uid} mono />}
                <Info label="Class" value={`${meta.class_name} ${meta.section_name}`} />
                <Info label="Academic Year" value={meta.academic_year} />
            </div>

            {success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700 text-sm font-medium">
                    ✅ Student record updated successfully. Redirecting…
                </div>
            )}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <Section title="👤 Personal Information">
                    <Field label="Full Name (English) *" name="name" value={form.name} onChange={handleChange} required />
                    <Field label="Name (Hindi / हिन्दी)" name="name_hi" value={form.name_hi} onChange={handleChange} />
                    <Field label="Date of Birth *" name="dob" type="date" value={form.dob} onChange={handleChange} required />
                    <Sel label="Gender *" name="gender" value={form.gender} onChange={handleChange}
                        options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
                    <Field label="Aadhaar (leave blank to keep existing)" name="aadhaar" value={form.aadhaar} onChange={handleChange} maxLength={12} />
                    <Sel label="Category" name="category" value={form.category} onChange={handleChange}
                        options={[{ value: 'GEN', label: 'General' }, { value: 'OBC', label: 'OBC' }, { value: 'SC', label: 'SC' }, { value: 'ST', label: 'ST' }, { value: 'EWS', label: 'EWS' }]} />
                    <Field label="Religion" name="religion" value={form.religion} onChange={handleChange} />
                    <Sel label="Blood Group" name="blood_group" value={form.blood_group} onChange={handleChange}
                        options={[{ value: '', label: 'Select' }, ...['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => ({ value: v, label: v }))]} />
                    <Sel label="Status" name="status" value={form.status} onChange={handleChange}
                        options={[{ value: 'active', label: 'Active' }, { value: 'alumni', label: 'Alumni' }, { value: 'tc_issued', label: 'TC Issued' }, { value: 'inactive', label: 'Inactive' }]} />
                    <Field label="SR No. (Serial Register)" name="sr_no" value={form.sr_no} onChange={handleChange} />
                </Section>

                {/* Address */}
                <Section title="🏠 Address">
                    <div className="col-span-2">
                        <label className="text-xs text-gray-500 mb-1 block">Address</label>
                        <textarea name="address" value={form.address} onChange={handleChange} rows={2}
                            className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 focus:ring-2 focus:ring-[#6c5ce7] focus:border-transparent" />
                    </div>
                    <Field label="City" name="city" value={form.city} onChange={handleChange} />
                    <Sel label="State" name="state" value={form.state} onChange={handleChange}
                        options={[{ value: '', label: 'Select State' }, ...INDIAN_STATES.map(s => ({ value: s, label: s }))]} />
                    <Field label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} maxLength={6} />
                </Section>

                {/* Parent Details */}
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

                {/* Previous School */}
                <Section title="📚 Previous School">
                    <Field label="Previous School" name="previous_school" value={form.previous_school} onChange={handleChange} />
                </Section>

                <div className="flex gap-3">
                    <button type="submit" disabled={saving || success}
                        className="px-6 py-2.5 bg-[#6c5ce7] text-white rounded-xl text-sm font-semibold hover:bg-[#6c5ce7] disabled:opacity-50 transition-all shadow-md shadow-[#6c5ce7]/20">
                        {saving ? 'Saving…' : '💾 Save Changes'}
                    </button>
                    <button type="button" onClick={() => router.back()}
                        className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#a29bfe] mb-0.5">{label}</p>
            <p className={`text-sm font-bold text-[#3d2e9e] ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
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
