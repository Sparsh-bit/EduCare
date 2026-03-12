/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { AdmissionEnquiry } from '@/lib/types';
import { toast } from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
    new: 'bg-blue-50 text-blue-600 border-blue-100',
    contacted: 'bg-amber-50 text-amber-600 border-amber-100',
    follow_up: 'bg-orange-50 text-orange-600 border-orange-100',
    interested: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    not_interested: 'bg-rose-50 text-rose-600 border-rose-100',
    admitted: 'bg-[#f1f0ff] text-[#6c5ce7] border-[#f1f0ff]',
    closed: 'bg-gray-50 text-gray-500 border-gray-100',
};

const SOURCE_OPTIONS = ['walkin', 'phone', 'website', 'referral', 'social_media', 'advertisement', 'other'];
const STATUS_OPTIONS = ['new', 'contacted', 'follow_up', 'interested', 'not_interested', 'admitted', 'closed'];

export default function AdmissionEnquiryPage() {
    const [enquiries, setEnquiries] = useState<AdmissionEnquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [filterStatus, setFilterStatus] = useState('');
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState<Record<string, any> | null>(null);
    const [form, setForm] = useState({
        student_name: '', father_name: '', mother_name: '', contact_phone: '', alternate_phone: '',
        email: '', dob: '', gender: '', class_applying_for: '', source: 'walkin', notes: '',
        address: '', previous_school: '', follow_up_date: '', status: 'new',
    });

    const loadEnquiries = useCallback(async () => {
        try {
            const params: Record<string, string> = {};
            if (filterStatus) params.status = filterStatus;
            if (search) params.search = search;
            const json = await api.getEnquiries(params);
            setEnquiries(json.data || []);
        } catch {
            toast.error('Failed to load enquiries');
        }
        setLoading(false);
    }, [filterStatus, search]);

    const loadStats = useCallback(async () => {
        try {
            const data = await api.getEnquiryStats();
            setStats(data as unknown as Record<string, any>);
        } catch { }
    }, []);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await loadEnquiries();
        })();
    }, [loadEnquiries]);
    useEffect(() => { (async () => { await loadStats(); })(); }, [loadStats]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createEnquiry(form);
            setShowForm(false);
            setForm({ student_name: '', father_name: '', mother_name: '', contact_phone: '', alternate_phone: '', email: '', dob: '', gender: '', class_applying_for: '', source: 'walkin', notes: '', address: '', previous_school: '', follow_up_date: '', status: 'new' });
            loadEnquiries();
            loadStats();
            toast.success('Enquiry captured successfully');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to create enquiry');
        }
    };

    const updateStatus = async (id: number, status: string) => {
        try {
            await api.updateEnquiry(id, { status });
            loadEnquiries();
            loadStats();
            toast.success(`Status updated to ${status}`);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to update status');
        }
    };

    return (
        <div className="p-6 space-y-8 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-[#f1f0ff] flex items-center justify-center text-2xl shadow-sm">🏢</span>
                        Front Desk Enquiry
                    </h1>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium ml-1">Track and manage potential admissions and communication logs</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/front-desk/website-integration"
                        className="flex items-center gap-2 px-5 py-3 border border-[#6c5ce7]/20 text-[#6c5ce7] rounded-2xl text-sm font-bold hover:bg-[#f1f0ff] transition-all"
                    >
                        🌐 Website Integration
                    </Link>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-6 py-3 bg-[#6c5ce7] text-white rounded-2xl text-sm font-bold hover:bg-[#5b4bd5] transition-all shadow-xl shadow-[#6c5ce7]/15"
                    >
                        {showForm ? '✕ Cancel' : '＋ Capture Enquiry'}
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-4 -mt-4" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] relative z-10">Total Database</p>
                    <p className="text-3xl font-black text-gray-900 mt-2 relative z-10">{(stats?.total as number) || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-4 -mt-4" />
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.15em] relative z-10">New Today</p>
                    <p className="text-3xl font-black text-emerald-600 mt-2 relative z-10">{(stats?.today_new as number) || 0}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full -mr-4 -mt-4" />
                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.15em] relative z-10">Pending Followup</p>
                    <p className="text-3xl font-black text-amber-600 mt-2 relative z-10">{(stats?.by_status as Array<Record<string, any>>)?.find((s) => s.status === 'follow_up')?.count as number || 0}</p>
                </div>
                <div className="bg-[#6c5ce7] p-6 rounded-3xl shadow-xl shadow-[#f1f0ff] relative overflow-hidden group hover:bg-[#6c5ce7] transition-all">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] relative z-10">Conversion Rate</p>
                    <p className="text-3xl font-black text-white mt-2 relative z-10">
                        {(stats?.total as number) > 0 ? Math.round((((stats?.by_status as Array<Record<string, any>>)?.find((s) => s.status === 'admitted')?.count as number || 0) / (stats?.total as number)) * 100) : 0}%
                    </p>
                </div>
            </div>

            {/* Entry Form */}
            {showForm && (
                <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-2xl animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-[#6c5ce7]" />
                    <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-[#f1f0ff] flex items-center justify-center text-lg">📝</span>
                        New Admission Enquiry Form
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Student Full Name *</label>
                                <input required className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="Child's Name" value={form.student_name} onChange={e => setForm({ ...form, student_name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Father&apos;s Name *</label>
                                <input required className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="Parent 1" value={form.father_name} onChange={e => setForm({ ...form, father_name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mother&apos;s Name</label>
                                <input className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="Parent 2" value={form.mother_name} onChange={e => setForm({ ...form, mother_name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Primary Phone *</label>
                                <input required className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20" placeholder="+91 ..." value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Leads Source</label>
                                <select className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 capitalize" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                                    {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Followup Date</label>
                                <input type="date" className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20" value={form.follow_up_date} onChange={e => setForm({ ...form, follow_up_date: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Additional Notes</label>
                            <textarea className="w-full px-5 py-4 bg-gray-50 border-0 rounded-3xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 resize-none" rows={3} placeholder="Initial conversation summary..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                        </div>
                        <div className="flex justify-end gap-4 border-t border-gray-50 pt-8">
                            <button type="button" onClick={() => setShowForm(false)} className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Discard</button>
                            <button type="submit" className="px-12 py-4 bg-[#6c5ce7] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-[#6c5ce7]/10 hover:bg-[#5b4bd5] transition-all">Submit Lead</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filter Hub */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
                <div className="relative w-full md:w-96 group">
                    <input className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-0 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 transition-all" placeholder="Filter by name, phone or number..." value={search} onChange={e => setSearch(e.target.value)} />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg filter group-focus-within:drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]">🔍</span>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    {STATUS_OPTIONS.map(s => (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border ${filterStatus === s ? 'bg-[#6c5ce7] text-white border-[#6c5ce7] shadow-lg shadow-[#6c5ce7]/10 scale-105' : 'bg-white text-gray-400 border-gray-100 hover:border-[#f1f0ff]'}`}
                        >
                            {s.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Data Feed */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Prospect</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Guardian Info</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Stage</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Registered</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={4} className="px-8 py-10 animate-pulse bg-gray-50/20" /></tr>)
                            ) : enquiries.length === 0 ? (
                                <tr><td colSpan={4} className="p-24 text-center text-gray-400 italic font-medium">No enquiry records match your current filter</td></tr>
                            ) : enquiries.map(enq => (
                                <tr key={enq.id} className="hover:bg-gray-50 transition-all group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-50 to-[#f1f0ff] flex items-center justify-center font-bold text-[#a29bfe] text-[10px] border border-transparent group-hover:bg-white group-hover:border-[#f1f0ff] group-hover:shadow-sm transition-all">
                                                {enq.enquiry_number?.slice(-3) || 'E'}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm group-hover:text-[#6c5ce7] transition-colors">{enq.student_name}</p>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">#{enq.enquiry_number || 'PENDING'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="text-sm font-semibold text-gray-700">{enq.father_name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-gray-400 font-bold tracking-widest">{enq.contact_phone}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest capitalize">{enq.source?.replace('_', ' ')}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <select
                                            value={enq.status}
                                            onChange={e => updateStatus(enq.id, e.target.value)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter border-2 cursor-pointer transition-all focus:ring-0 ${STATUS_COLORS[enq.status] || 'bg-gray-100'}`}
                                        >
                                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="text-sm font-bold text-gray-700">{new Date(enq.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{new Date(enq.created_at).getFullYear()}</p>
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
