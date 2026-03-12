'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, reportApiError } from '@/lib/api';
import type { Student, Class, Section } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

export default function StudentsPage() {
    const { user } = useAuth();
    const isTeacher = user?.role === 'teacher';
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ class_id: '', section_id: '', status: 'active', search: '' });
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    useEffect(() => { api.getClasses().then(setClasses).catch(reportApiError); }, []);
    useEffect(() => {
        if (filters.class_id) api.getSections(parseInt(filters.class_id)).then(setSections);
        else setSections([]);
    }, [filters.class_id]);
    useEffect(() => { fetchStudents(); }, [filters.class_id, filters.section_id, filters.status, pagination.page]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page: pagination.page, limit: pagination.limit };
            if (filters.class_id) params.class_id = filters.class_id;
            if (filters.section_id) params.section_id = filters.section_id;
            if (filters.status) params.status = filters.status;
            if (filters.search) params.search = filters.search;
            const data = await api.getStudents(params);
            setStudents(data.data);
            setPagination((p) => ({ ...p, total: data.total || 0 }));
        } catch (err) { reportApiError(err); }
        finally { setLoading(false); }
    };

    const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPagination((p) => ({ ...p, page: 1 })); fetchStudents(); };

    return (
        <div className="space-y-8 animate-fade-in p-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Student Repository</h1>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium">Managing {pagination.total} active enrollments</p>
                </div>
                {!isTeacher && (
                    <div className="flex items-center gap-3">
                        <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                            Export List
                        </button>
                        <Link href="/students/new" className="px-5 py-2 bg-[#6c5ce7] text-white rounded-xl text-sm font-semibold hover:bg-[#5b4bd5] transition-all shadow-md shadow-[#6c5ce7]/20 flex items-center gap-2">
                            <span>➕</span> New Admission
                        </Link>
                    </div>
                )}
            </div>

            {/* Premium Filter Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Academic Class</label>
                        <select
                            value={filters.class_id}
                            onChange={(e) => setFilters({ ...filters, class_id: e.target.value, section_id: '' })}
                            className="w-full bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-2.5"
                        >
                            <option value="">All Standard</option>
                            {classes.map((c) => <option key={c.id} value={c.id}>{String(c.name || '').toLowerCase().startsWith('class') ? c.name : 'Class ' + c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Section</label>
                        <select
                            value={filters.section_id}
                            onChange={(e) => setFilters({ ...filters, section_id: e.target.value })}
                            className="w-full bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-2.5 disabled:opacity-50"
                            disabled={!filters.class_id}
                        >
                            <option value="">All Section</option>
                            {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Enrollment Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="w-full bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-2.5"
                        >
                            <option value="active">Active</option>
                            <option value="alumni">Alumni</option>
                            <option value="tc_issued">TC Issued</option>
                            <option value="">All Statuses</option>
                        </select>
                    </div>
                    <div className="lg:col-span-2 space-y-1.5 relative">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Search Registry</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Adm. No, Name, or Parent Mobile..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="w-full bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-2.5 pl-10"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
                        </div>
                    </div>
                </form>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="inline-block w-8 h-8 border-4 border-[#6c5ce7] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-400 font-semibold italic text-sm">Retrieving student records...</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-4">📂</div>
                        <p className="text-gray-500 font-bold">No Records Found</p>
                        <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search query</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Student Info</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Class & Section</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Parent Details</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                                    {!isTeacher && <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {students.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#f1f0ff] text-[#6c5ce7] flex items-center justify-center font-bold text-sm">
                                                    {s.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 leading-tight">{s.name}</p>
                                                    <p className="text-[11px] font-bold font-mono text-gray-400 mt-0.5 tracking-tighter">ADM: {s.admission_no}</p>
                                                    {(s as Student & { student_uid?: string }).student_uid && <p className="text-[10px] font-mono text-[#a29bfe] mt-0.5">UID: {(s as Student & { student_uid?: string }).student_uid}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-700">{String(s.class_name || '').toLowerCase().startsWith('class') ? s.class_name : 'Class ' + s.class_name}</span>
                                                <span className="text-xs text-gray-400 font-semibold">{s.section_name || 'General Section'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-gray-700">{s.father_name || '—'}</span>
                                                <span className="text-xs text-gray-400 font-medium">Roll No: {s.current_roll_no || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide ${s.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                                                    s.status === 'tc_issued' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        {!isTeacher && (
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/students/${s.id}/edit`}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-50 text-gray-400 hover:bg-[#6c5ce7] hover:text-white transition-all shadow-sm group-hover:bg-[#6c5ce7]/5 group-hover:text-[#6c5ce7]"
                                                    title="Edit student"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </Link>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Premium Pagination */}
            {pagination.total > pagination.limit && (
                <div className="flex items-center justify-between px-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                            disabled={pagination.page <= 1}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white transition-all"
                        >
                            ←
                        </button>
                        <div className="flex items-center gap-1.5">
                            {[...Array(Math.ceil(pagination.total / pagination.limit))].map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPagination((p) => ({ ...p, page: i + 1 }))}
                                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${pagination.page === i + 1 ? 'bg-[#6c5ce7] text-white shadow-md shadow-[#6c5ce7]/20' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white transition-all"
                        >
                            →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
