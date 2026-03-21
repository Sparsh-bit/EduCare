'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Upload, SlidersHorizontal, Eye, Pencil, IndianRupee,
    CalendarCheck, Printer, UserMinus, GraduationCap, X, ChevronDown,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Student, Class, Section } from '@/lib/types';
import {
    Avatar, Badge, Button, EmptyState, Pagination,
    SearchInput, Select, Skeleton,
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui';
import showToast from '@/lib/toast';

// ─── Types ──────────────────────────────────────────────────
interface Filters {
    class_id: string;
    section_id: string;
    gender: string;
    category: string;
    fee_group: string;
    status: string;
}

const DEFAULT_FILTERS: Filters = { class_id: '', section_id: '', gender: '', category: '', fee_group: '', status: 'active' };
const LIMIT = 20;

export default function StudentsPage() {
    const router = useRouter();

    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [showFilters, setShowFilters] = useState(false);
    const [pendingFilters, setPendingFilters] = useState<Filters>(DEFAULT_FILTERS);

    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        api.getClasses().then(setClasses).catch(() => {});
    }, []);

    useEffect(() => {
        if (!pendingFilters.class_id) { setSections([]); return; }
        api.getSections(Number(pendingFilters.class_id)).then(setSections).catch(() => {});
    }, [pendingFilters.class_id]);

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string | number> = { page, limit: LIMIT };
            if (search) params.search = search;
            if (filters.class_id) params.class_id = filters.class_id;
            if (filters.section_id) params.section_id = filters.section_id;
            if (filters.gender) params.gender = filters.gender;
            if (filters.category) params.category = filters.category;
            if (filters.fee_group) params.fee_group = filters.fee_group;
            if (filters.status) params.status = filters.status;

            const res = await api.getStudents(params);
            setStudents(res.data ?? []);
            const t = res.total ?? res.data?.length ?? 0;
            setTotal(t);
            setTotalPages(Math.max(1, Math.ceil(t / LIMIT)));
        } catch {
            setError('Failed to load students.');
        } finally {
            setLoading(false);
        }
    }, [page, search, filters]);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    const prevRef = useRef({ filters, search });
    useEffect(() => {
        if (prevRef.current.filters !== filters || prevRef.current.search !== search) {
            setPage(1);
            prevRef.current = { filters, search };
        }
    }, [filters, search]);

    const allSelected = students.length > 0 && students.every(s => selectedIds.has(s.id));
    const toggleAll = () => setSelectedIds(allSelected ? new Set() : new Set(students.map(s => s.id)));
    const toggleOne = (id: number) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const hasActiveFilters = !!(filters.class_id || filters.section_id || filters.gender || filters.category || filters.fee_group);
    const clearFilters = () => { setFilters(DEFAULT_FILTERS); setPendingFilters(DEFAULT_FILTERS); setShowFilters(false); };
    const applyFilters = () => { setFilters({ ...pendingFilters }); setShowFilters(false); };

    const handleDeactivate = async (id: number) => {
        if (!confirm('Mark this student as inactive?')) return;
        try {
            await api.updateStudent(id, { status: 'inactive' });
            showToast.success('Student marked inactive');
            fetchStudents();
        } catch { showToast.error('Failed to deactivate student'); }
    };

    const handleBulkDeactivate = async () => {
        if (!confirm(`Mark ${selectedIds.size} students as inactive?`)) return;
        try {
            await Promise.all([...selectedIds].map(id => api.updateStudent(id, { status: 'inactive' })));
            showToast.success(`${selectedIds.size} students deactivated`);
            setSelectedIds(new Set());
            fetchStudents();
        } catch { showToast.error('Some deactivations failed'); }
    };

    const handleExportCsv = () => {
        const selected = students.filter(s => selectedIds.has(s.id));
        const headers = ['Admission No', 'Name', 'Father Name', 'Class', 'Section', 'Phone', 'Status'];
        const rows = selected.map(s => [
            s.admission_no, s.name, s.father_name || '',
            s.class_name || '', s.section_name || '',
            s.phone || s.father_phone || '', s.status,
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `students_export_${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    const classOptions = [{ value: '', label: 'All Classes' }, ...classes.map(c => ({ value: String(c.id), label: c.name }))];
    const sectionOptions = [{ value: '', label: 'All Sections' }, ...sections.map(s => ({ value: String(s.id), label: s.name }))];

    return (
        <div className="p-6 space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-neutral-900">Students</h1>
                    {!loading && <Badge variant="default">{total}</Badge>}
                </div>
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <SearchInput placeholder="Search by name, admission no..." onChange={setSearch} className="w-64" />
                    <Button
                        variant={showFilters || hasActiveFilters ? 'secondary' : 'outline'}
                        size="sm"
                        leftIcon={<SlidersHorizontal size={14} />}
                        onClick={() => { setShowFilters(v => !v); setPendingFilters(filters); }}
                    >
                        Filters{hasActiveFilters ? ' •' : ''}
                    </Button>
                    <div className="w-px h-5 bg-neutral-200" />
                    <Button variant="outline" size="sm" leftIcon={<Upload size={14} />} onClick={() => router.push('/students/bulk-upload')}>
                        Bulk Import
                    </Button>
                    <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => router.push('/students/new')}>
                        Add Student
                    </Button>
                </div>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Select
                                    label="Class"
                                    size="sm"
                                    options={classOptions}
                                    value={pendingFilters.class_id}
                                    onChange={e => setPendingFilters(f => ({ ...f, class_id: e.target.value, section_id: '' }))}
                                />
                                <Select
                                    label="Section"
                                    size="sm"
                                    options={sectionOptions}
                                    value={pendingFilters.section_id}
                                    onChange={e => setPendingFilters(f => ({ ...f, section_id: e.target.value }))}
                                    disabled={!pendingFilters.class_id}
                                />
                                <Select
                                    label="Gender"
                                    size="sm"
                                    options={[{ value: '', label: 'All Genders' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]}
                                    value={pendingFilters.gender}
                                    onChange={e => setPendingFilters(f => ({ ...f, gender: e.target.value }))}
                                />
                                <Select
                                    label="Category"
                                    size="sm"
                                    options={[{ value: '', label: 'All' }, { value: 'General', label: 'General' }, { value: 'OBC', label: 'OBC' }, { value: 'SC', label: 'SC' }, { value: 'ST', label: 'ST' }, { value: 'EWS', label: 'EWS' }]}
                                    value={pendingFilters.category}
                                    onChange={e => setPendingFilters(f => ({ ...f, category: e.target.value }))}
                                />
                                <Select
                                    label="Fee Group"
                                    size="sm"
                                    options={[{ value: '', label: 'All' }, { value: 'Regular', label: 'Regular' }, { value: 'RTE', label: 'RTE' }, { value: 'Staff Ward', label: 'Staff Ward' }, { value: 'Scholarship', label: 'Scholarship' }]}
                                    value={pendingFilters.fee_group}
                                    onChange={e => setPendingFilters(f => ({ ...f, fee_group: e.target.value }))}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                <button onClick={clearFilters} className="text-sm text-neutral-500 hover:text-neutral-700 underline">
                                    Clear filters
                                </button>
                                <Button variant="primary" size="sm" onClick={applyFilters}>Apply</Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bulk Action Bar */}
            <AnimatePresence>
                {selectedIds.size > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-white"
                        style={{ backgroundColor: 'var(--color-brand-800)' }}
                    >
                        <span className="text-sm font-medium">{selectedIds.size} student{selectedIds.size !== 1 ? 's' : ''} selected</span>
                        <div className="flex gap-2 ml-auto items-center">
                            <Button variant="ghost" size="sm" className="!text-white hover:!bg-white/10" onClick={() => router.push('/communication/bulk')}>Send SMS</Button>
                            <Button variant="ghost" size="sm" className="!text-white hover:!bg-white/10" onClick={handleExportCsv}>Export CSV</Button>
                            <Button variant="ghost" size="sm" className="!text-white hover:!bg-white/10" onClick={() => showToast.info('PDF export coming soon')}>Export PDF</Button>
                            <Button variant="danger" size="sm" onClick={handleBulkDeactivate}>Deactivate</Button>
                            <button onClick={() => setSelectedIds(new Set())} className="ml-1 text-white/60 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content */}
            {error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
                    {error}
                    <button onClick={fetchStudents} className="ml-auto underline">Retry</button>
                </div>
            ) : loading ? (
                <LoadingTable />
            ) : students.length === 0 ? (
                hasActiveFilters || search ? (
                    <EmptyState icon={<GraduationCap size={28} />} title="No students match your filters" action={{ label: 'Clear filters', onClick: clearFilters }} />
                ) : (
                    <EmptyState icon={<GraduationCap size={28} />} title="No students yet" description="Add your first student or import from Excel" action={{ label: 'Add Student', onClick: () => router.push('/students/new') }} />
                )
            ) : (
                <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-neutral-100 bg-neutral-50/50">
                                    <th className="w-10 px-4 py-3">
                                        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-neutral-300" />
                                    </th>
                                    <th className="w-10 px-2 py-3 text-left text-xs font-medium text-neutral-500">S.No</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Student</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Father&apos;s Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Class</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Phone</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Fee Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Status</th>
                                    <th className="w-12 px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((s, idx) => (
                                    <StudentRow
                                        key={s.id}
                                        student={s}
                                        index={(page - 1) * LIMIT + idx + 1}
                                        selected={selectedIds.has(s.id)}
                                        onToggle={() => toggleOne(s.id)}
                                        onView={() => router.push(`/students/${s.id}`)}
                                        onEdit={() => router.push(`/students/${s.id}/edit`)}
                                        onDeactivate={() => handleDeactivate(s.id)}
                                        onFees={() => router.push(`/fees?student=${s.id}`)}
                                        onAttendance={() => router.push(`/attendance?student=${s.id}`)}
                                        onPrintIdCard={() => router.push(`/students/id-card?id=${s.id}`)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!loading && totalPages > 1 && (
                <div className="flex justify-end">
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
            )}
        </div>
    );
}

function LoadingTable() {
    return (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <table className="w-full">
                <tbody>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} className="border-b border-neutral-50">
                            <td className="p-4"><Skeleton className="w-4 h-4 rounded" /></td>
                            <td className="p-4"><Skeleton className="w-6 h-3 rounded" /></td>
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-8 h-8 rounded-full" />
                                    <div className="space-y-1.5"><Skeleton className="w-32 h-3 rounded" /><Skeleton className="w-20 h-3 rounded" /></div>
                                </div>
                            </td>
                            <td className="p-4"><Skeleton className="w-24 h-3 rounded" /></td>
                            <td className="p-4"><Skeleton className="w-16 h-3 rounded" /></td>
                            <td className="p-4"><Skeleton className="w-20 h-3 rounded" /></td>
                            <td className="p-4"><Skeleton className="w-14 h-5 rounded-full" /></td>
                            <td className="p-4"><Skeleton className="w-14 h-5 rounded-full" /></td>
                            <td className="p-4"><Skeleton className="w-6 h-6 rounded" /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function StudentRow({
    student, index, selected, onToggle, onView, onEdit, onDeactivate, onFees, onAttendance, onPrintIdCard,
}: {
    student: Student; index: number; selected: boolean;
    onToggle: () => void; onView: () => void; onEdit: () => void;
    onDeactivate: () => void; onFees: () => void; onAttendance: () => void; onPrintIdCard: () => void;
}) {
    return (
        <tr className={`border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors ${selected ? 'bg-brand-50/30' : ''}`}>
            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selected} onChange={onToggle} className="rounded border-neutral-300" />
            </td>
            <td className="px-2 py-3 text-xs text-neutral-400 cursor-pointer" onClick={onView}>{index}</td>
            <td className="px-4 py-3 cursor-pointer" onClick={onView}>
                <div className="flex items-center gap-3">
                    <Avatar name={student.name} size="sm" />
                    <div>
                        <p className="text-sm font-medium text-neutral-900 leading-tight">{student.name}</p>
                        <p className="text-xs text-neutral-400">#{student.admission_no}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 text-sm text-neutral-700 cursor-pointer" onClick={onView}>{student.father_name || '—'}</td>
            <td className="px-4 py-3 text-sm text-neutral-700 cursor-pointer" onClick={onView}>
                {[student.class_name, student.section_name].filter(Boolean).join(' - ') || '—'}
            </td>
            <td className="px-4 py-3 text-sm text-neutral-700 cursor-pointer" onClick={onView}>
                {student.phone || student.father_phone || '—'}
            </td>
            <td className="px-4 py-3 cursor-pointer" onClick={onView}>
                <Badge variant="default" size="sm">N/A</Badge>
            </td>
            <td className="px-4 py-3 cursor-pointer" onClick={onView}>
                <Badge variant={student.status === 'active' ? 'success' : 'default'} size="sm" dot>
                    {student.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
            </td>
            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors">
                            <ChevronDown size={14} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="right">
                        <DropdownMenuItem onClick={onView}><Eye size={14} className="mr-2" /> View Profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={onEdit}><Pencil size={14} className="mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={onFees}><IndianRupee size={14} className="mr-2" /> Fee Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={onAttendance}><CalendarCheck size={14} className="mr-2" /> Attendance</DropdownMenuItem>
                        <DropdownMenuItem onClick={onPrintIdCard}><Printer size={14} className="mr-2" /> Print ID Card</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onDeactivate} className="text-red-600 hover:!bg-red-50">
                            <UserMinus size={14} className="mr-2" /> Deactivate
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </td>
        </tr>
    );
}
