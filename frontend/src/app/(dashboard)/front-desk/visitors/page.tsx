'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Visitor } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

export default function VisitorsPage() {
    const { user } = useAuth();
    const isTeacher = user?.role === 'teacher';
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ visitor_name: '', visitor_phone: '', purpose: 'meeting', whom_to_meet: '', id_type: '', id_number: '', num_persons: 1, vehicle_number: '' });

    const load = useCallback(async () => {
        try {
            const json = await api.getVisitors();
            setVisitors(json.data || []);
        }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to load'); setVisitors([]); }
        setLoading(false);
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await load();
        })();
    }, [load]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const submitData = {
                ...form,
                whom_to_meet: isTeacher ? (user?.name || '') : form.whom_to_meet,
            };
            await api.createVisitor(submitData);
            setShowForm(false);
            setForm({ visitor_name: '', visitor_phone: '', purpose: 'meeting', whom_to_meet: '', id_type: '', id_number: '', num_persons: 1, vehicle_number: '' });
            load();
        }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Operation failed'); }
    };

    const checkout = async (id: number) => {
        try { await api.checkoutVisitor(id); load(); }
        catch (err: unknown) { setError(err instanceof Error ? err.message : 'Operation failed'); }
    };

    return (
        <div className="space-y-8 animate-fade-in p-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Security Concierge</h1>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium">Monitoring school access and visitor verification</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                        Today&apos;s Summary
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-md flex items-center gap-2 ${showForm ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-rose-600/5' : 'bg-[#6c5ce7] text-white hover:bg-[#5b4bd5] shadow-[#6c5ce7]/20 font-bold'
                            }`}
                    >
                        {showForm ? '✕ Close Form' : '➕ Individual Entry'}
                    </button>
                </div>
            </div>

            {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-3 rounded-2xl text-sm font-semibold flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-xs text-rose-600">✕</span>
                {error}
            </div>}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="bg-[#6c5ce7] p-8 rounded-3xl text-white shadow-xl shadow-[#6c5ce7]/10">
                    <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">Active Visitors</p>
                    <p className="text-4xl font-extrabold mt-2 tracking-tighter">{visitors.filter(v => v.status === 'in').length}</p>
                    <p className="text-xs font-medium mt-3 opacity-60 italic">Inside premises now</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Total Check-ins</p>
                    <p className="text-3xl font-extrabold mt-2 text-gray-900">{visitors.length}</p>
                    <p className="text-xs font-medium text-gray-500 mt-2">Cycle: Last 24 hours</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Primary Purpose</p>
                    <p className="text-3xl font-extrabold mt-2 text-gray-900">Meetings</p>
                    <p className="text-xs font-medium text-gray-500 mt-2">64% of visitors</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Security Clearance</p>
                    <p className="text-3xl font-extrabold mt-2 text-emerald-500">100%</p>
                    <p className="text-xs font-medium text-gray-500 mt-2">Verified with Valid ID</p>
                </div>
            </div>

            {showForm && (
                <div className="bg-white p-8 rounded-3xl border border-[#f1f0ff] shadow-xl shadow-[#6c5ce7]/5 animate-fade-in">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-[#f1f0ff] text-[#6c5ce7] flex items-center justify-center text-sm">🎫</span>
                        New Entry Registration
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <div className="space-y-1.5 col-span-1 md:col-span-2">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Full Legal Name</label>
                                <input className="w-full bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4" placeholder="Enter visitor's full name..." required value={form.visitor_name} onChange={e => setForm({ ...form, visitor_name: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Contact Number</label>
                                <input className="w-full bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4" placeholder="+91 00000 00000" required value={form.visitor_phone} onChange={e => setForm({ ...form, visitor_phone: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Purpose of Visit</label>
                                <select className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })}>
                                    <option value="meeting">Official Meeting</option>
                                    <option value="enquiry">Admission Enquiry</option>
                                    <option value="delivery">Courier / Delivery</option>
                                    <option value="official">Institutional Work</option>
                                    <option value="personal">Personal Visit</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Meeting Authorized By</label>
                                <input 
                                    className={`w-full bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4 ${isTeacher ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    placeholder="Principal / Admin..." 
                                    value={isTeacher ? (user?.name || '') : form.whom_to_meet} 
                                    onChange={e => !isTeacher && setForm({ ...form, whom_to_meet: e.target.value })} 
                                    readOnly={isTeacher}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Identification Type</label>
                                <select className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4" value={form.id_type} onChange={e => setForm({ ...form, id_type: e.target.value })}>
                                    <option value="">Choose Document...</option>
                                    <option value="aadhaar">Aadhaar Card</option>
                                    <option value="driving_license">Driving License</option>
                                    <option value="voter_id">Voter ID Card</option>
                                    <option value="passport">Indian Passport</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">ID Number / Reference</label>
                                <input className="w-full bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4" placeholder="X-000-000-000-X" value={form.id_number} onChange={e => setForm({ ...form, id_number: e.target.value })} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Total Persons</label>
                                <input className="w-full bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4" type="number" min={1} value={form.num_persons} onChange={e => setForm({ ...form, num_persons: parseInt(e.target.value) || 1 })} />
                            </div>
                            <div className="space-y-1.5 mr-auto w-full md:col-span-4">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Vehicle Plate Number (Optional)</label>
                                <input className="w-full bg-gray-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-3 px-4 max-w-sm" placeholder="SH-10-AA-XXXX" value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50">Discard Entry</button>
                            <button type="submit" className="px-8 py-2.5 bg-[#6c5ce7] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#6c5ce7]/20 hover:bg-[#5b4bd5] transition-all">Authorize Entry</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Visitor & Contact</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Classification</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Meeting Liaison</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Entrance / Exit</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Current Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? <tr><td colSpan={6} className="px-6 py-12 text-center">
                                <div className="inline-block w-6 h-6 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin"></div>
                            </td></tr>
                                : visitors.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-medium italic">No security logs for today</td></tr>
                                    : visitors.map(v => (
                                        <tr key={v.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900 group-hover:text-[#6c5ce7] transition-colors">{v.visitor_name}</span>
                                                    <span className="text-[11px] text-gray-400 font-bold">{v.visitor_phone}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wide">
                                                    {v.purpose}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-semibold text-gray-700">{v.whom_to_meet || 'General Access'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5 whitespace-nowrap">
                                                        <span className="w-3 h-3 rounded-full bg-[#f1f0ff]0 text-[6px] text-white flex items-center justify-center font-black">IN</span>
                                                        {v.in_time ? new Date(v.in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                                                    </span>
                                                    {v.status === 'out' && (
                                                        <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1.5 whitespace-nowrap">
                                                            <span className="w-3 h-3 rounded-full bg-rose-500 text-[6px] text-white flex items-center justify-center font-black">OUT</span>
                                                            {v.out_time ? new Date(v.out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${v.status === 'in' ? 'bg-[#f1f0ff] text-[#6c5ce7]' : 'bg-gray-100 text-gray-400'
                                                    }`}>
                                                    {v.status === 'in' ? 'Building Access' : 'Departed'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {v.status === 'in' && (
                                                    <button
                                                        onClick={() => checkout(v.id)}
                                                        className="px-4 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-extrabold uppercase tracking-tight rounded-xl hover:bg-rose-100 transition-all border border-rose-100"
                                                    >
                                                        Check Out
                                                    </button>
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
