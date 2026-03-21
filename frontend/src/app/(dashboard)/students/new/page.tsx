'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { StudentForm } from '@/components/students/StudentForm';
import type { StudentFormData } from '@/components/students/StudentForm';
import showToast from '@/lib/toast';

export default function NewStudentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (data: StudentFormData) => {
        setLoading(true);
        try {
            const name = `${data.first_name.trim()} ${data.last_name.trim()}`.trim();
            const payload = {
                name,
                dob: data.dob,
                gender: data.gender,
                blood_group: data.blood_group || undefined,
                religion: data.religion || undefined,
                category: data.category,
                nationality: data.nationality,
                aadhaar: data.aadhaar || undefined,
                phone: data.phone,
                email: data.email || undefined,
                address: data.current_street + (data.current_locality ? `, ${data.current_locality}` : ''),
                city: data.current_city,
                state: data.current_state,
                pincode: data.current_pincode,
                father_name: data.father_name,
                father_phone: data.father_phone,
                father_email: data.father_email || undefined,
                father_occupation: data.father_occupation || undefined,
                mother_name: data.mother_name || undefined,
                mother_phone: data.mother_phone || undefined,
                mother_occupation: data.mother_occupation || undefined,
                guardian_name: data.guardian_name || undefined,
                guardian_phone: data.guardian_phone || undefined,
                guardian_relation: data.guardian_relation || undefined,
                previous_school: data.prev_school || undefined,
                class_id: Number(data.class_id),
                section_id: Number(data.section_id),
                current_roll_no: data.roll_number || undefined,
                admission_no: data.admission_no || undefined,
                status: 'active',
            };
            const student = await api.createStudent(payload);
            showToast.success(`${name} admitted successfully`);
            router.push(`/students/${student.id}`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to create student';
            showToast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-neutral-50">
            {/* Header */}
            <div className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors"
                >
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-neutral-900">New Student Admission</h1>
                    <p className="text-xs text-neutral-500">Fill all required fields to register a new student</p>
                </div>
            </div>

            <StudentForm mode="create" onSubmit={handleSubmit} loading={loading} />
        </div>
    );
}
