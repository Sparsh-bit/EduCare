'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import type { Student } from '@/lib/types';
import { StudentForm } from '@/components/students/StudentForm';
import type { StudentFormData } from '@/components/students/StudentForm';
import { Skeleton } from '@/components/ui';
import showToast from '@/lib/toast';

export default function EditStudentPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);

    const [student, setStudent] = useState<Student | null>(null);
    const [fetching, setFetching] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        api.getStudent(id)
            .then(setStudent)
            .catch(() => setError('Failed to load student'))
            .finally(() => setFetching(false));
    }, [id]);

    const handleSubmit = async (data: StudentFormData) => {
        setSaving(true);
        try {
            const name = `${data.first_name.trim()} ${data.last_name.trim()}`.trim();
            await api.updateStudent(id, {
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
                current_roll_no: data.roll_number || undefined,
            });
            showToast.success('Student updated successfully');
            router.push(`/students/${id}`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to update student';
            showToast.error(msg);
        } finally {
            setSaving(false);
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
                    <h1 className="text-lg font-bold text-neutral-900">
                        {fetching ? 'Edit Student' : `Edit: ${student?.name ?? ''}`}
                    </h1>
                    {student && <p className="text-xs text-neutral-500">#{student.admission_no}</p>}
                </div>
            </div>

            {fetching ? (
                <div className="flex-1 p-8 space-y-4 max-w-4xl mx-auto w-full">
                    <Skeleton className="h-8 w-64 rounded-xl" />
                    <div className="grid md:grid-cols-2 gap-4">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 rounded-xl" />
                        ))}
                    </div>
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-sm text-red-600 mb-4">{error}</p>
                        <button onClick={() => router.back()} className="text-sm underline text-neutral-500">Go back</button>
                    </div>
                </div>
            ) : student ? (
                <StudentForm mode="edit" initialData={student} onSubmit={handleSubmit} loading={saving} />
            ) : null}
        </div>
    );
}
