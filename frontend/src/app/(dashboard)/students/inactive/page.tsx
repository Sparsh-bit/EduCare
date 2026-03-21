'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Student } from '@/lib/types';
import { UserX } from 'lucide-react';

export default function InactiveStudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getStudents({ status: 'tc_issued', limit: 100 })
            .then(res => setStudents(res.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Inactive Students</h1>
                <p className="text-sm text-slate-500 mt-0.5">Students who have left the school or had a Transfer Certificate issued</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Admn No</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Student Name</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Class</th>
                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={4} className="px-5 py-4">
                                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                    </td>
                                </tr>
                            ))
                        ) : students.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-16 text-center">
                                    <UserX size={24} className="text-slate-200 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">No inactive students found</p>
                                </td>
                            </tr>
                        ) : students.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 font-mono text-slate-400 text-xs">{s.admission_no}</td>
                                <td className="px-5 py-3 font-medium text-slate-900">{s.name}</td>
                                <td className="px-5 py-3 text-slate-500">{s.class_name} {s.section_name}</td>
                                <td className="px-5 py-3">
                                    <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600">
                                        {s.status.replace('_', ' ')}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
