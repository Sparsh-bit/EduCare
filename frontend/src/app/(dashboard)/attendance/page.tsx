'use client';
import { useState, useEffect, useCallback } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Class, Section } from '@/lib/types';

interface AttendanceStudent { id: number; name: string; roll_number?: string; admission_no?: string; current_roll_no?: string; status?: string; }
interface AttendanceApiStudent { id: number; name?: string; admission_no?: string; current_roll_no?: string; status?: string; }

export default function AttendancePage() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [students, setStudents] = useState<AttendanceStudent[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const fetchAttendance = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getClassAttendance(parseInt(selectedClass), parseInt(selectedSection), date);
            const rows = (data.students || []) as AttendanceApiStudent[];
            setStudents(rows.map((s) => ({
                id: s.id,
                name: s.name || '',
                admission_no: s.admission_no,
                current_roll_no: s.current_roll_no,
                status: s.status || undefined,
            })));
        }
        catch (err) { reportApiError(err); } finally { setLoading(false); }
    }, [selectedClass, selectedSection, date]);

    useEffect(() => { api.getClasses().then(setClasses); }, []);
    useEffect(() => { if (selectedClass) api.getSections(parseInt(selectedClass)).then(setSections); }, [selectedClass]);
    useEffect(() => { if (selectedClass && selectedSection && date) void fetchAttendance(); }, [selectedClass, selectedSection, date, fetchAttendance]);

    const toggleStatus = (studentId: number, status: string) => { setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s)); };
    const markAllPresent = () => { setStudents(prev => prev.map(s => ({ ...s, status: 'P' }))); };

    const saveAttendance = async () => {
        setSaving(true); setMessage('');
        try {
            const records = students.filter(s => s.status).map(s => ({ student_id: s.id, status: s.status as 'P' | 'A' | 'L' | 'H', class_id: parseInt(selectedClass), section_id: parseInt(selectedSection), date }));
            if (!records.length) { setMessage('Please mark attendance for at least one student'); return; }
            const result = await api.markAttendance({ date, class_id: parseInt(selectedClass), section_id: parseInt(selectedSection), records });
            setMessage(`✅ ${result.message}`);
        } catch (err: unknown) { setMessage(`❌ ${err instanceof Error ? err.message : 'Failed to save'}`); } finally { setSaving(false); }
    };

    const statusButtons = [
        { value: 'P', label: 'P', active: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
        { value: 'A', label: 'A', active: 'bg-red-50 text-red-600 border-red-200' },
        { value: 'L', label: 'L', active: 'bg-blue-50 text-blue-600 border-blue-200' },
        { value: 'HD', label: 'HD', active: 'bg-amber-50 text-amber-600 border-amber-200' },
    ];
    const present = students.filter(s => s.status === 'P').length;
    const absent = students.filter(s => s.status === 'A').length;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">📋 Attendance</h1>
            <div className="card-glass p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div><label className="text-xs text-gray-500 mb-1 block">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-2 rounded-lg text-sm" /></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Class</label><select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSection(''); }} className="px-3 py-2 rounded-lg text-sm min-w-[120px]"><option value="">Select</option>{classes.map((c) => <option key={c.id} value={c.id}>{String(c.name || '').toLowerCase().startsWith('class') ? c.name : 'Class ' + c.name}</option>)}</select></div>
                    <div><label className="text-xs text-gray-500 mb-1 block">Section</label><select value={selectedSection} onChange={e => setSelectedSection(e.target.value)} className="px-3 py-2 rounded-lg text-sm min-w-[100px]"><option value="">Select</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <button onClick={markAllPresent} className="btn-secondary text-sm py-2">✅ Mark All Present</button>
                </div>
            </div>

            {message && <div className={`rounded-xl px-4 py-3 text-sm ${message.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{message}</div>}

            {loading ? <div className="text-center text-gray-400 py-8">Loading students...</div> : students.length > 0 ? (
                <>
                    <div className="flex gap-4 text-sm">
                        <span className="text-gray-500">Total: <b className="text-gray-900">{students.length}</b></span>
                        <span className="text-emerald-600">Present: <b>{present}</b></span>
                        <span className="text-red-600">Absent: <b>{absent}</b></span>
                    </div>
                    <div className="card-glass overflow-hidden">
                        <table className="data-table"><thead><tr><th>Roll</th><th>Name</th><th>Adm No</th><th>Status</th></tr></thead><tbody>
                            {students.map(s => (
                                <tr key={s.id}>
                                    <td>{s.current_roll_no}</td>
                                    <td className="font-medium text-gray-900">{s.name}</td>
                                    <td className="font-mono text-xs text-gray-400">{s.admission_no}</td>
                                    <td>
                                        <div className="flex gap-1">
                                            {statusButtons.map(btn => (
                                                <button key={btn.value} onClick={() => toggleStatus(s.id, btn.value)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${s.status === btn.value ? btn.active : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
                                                    {btn.label}
                                                </button>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody></table>
                    </div>
                    <button onClick={saveAttendance} disabled={saving} className="btn-primary disabled:opacity-50">{saving ? 'Saving...' : '💾 Save Attendance'}</button>
                </>
            ) : selectedClass && selectedSection ? <div className="text-center text-gray-400 py-8">No students found</div> : null}
        </div>
    );
}
