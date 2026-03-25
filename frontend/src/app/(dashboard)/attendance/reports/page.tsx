'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Class, Section, StudentAttendanceSummary, AttendanceRecord } from '@/lib/types';
import { useEffect } from 'react';
import { AlertTriangle, Printer } from 'lucide-react';

type TabId = 'student' | 'class' | 'summary';

const STATUS_CELL: Record<string, string> = {
    P: 'bg-emerald-100 text-emerald-700',
    A: 'bg-rose-100 text-rose-700',
    L: 'bg-amber-100 text-amber-700',
    H: 'bg-slate-100 text-slate-600',
};

function daysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
    return new Date(year, month - 1, 1).getDay(); // 0=Sun
}

// ─── Student-wise Tab ───────────────────────────────────────────────────────

function StudentWiseTab() {
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [monthYear, setMonthYear] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [summary, setSummary] = useState<StudentAttendanceSummary | null>(null);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(false);

    const doSearch = useCallback(async () => {
        if (!search.trim()) return;
        setLoadingSearch(true);
        try {
            const res = await api.getStudents({ search, limit: 20 });
            setSearchResults(res.data || []);
        } catch (err) {
            reportApiError(err);
        } finally {
            setLoadingSearch(false);
        }
    }, [search]);

    useEffect(() => {
        if (!selectedStudent) return;
        setLoadingSummary(true);
        api.getStudentAttendance(selectedStudent.id, { month: monthYear })
            .then(setSummary)
            .catch(reportApiError)
            .finally(() => setLoadingSummary(false));
    }, [selectedStudent, monthYear]);

    const [year, mon] = monthYear.split('-').map(Number);
    const totalDays = daysInMonth(year, mon);
    const firstDay = firstDayOfMonth(year, mon); // 0=Sun → adjust for Mon-start
    const startOffset = (firstDay + 6) % 7; // Mon=0

    // Build day → status map from recent_records
    const dayStatusMap: Record<number, string> = {};
    (summary?.recent_records ?? []).forEach((r: AttendanceRecord) => {
        const d = new Date(r.date);
        if (d.getFullYear() === year && d.getMonth() + 1 === mon) {
            dayStatusMap[d.getDate()] = r.status;
        }
    });

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === mon;

    const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="space-y-5">
            {/* Search */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h3 className="font-semibold text-slate-900 text-sm">Search Student</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && doSearch()}
                        placeholder="Name or admission number…"
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe]"
                    />
                    <input
                        type="month"
                        value={monthYear}
                        onChange={e => setMonthYear(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe]"
                    />
                    <button
                        onClick={doSearch}
                        disabled={loadingSearch}
                        className="px-4 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-semibold hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors"
                    >
                        {loadingSearch ? 'Searching…' : 'Search'}
                    </button>
                </div>
                {searchResults.length > 0 && !selectedStudent && (
                    <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-50">
                        {searchResults.map(s => (
                            <button
                                key={s.id}
                                onClick={() => { setSelectedStudent(s); setSearchResults([]); }}
                                className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between"
                            >
                                <span className="font-medium text-sm text-slate-900">{s.name}</span>
                                <span className="text-xs text-slate-400">{s.admission_no} · {s.class_name}</span>
                            </button>
                        ))}
                    </div>
                )}
                {selectedStudent && (
                    <div className="flex items-center justify-between bg-[#f1f0ff] rounded-lg px-4 py-2.5">
                        <span className="text-sm font-semibold text-[#6c5ce7]">{selectedStudent.name}</span>
                        <button
                            onClick={() => { setSelectedStudent(null); setSummary(null); }}
                            className="text-xs text-[#a29bfe] hover:text-[#6c5ce7] transition-colors"
                        >
                            Change
                        </button>
                    </div>
                )}
            </div>

            {/* Calendar */}
            {selectedStudent && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-900">
                            {new Date(year, mon - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
                        </h3>
                    </div>

                    {loadingSummary ? (
                        <div className="py-12 flex justify-center">
                            <div className="w-6 h-6 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="p-5 space-y-4">
                            {/* Calendar grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {DOW.map(d => (
                                    <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
                                ))}
                                {Array(startOffset).fill(null).map((_, i) => (
                                    <div key={`blank-${i}`} />
                                ))}
                                {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                                    const status = dayStatusMap[day];
                                    const isFuture = isCurrentMonth && day > today.getDate();
                                    const isToday = isCurrentMonth && day === today.getDate();
                                    return (
                                        <div
                                            key={day}
                                            className={`rounded-lg p-1.5 text-center text-xs font-medium transition-all
                                                ${isToday ? 'ring-2 ring-[#a29bfe]' : ''}
                                                ${isFuture ? 'opacity-30' : ''}
                                                ${status ? STATUS_CELL[status] : 'bg-slate-50 text-slate-300'}
                                            `}
                                        >
                                            <div className="text-[11px] leading-none mb-0.5">{day}</div>
                                            {status && <div className="text-[9px] font-bold leading-none">{status}</div>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Month summary */}
                            {summary && (
                                <>
                                    <div className="grid grid-cols-5 gap-3 pt-2 border-t border-slate-100">
                                        {[
                                            { label: 'Working Days', value: summary.total_days, color: 'text-slate-700' },
                                            { label: 'Present', value: summary.present, color: 'text-emerald-700' },
                                            { label: 'Absent', value: summary.absent, color: 'text-rose-700' },
                                            { label: 'Late', value: summary.late, color: 'text-amber-700' },
                                            { label: 'Percentage', value: `${summary.percentage ?? 0}%`, color: summary.percentage >= 75 ? 'text-emerald-700' : 'text-rose-700' },
                                        ].map(item => (
                                            <div key={item.label} className="text-center">
                                                <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{item.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {summary.percentage < 75 && (
                                        <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-lg p-3">
                                            <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                            <p className="text-sm text-rose-700">
                                                <strong>Below 75% attendance.</strong> This student may not be eligible for exams.
                                                Current: {summary.percentage}%
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Class-wise Monthly Tab ──────────────────────────────────────────────────

function ClassMonthlyTab() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [monthYear, setMonthYear] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.getClasses().then(setClasses).catch(reportApiError);
    }, []);

    useEffect(() => {
        if (selectedClass) {
            api.getSections(parseInt(selectedClass)).then(setSections).catch(reportApiError);
            setSelectedSection('');
        } else {
            setSections([]);
        }
    }, [selectedClass]);

    const loadReport = async () => {
        if (!selectedClass || !selectedSection) return;
        setLoading(true);
        try {
            const res = await api.getMonthlyReport(
                parseInt(selectedClass),
                parseInt(selectedSection),
                monthYear
            );
            setRecords((res as any).data || res || []);
        } catch (err) {
            reportApiError(err);
        } finally {
            setLoading(false);
        }
    };

    const [year, mon] = monthYear.split('-').map(Number);
    const numDays = daysInMonth(year, mon);

    // Build student list and day-status matrix
    const studentMap = new Map<number, { name: string; roll: string; days: Record<number, string> }>();
    records.forEach(r => {
        const day = new Date(r.date).getDate();
        if (!studentMap.has(r.student_id)) {
            studentMap.set(r.student_id, { name: r.student_name ?? `Student #${r.student_id}`, roll: r.roll_no ?? '', days: {} });
        }
        studentMap.get(r.student_id)!.days[day] = r.status;
    });

    const students = Array.from(studentMap.entries())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => (parseInt(a.roll) || 0) - (parseInt(b.roll) || 0));

    // Daily totals
    const dailyPresent: Record<number, number> = {};
    students.forEach(s => {
        Object.entries(s.days).forEach(([day, status]) => {
            if (status === 'P' || status === 'L') {
                dailyPresent[parseInt(day)] = (dailyPresent[parseInt(day)] || 0) + 1;
            }
        });
    });

    const selectCls = 'px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none transition-colors';

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Class *</label>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className={selectCls}>
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Section *</label>
                        <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedClass} className={`${selectCls} disabled:opacity-50`}>
                            <option value="">Select Section</option>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Month *</label>
                        <input type="month" value={monthYear} onChange={e => setMonthYear(e.target.value)} className={selectCls} />
                    </div>
                    <button
                        onClick={loadReport}
                        disabled={!selectedClass || !selectedSection || loading}
                        className="flex items-center gap-2 px-5 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-semibold hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Loading…' : 'Load Report'}
                    </button>
                    {students.length > 0 && (
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors print:hidden"
                        >
                            <Printer size={14} />
                            Print
                        </button>
                    )}
                </div>
            </div>

            {loading && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-12 flex justify-center">
                    <div className="w-6 h-6 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {!loading && students.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden print:border-0 print:shadow-none">
                    <div className="overflow-x-auto">
                        <table className="text-xs text-left min-w-full" style={{ tableLayout: 'fixed' }}>
                            <thead className="bg-slate-50 border-b border-slate-100 print:bg-transparent">
                                <tr>
                                    <th className="sticky left-0 bg-slate-50 px-3 py-2.5 text-slate-500 font-medium w-8 z-10 print:bg-white">#</th>
                                    <th className="sticky left-8 bg-slate-50 px-3 py-2.5 text-slate-500 font-medium min-w-[140px] z-10 print:bg-white">Student</th>
                                    {Array.from({ length: numDays }, (_, i) => i + 1).map(d => (
                                        <th key={d} className="px-1.5 py-2.5 text-slate-500 font-medium text-center w-8">{d}</th>
                                    ))}
                                    <th className="sticky right-0 bg-slate-50 px-3 py-2.5 text-slate-500 font-medium text-center min-w-[80px] z-10 print:bg-white">P / A / %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {students.map((student, idx) => {
                                    const p = Object.values(student.days).filter(s => s === 'P').length;
                                    const a = Object.values(student.days).filter(s => s === 'A').length;
                                    const total = Object.keys(student.days).length;
                                    const pct = total > 0 ? Math.round((p / total) * 100) : 0;
                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="sticky left-0 bg-white px-3 py-2 text-slate-400 font-mono z-10">{idx + 1}</td>
                                            <td className="sticky left-8 bg-white px-3 py-2 font-medium text-slate-900 z-10">
                                                <div className="truncate max-w-[130px]">{student.name}</div>
                                                {student.roll && <div className="text-slate-400 font-mono">{student.roll}</div>}
                                            </td>
                                            {Array.from({ length: numDays }, (_, i) => i + 1).map(day => {
                                                const status = student.days[day];
                                                return (
                                                    <td key={day} className="px-1 py-2 text-center">
                                                        {status ? (
                                                            <span className={`inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-bold ${STATUS_CELL[status] ?? 'bg-slate-100 text-slate-500'}`}>
                                                                {status}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-200">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="sticky right-0 bg-white px-3 py-2 text-center font-semibold z-10">
                                                <span className="text-emerald-700">{p}</span>
                                                <span className="text-slate-300 mx-0.5">/</span>
                                                <span className="text-rose-600">{a}</span>
                                                <span className="text-slate-300 mx-0.5">/</span>
                                                <span className={pct < 75 ? 'text-rose-600' : 'text-slate-700'}>{pct}%</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                <tr>
                                    <td className="sticky left-0 bg-slate-50 px-3 py-2.5 font-semibold text-slate-700 z-10" colSpan={2}>Daily Total (P+L)</td>
                                    {Array.from({ length: numDays }, (_, i) => i + 1).map(d => (
                                        <td key={d} className="px-1 py-2.5 text-center font-semibold text-slate-600">
                                            {dailyPresent[d] ?? 0}
                                        </td>
                                    ))}
                                    <td className="sticky right-0 bg-slate-50 px-3 py-2.5 z-10" />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            <style>{`
                @media print {
                    @page { margin: 0.5cm; size: a4 landscape; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}

// ─── Summary Tab ─────────────────────────────────────────────────────────────

function SummaryTab() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [from, setFrom] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
    const [to, setTo] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        api.getClasses().then(setClasses).catch(reportApiError);
    }, []);

    useEffect(() => {
        if (selectedClass) {
            api.getSections(parseInt(selectedClass)).then(setSections).catch(reportApiError);
            setSelectedSection('');
        } else {
            setSections([]);
        }
    }, [selectedClass]);

    const loadSummary = async () => {
        if (!selectedClass || !selectedSection) return;
        setLoading(true);
        try {
            // Use the month from the "from" date
            const month = from.slice(0, 7);
            const res = await api.getMonthlyReport(
                parseInt(selectedClass),
                parseInt(selectedSection),
                month
            );
            setRecords((res as any).data || res || []);
        } catch (err) {
            reportApiError(err);
        } finally {
            setLoading(false);
        }
    };

    // Aggregate per student
    const studentMap = new Map<number, { name: string; total: number; present: number }>();
    records.forEach(r => {
        const d = r.date;
        if (d >= from && d <= to) {
            if (!studentMap.has(r.student_id)) {
                studentMap.set(r.student_id, { name: r.student_name ?? `#${r.student_id}`, total: 0, present: 0 });
            }
            const s = studentMap.get(r.student_id)!;
            s.total++;
            if (r.status === 'P' || r.status === 'L') s.present++;
        }
    });

    const summaryRows = Array.from(studentMap.entries()).map(([id, v]) => ({
        id,
        name: v.name,
        total: v.total,
        present: v.present,
        pct: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
    })).sort((a, b) => a.pct - b.pct);

    const avgPct = summaryRows.length > 0
        ? Math.round(summaryRows.reduce((acc, r) => acc + r.pct, 0) / summaryRows.length)
        : 0;

    const maxBar = Math.max(...summaryRows.map(r => r.pct), 1);

    const selectCls = 'px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-[#a29bfe] outline-none transition-colors';

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Class *</label>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className={selectCls}>
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Section *</label>
                        <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} disabled={!selectedClass} className={`${selectCls} disabled:opacity-50`}>
                            <option value="">Select Section</option>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">From</label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={selectCls} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">To</label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} className={selectCls} />
                    </div>
                    <button
                        onClick={loadSummary}
                        disabled={!selectedClass || !selectedSection || loading}
                        className="flex items-center gap-2 px-5 py-2 bg-[#6c5ce7] text-white rounded-lg text-sm font-semibold hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors"
                    >
                        {loading ? 'Loading…' : 'Load Summary'}
                    </button>
                </div>
            </div>

            {loading && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm py-12 flex justify-center">
                    <div className="w-6 h-6 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {!loading && summaryRows.length > 0 && (
                <>
                    {/* Bar chart */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-slate-900 text-sm">Attendance % per Student</h3>
                            <span className="text-sm text-slate-500">Avg: <strong className={avgPct < 75 ? 'text-rose-600' : 'text-emerald-600'}>{avgPct}%</strong></span>
                        </div>
                        <div className="space-y-2">
                            {summaryRows.slice(0, 20).map(row => (
                                <div key={row.id} className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500 w-28 truncate shrink-0">{row.name}</span>
                                    <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                                        <div
                                            className={`h-5 rounded-full transition-all ${row.pct < 75 ? 'bg-rose-400' : 'bg-emerald-400'}`}
                                            style={{ width: `${(row.pct / maxBar) * 100}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs font-bold w-10 text-right shrink-0 ${row.pct < 75 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                        {row.pct}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-5 py-3 text-xs font-medium text-slate-500">Student</th>
                                    <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Working Days</th>
                                    <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Present</th>
                                    <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Absent</th>
                                    <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Attendance %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {summaryRows.map(row => (
                                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3 font-medium text-slate-900">
                                            <span className="flex items-center gap-2">
                                                {row.pct < 75 && <AlertTriangle size={13} className="text-rose-500 shrink-0" />}
                                                {row.name}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right text-slate-500">{row.total}</td>
                                        <td className="px-5 py-3 text-right text-emerald-700 font-semibold">{row.present}</td>
                                        <td className="px-5 py-3 text-right text-rose-600 font-semibold">{row.total - row.present}</td>
                                        <td className="px-5 py-3 text-right">
                                            <span className={`font-bold ${row.pct < 75 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                                {row.pct}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
    { id: 'student', label: 'Student-wise' },
    { id: 'class', label: 'Class-wise Monthly' },
    { id: 'summary', label: 'Summary' },
];

export default function AttendanceReportsPage() {
    const [activeTab, setActiveTab] = useState<TabId>('student');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Attendance Reports</h1>
                <p className="text-sm text-slate-500 mt-0.5">View student-wise, class-wise, and summary attendance reports</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            activeTab === tab.id
                                ? 'border-[#6c5ce7] text-[#6c5ce7]'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'student' && <StudentWiseTab />}
            {activeTab === 'class' && <ClassMonthlyTab />}
            {activeTab === 'summary' && <SummaryTab />}
        </div>
    );
}
