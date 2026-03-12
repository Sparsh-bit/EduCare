'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import type { GatePass } from '@/lib/types';

interface StudentInfo {
    id: number;
    name: string;
    admission_no: string;
    current_roll_no: string;
    sr_no?: string;
    father_name?: string;
    father_phone?: string;
    class_name?: string;
    section_name?: string;
}

export default function GatePassPage() {
    const [passes, setPasses] = useState<GatePass[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [rollInput, setRollInput] = useState('');
    const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const [form, setForm] = useState({ student_id: '', reason: 'parent_request', reason_detail: '', authorized_by: '', pickup_person_name: '', pickup_person_phone: '' });
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const loadPasses = useCallback(async () => {
        try {
            const json = await api.getGatePasses();
            setPasses(json.data || []);
        } catch {
            toast.error('Failed to load gate passes');
        }
        setLoading(false);
    }, []);

    // Auto-lookup student when roll/admission number is typed (debounced 400ms)
    const handleRollInput = (value: string) => {
        setRollInput(value);
        setLookupError('');
        if (!value.trim()) { setStudentInfo(null); setForm(f => ({ ...f, student_id: '' })); return; }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLookupLoading(true);
            try {
                const result = await api.lookupStudentForGatePass(value.trim());
                if (result.data) {
                    const s = result.data as unknown as StudentInfo;
                    setStudentInfo(s);
                    setForm(f => ({ ...f, student_id: String(s.id), pickup_person_name: f.pickup_person_name || s.father_name || '', pickup_person_phone: f.pickup_person_phone || s.father_phone || '' }));
                    setLookupError('');
                } else {
                    setStudentInfo(null);
                    setForm(f => ({ ...f, student_id: '' }));
                    setLookupError('No student found with this roll / admission number');
                }
            } catch {
                setLookupError('Lookup failed');
            } finally {
                setLookupLoading(false);
            }
        }, 400);
    };

    const resetForm = () => {
        setShowForm(false);
        setRollInput('');
        setStudentInfo(null);
        setLookupError('');
        setForm({ student_id: '', reason: 'parent_request', reason_detail: '', authorized_by: '', pickup_person_name: '', pickup_person_phone: '' });
    };

    useEffect(() => {
        (async () => {
            setLoading(true);
            await loadPasses();
        })();
    }, [loadPasses]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.student_id) { toast.error('Please enter a valid roll number to find the student'); return; }
        try {
            await api.createGatePass({ ...form, student_id: parseInt(form.student_id) });
            resetForm();
            loadPasses();
            toast.success('Gate pass issued');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to issue pass');
        }
    };

    const markReturn = async (id: number) => {
        try {
            await api.markGatePassReturn(id);
            loadPasses();
            toast.success('Return recorded');
        } catch {
            toast.error('Failed to record return');
        }
    };

    return (
        <div className="p-6 space-y-8 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-[#f1f0ff] flex items-center justify-center text-2xl shadow-sm">🎫</span>
                        Gate Pass Registry
                    </h1>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium ml-1">Secure student exit and entry tracking with digital authorization</p>
                </div>
                <button
                    onClick={() => showForm ? resetForm() : setShowForm(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#6c5ce7] text-white rounded-2xl text-sm font-bold hover:bg-[#5b4bd5] transition-all shadow-xl shadow-[#6c5ce7]/15"
                >
                    {showForm ? '✕ Cancel' : '＋ Issue New Pass'}
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active (Out)</p>
                    <p className="text-3xl font-black text-amber-500 mt-2">{passes.filter(p => p.status === 'out').length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Today</p>
                    <p className="text-3xl font-black text-gray-900 mt-2">{passes.length}</p>
                </div>
            </div>

            {/* Entry Form */}
            {showForm && (
                <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-2xl animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-amber-500" />
                    <h3 className="text-lg font-black text-gray-900 mb-8 flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-sm">🎫</span>
                        Digital Gate Pass Authorization
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Student Lookup */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Roll No. / Admission No. / SR No. *</label>
                            <div className="relative">
                                <input
                                    className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-amber-500/20 pr-10"
                                    placeholder="Enter roll no., admission no., or SR no."
                                    value={rollInput}
                                    onChange={e => handleRollInput(e.target.value)}
                                    autoComplete="off"
                                />
                                {lookupLoading && (
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-400 text-xs animate-pulse font-bold">Searching…</span>
                                )}
                            </div>
                            {lookupError && <p className="text-xs text-red-500 font-semibold ml-1">{lookupError}</p>}
                            {studentInfo && (
                                <div className="flex items-start gap-4 bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg flex-shrink-0">🎓</div>
                                    <div>
                                        <p className="font-black text-gray-900">{studentInfo.name}</p>
                                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                                            {studentInfo.class_name} {studentInfo.section_name} &nbsp;·&nbsp; Roll: {studentInfo.current_roll_no} &nbsp;·&nbsp; Adm: {studentInfo.admission_no}
                                        </p>
                                        {studentInfo.father_name && <p className="text-[11px] text-gray-400 mt-0.5">Father: {studentInfo.father_name}{studentInfo.father_phone ? ` · ${studentInfo.father_phone}` : ''}</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2" style={{ display: 'none' }} />
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Exit Reason</label>
                                <select className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-amber-500/20" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
                                    <option value="medical">Medical / Health</option>
                                    <option value="parent_request">Parent / Guardian Request</option>
                                    <option value="emergency">Emergency Exit</option>
                                    <option value="official">Official School Work</option>
                                    <option value="other">Other Reason</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Authorized By</label>
                                <input className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-amber-500/20" placeholder="Principal / Class Teacher" value={form.authorized_by} onChange={e => setForm({ ...form, authorized_by: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pickup Person Name</label>
                                <input className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-amber-500/20" placeholder="e.g. Rahul Singh" value={form.pickup_person_name} onChange={e => setForm({ ...form, pickup_person_name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pickup Contact</label>
                                <input className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-amber-500/20" placeholder="+91 ..." value={form.pickup_person_phone} onChange={e => setForm({ ...form, pickup_person_phone: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Specific Remarks</label>
                            <textarea className="w-full px-5 py-4 bg-gray-50 border-0 rounded-3xl text-sm font-semibold focus:ring-2 focus:ring-amber-500/20 resize-none" rows={2} placeholder="Any specific instructions for the exit..." value={form.reason_detail} onChange={e => setForm({ ...form, reason_detail: e.target.value })} />
                        </div>
                        <div className="flex justify-end gap-4 border-t border-gray-50 pt-8">
                            <button type="button" onClick={resetForm} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Abort</button>
                            <button type="submit" className="px-12 py-4 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-100 hover:bg-amber-700 transition-all">Generate & Print Pass</button>
                        </div>
                    </form>
                </div>
            )}

            {/* List Feed */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="p-8 border-b border-gray-50 bg-gray-50/30">
                    <h3 className="font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        Movement History
                        <span className="px-2 py-0.5 rounded-lg bg-[#f1f0ff] text-[#6c5ce7] text-[10px] font-black uppercase tracking-widest">Session 25-26</span>
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Pass #</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Student Identity</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Time Log</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={5} className="px-8 py-10 animate-pulse bg-gray-50/20" /></tr>)
                            ) : passes.length === 0 ? (
                                <tr><td colSpan={5} className="p-24 text-center text-gray-400 italic font-medium">No movement entries found for today</td></tr>
                            ) : passes.map(gp => (
                                <tr key={gp.id} className="hover:bg-gray-50 transition-all group">
                                    <td className="px-8 py-6">
                                        <p className="font-black text-gray-900 font-mono text-xs">{gp.pass_number}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 capitalize">{gp.reason?.replace('_', ' ')}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="font-bold text-gray-900 text-sm group-hover:text-[#6c5ce7] transition-colors">{gp.student_name}</p>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{gp.class_name} • {gp.section_name}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[11px] font-black text-amber-600 uppercase tracking-tighter flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                OUT: {gp.out_time ? new Date(gp.out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--'}
                                            </p>
                                            <p className={`text-[11px] font-black uppercase tracking-tighter flex items-center gap-2 ${gp.actual_return ? 'text-emerald-500' : 'text-gray-300'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${gp.actual_return ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                                                RET: {gp.actual_return ? new Date(gp.actual_return).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'PENDING'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${gp.status === 'out' ? 'bg-amber-50 text-amber-600 shadow-sm shadow-amber-50 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>{gp.status === 'out' ? 'Active' : 'Returned'}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        {gp.status === 'out' ? (
                                            <button onClick={() => markReturn(gp.id)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-50 transition-all">Complete Return</button>
                                        ) : (
                                            <span className="text-gray-300 text-xl">✓</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
