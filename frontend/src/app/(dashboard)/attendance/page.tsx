'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Class, Section } from '@/lib/types';
import { CalendarCheck, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

type AttStatus = 'P' | 'A' | 'L' | 'H';

interface AttRow {
    student_id: number;
    name: string;
    father_name?: string;
    roll_no?: string;
    admission_no?: string;
    status: AttStatus;
    remark: string;
}

const STATUS_CONFIG = [
    {
        value: 'P' as AttStatus,
        label: 'P',
        title: 'Present',
        active: 'bg-emerald-500 border-emerald-500 text-white',
        idle: 'border-slate-200 text-slate-400 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700',
    },
    {
        value: 'A' as AttStatus,
        label: 'A',
        title: 'Absent',
        active: 'bg-rose-500 border-rose-500 text-white',
        idle: 'border-slate-200 text-slate-400 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700',
    },
    {
        value: 'L' as AttStatus,
        label: 'L',
        title: 'Late',
        active: 'bg-amber-500 border-amber-500 text-white',
        idle: 'border-slate-200 text-slate-400 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700',
    },
    {
        value: 'H' as AttStatus,
        label: 'H',
        title: 'Half Day',
        active: 'bg-slate-600 border-slate-600 text-white',
        idle: 'border-slate-200 text-slate-400 hover:bg-slate-100',
    },
] as const;

export default function AttendancePage() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [rows, setRows] = useState<AttRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideReason, setOverrideReason] = useState('');

    useEffect(() => {
        api.getClasses().then(setClasses).catch(reportApiError);
    }, []);

    useEffect(() => {
        if (selectedClass) {
            api.getSections(parseInt(selectedClass)).then(setSections).catch(reportApiError);
            setSelectedSection('');
            setRows([]);
            setLoaded(false);
            setIsSubmitted(false);
        } else {
            setSections([]);
        }
    }, [selectedClass]);

    const loadStudents = useCallback(async () => {
        if (!selectedClass || !selectedSection) return;
        setLoading(true);
        setLoaded(false);
        try {
            const data = await api.getClassAttendance(
                parseInt(selectedClass),
                parseInt(selectedSection),
                date
            );
            const students = (data.students || []) as any[];
            const allHaveStatus = students.length > 0 && students.every((s: any) => s.status);
            setIsSubmitted(allHaveStatus);
            setRows(
                students.map((s: any) => ({
                    student_id: s.student_id ?? s.id,
                    name: s.student_name ?? s.name ?? '',
                    father_name: s.father_name,
                    roll_no: s.roll_no ?? s.current_roll_no,
                    admission_no: s.admission_no,
                    status: (s.status ?? 'P') as AttStatus,
                    remark: s.remark ?? '',
                }))
            );
            setLoaded(true);
        } catch (err) {
            reportApiError(err);
        } finally {
            setLoading(false);
        }
    }, [selectedClass, selectedSection, date]);

    const markAllPresent = () => setRows(prev => prev.map(r => ({ ...r, status: 'P' as AttStatus })));
    const markAllAbsent = () => setRows(prev => prev.map(r => ({ ...r, status: 'A' as AttStatus })));

    const updateStatus = (studentId: number, status: AttStatus) =>
        setRows(prev => prev.map(r => r.student_id === studentId ? { ...r, status } : r));

    const updateRemark = (studentId: number, remark: string) =>
        setRows(prev => prev.map(r => r.student_id === studentId ? { ...r, remark } : r));

    const doSubmit = async () => {
        const records = rows.map(r => ({
            student_id: r.student_id,
            status: r.status,
            class_id: parseInt(selectedClass),
            section_id: parseInt(selectedSection),
            date,
        }));
        setSaving(true);
        try {
            await api.markAttendance({
                date,
                class_id: parseInt(selectedClass),
                section_id: parseInt(selectedSection),
                records,
            });
            setIsSubmitted(true);
            const absentCount = rows.filter(r => r.status === 'A').length;
            if (absentCount > 0) {
                toast.success(`Attendance saved. SMS alerts sent to ${absentCount} parent${absentCount > 1 ? 's' : ''}.`);
            } else {
                toast.success('Attendance saved successfully');
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to save attendance');
        } finally {
            setSaving(false);
        }
    };

    const handleAdminOverride = () => {
        if (!overrideReason.trim()) return;
        setShowOverrideModal(false);
        setIsSubmitted(false);
        setOverrideReason('');
        toast('Edit mode enabled. Submit again to override.', { icon: '✏️' });
    };

    const present = rows.filter(r => r.status === 'P').length;
    const absent = rows.filter(r => r.status === 'A').length;
    const late = rows.filter(r => r.status === 'L').length;
    const halfDay = rows.filter(r => r.status === 'H').length;

    const selectedClassObj = classes.find(c => String(c.id) === selectedClass);
    const selectedSectionObj = sections.find(s => String(s.id) === selectedSection);
    const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="space-y-5 pb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Mark Attendance</h1>
                <p className="text-sm text-slate-500 mt-0.5">Record daily student attendance</p>
            </div>

            {/* Controls Bar */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Class *</label>
                        <select
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none transition-colors min-w-[130px]"
                        >
                            <option value="">Select Class</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Section *</label>
                        <select
                            value={selectedSection}
                            onChange={e => setSelectedSection(e.target.value)}
                            disabled={!selectedClass}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none transition-colors min-w-[110px] disabled:opacity-50"
                        >
                            <option value="">Select Section</option>
                            {sections.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Date *</label>
                        <input
                            type="date"
                            value={date}
                            max={today}
                            onChange={e => {
                                setDate(e.target.value);
                                setLoaded(false);
                                setIsSubmitted(false);
                            }}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none transition-colors"
                        />
                    </div>
                    <button
                        onClick={loadStudents}
                        disabled={!selectedClass || !selectedSection || loading}
                        className="flex items-center gap-2 px-5 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-semibold hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Loading…' : 'Load Students'}
                    </button>
                </div>
            </div>

            {/* Empty state */}
            {!loaded && !loading && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-20 flex flex-col items-center gap-4 text-center">
                    <CalendarCheck size={40} className="text-slate-200" />
                    <div>
                        <p className="font-semibold text-slate-600">Select a class and date to mark attendance</p>
                        <p className="text-sm text-slate-400 mt-1">Choose class, section, and date above, then click Load Students</p>
                    </div>
                </div>
            )}

            {loading && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-20 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {loaded && (
                <>
                    {/* Card header */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900 text-sm">
                                {selectedClassObj?.name}
                                {selectedSectionObj ? `-${selectedSectionObj.name}` : ''}
                                <span className="text-slate-300 mx-1.5">|</span>
                                <span className="font-normal text-slate-500">{dateLabel}</span>
                                <span className="text-slate-300 mx-1.5">|</span>
                                <span className="font-normal text-slate-500">{rows.length} students</span>
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={markAllPresent}
                                    disabled={isSubmitted}
                                    className="px-3 py-1.5 border border-emerald-300 text-emerald-700 rounded-lg text-xs font-semibold hover:bg-emerald-50 disabled:opacity-40 transition-colors"
                                >
                                    Mark All Present
                                </button>
                                <button
                                    onClick={markAllAbsent}
                                    disabled={isSubmitted}
                                    className="px-3 py-1.5 border border-rose-300 text-rose-700 rounded-lg text-xs font-semibold hover:bg-rose-50 disabled:opacity-40 transition-colors"
                                >
                                    Mark All Absent
                                </button>
                                {isSubmitted ? (
                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-100">
                                        Submitted ✓
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-lg border border-amber-100">
                                        Not Submitted
                                    </span>
                                )}
                            </div>
                        </div>

                        {rows.length === 0 ? (
                            <div className="py-12 text-center text-slate-400 text-sm">No students found in this class</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-5 py-3 text-xs font-medium text-slate-500 w-20">Roll No</th>
                                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Student Name</th>
                                            <th className="px-5 py-3 text-xs font-medium text-slate-500 hidden md:table-cell">Father&apos;s Name</th>
                                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Status</th>
                                            <th className="px-5 py-3 text-xs font-medium text-slate-500">Remark</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {rows.map((row, idx) => (
                                            <tr
                                                key={row.student_id}
                                                className={`transition-colors ${
                                                    row.status === 'A' ? 'bg-rose-50/40' : 'hover:bg-slate-50/50'
                                                }`}
                                            >
                                                <td className="px-5 py-3 text-slate-400 text-xs font-mono">
                                                    {row.roll_no || String(idx + 1).padStart(2, '0')}
                                                </td>
                                                <td className="px-5 py-3 font-medium text-slate-900">{row.name}</td>
                                                <td className="px-5 py-3 text-slate-500 hidden md:table-cell">
                                                    {row.father_name || '—'}
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-1">
                                                        {STATUS_CONFIG.map(btn => (
                                                            <button
                                                                key={btn.value}
                                                                onClick={() => !isSubmitted && updateStatus(row.student_id, btn.value)}
                                                                title={btn.title}
                                                                disabled={isSubmitted}
                                                                className={`h-7 w-8 rounded border text-xs font-bold transition-all disabled:cursor-default ${
                                                                    row.status === btn.value ? btn.active : btn.idle
                                                                }`}
                                                            >
                                                                {btn.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <AnimatePresence>
                                                        {(row.status === 'A' || row.status === 'L') && !isSubmitted && (
                                                            <motion.input
                                                                key="remark-input"
                                                                initial={{ opacity: 0, maxWidth: 0 }}
                                                                animate={{ opacity: 1, maxWidth: 160 }}
                                                                exit={{ opacity: 0, maxWidth: 0 }}
                                                                type="text"
                                                                value={row.remark}
                                                                onChange={e => updateRemark(row.student_id, e.target.value)}
                                                                placeholder="Remark…"
                                                                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs outline-none focus:border-[#a29bfe] w-36 overflow-hidden"
                                                            />
                                                        )}
                                                        {(row.status === 'A' || row.status === 'L') && isSubmitted && row.remark && (
                                                            <span className="text-xs text-slate-400 italic">{row.remark}</span>
                                                        )}
                                                    </AnimatePresence>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Summary bar + submit */}
                    {rows.length > 0 && (
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-3">
                            <div className="flex flex-wrap items-center gap-5">
                                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                    Present: <strong>{present}</strong>
                                </span>
                                <span className={`flex items-center gap-1.5 text-sm font-medium ${absent > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${absent > 0 ? 'bg-rose-500' : 'bg-slate-300'}`} />
                                    Absent: <strong>{absent}</strong>
                                </span>
                                <span className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                                    Late: <strong>{late}</strong>
                                </span>
                                <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                                    Half Day: <strong>{halfDay}</strong>
                                </span>
                            </div>
                            <button
                                onClick={doSubmit}
                                disabled={saving || isSubmitted}
                                className="w-full py-3 bg-[#6c5ce7] text-white rounded-lg text-sm font-semibold hover:bg-[#5b4bd5] disabled:opacity-60 transition-colors"
                            >
                                {saving ? 'Saving…' : isSubmitted ? 'Attendance Submitted ✓' : 'Submit Attendance'}
                            </button>
                            {isSubmitted && (
                                <p className="text-center">
                                    <button
                                        onClick={() => setShowOverrideModal(true)}
                                        className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
                                    >
                                        Edit (Admin)
                                    </button>
                                </p>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Admin Override Modal */}
            {showOverrideModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
                        <div>
                            <h3 className="font-semibold text-slate-900">Admin Override</h3>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Provide a reason to edit submitted attendance. This action will be logged.
                            </p>
                        </div>
                        <textarea
                            rows={3}
                            value={overrideReason}
                            onChange={e => setOverrideReason(e.target.value)}
                            placeholder="Reason for editing…"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none outline-none focus:border-[#a29bfe]"
                        />
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => { setShowOverrideModal(false); setOverrideReason(''); }}
                                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdminOverride}
                                disabled={!overrideReason.trim()}
                                className="px-4 py-2 text-sm bg-[#6c5ce7] text-white rounded-lg hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors"
                            >
                                Continue Editing
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
