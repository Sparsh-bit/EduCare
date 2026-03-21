'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/runtimeConfig';
import { authStorage } from '@/lib/authStorage';
import toast from 'react-hot-toast';
import { Trash2, Plus, Calendar } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
};

const API = API_BASE;
const getToken = () => authStorage.getToken() ?? '';
const authHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

interface BoardConfig {
    board_type: string; state_board_name: string; udise_code: string;
    pan_number: string; gstin: string; cce_enabled: boolean;
    fa_weightage: number; sa_weightage: number;
}
interface ExamTerm {
    id: number; term_type: string; term_name: string; max_marks: number;
    weightage_percent: number; start_date: string; end_date: string; status: string;
}
interface ReportCardConfig {
    school_name: string; school_address: string; school_phone: string;
    principal_name: string; affiliation_number: string;
    show_co_scholastic: boolean; show_attendance: boolean; show_remarks: boolean;
}

const TABS = ['Board Setup', 'Exam Terms', 'Report Card Settings'] as const;
type Tab = typeof TABS[number];

export default function BoardPage() {
    const [activeTab, setActiveTab] = useState<Tab>('Board Setup');
    const [loading, setLoading] = useState(false);

    const [boardConfig, setBoardConfig] = useState<BoardConfig>({
        board_type: 'CBSE', state_board_name: '', udise_code: '', pan_number: '',
        gstin: '', cce_enabled: false, fa_weightage: 40, sa_weightage: 60,
    });

    const [terms, setTerms] = useState<ExamTerm[]>([]);
    const [termForm, setTermForm] = useState({
        term_type: 'FA1', term_name: '', max_marks: 100, weightage_percent: 0,
        start_date: '', end_date: '',
    });

    const [rcConfig, setRcConfig] = useState<ReportCardConfig>({
        school_name: '', school_address: '', school_phone: '', principal_name: '',
        affiliation_number: '', show_co_scholastic: true, show_attendance: true, show_remarks: true,
    });

    const loadBoardConfig = useCallback(async () => {
        try {
            const res = await fetch(`${API}/board/config`, { headers: authHeaders() });
            if (res.ok) { const d = await res.json(); if (d.data) setBoardConfig(d.data); }
        } catch { /* ignore */ }
    }, []);

    const loadTerms = useCallback(async () => {
        try {
            const res = await fetch(`${API}/board/terms`, { headers: authHeaders() });
            if (res.ok) { const d = await res.json(); setTerms(d.data || []); }
        } catch { /* ignore */ }
    }, []);

    const loadRcConfig = useCallback(async () => {
        try {
            const res = await fetch(`${API}/board/report-card-config`, { headers: authHeaders() });
            if (res.ok) { const d = await res.json(); if (d.data) setRcConfig(d.data); }
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        if (activeTab === 'Board Setup') loadBoardConfig();
        else if (activeTab === 'Exam Terms') loadTerms();
        else loadRcConfig();
    }, [activeTab, loadBoardConfig, loadTerms, loadRcConfig]);

    const saveBoardConfig = async () => {
        const loadId = toast.loading('Synchronizing Board Configuration...');
        setLoading(true);
        try {
            const res = await fetch(`${API}/board/config`, {
                method: 'POST', headers: authHeaders(), body: JSON.stringify(boardConfig),
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Save failed');
            toast.success('Board protocols updated successfully', { id: loadId });
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Protocol sync failed', { id: loadId }); }
        setLoading(false);
    };

    const addTerm = async () => {
        if (!termForm.term_name || !termForm.start_date || !termForm.end_date) {
            toast.error('Required term parameters missing'); return;
        }
        setLoading(true);
        try {
            const res = await fetch(`${API}/board/terms`, {
                method: 'POST', headers: authHeaders(), body: JSON.stringify(termForm),
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Failed to add term');
            toast.success('Temporal exam term deployed');
            setTermForm({ term_type: 'FA1', term_name: '', max_marks: 100, weightage_percent: 0, start_date: '', end_date: '' });
            loadTerms();
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Deployment failed'); }
        setLoading(false);
    };

    const deleteTerm = async (id: number) => {
        const loadId = toast.loading('Decommissioning Term...');
        setLoading(true);
        try {
            const res = await fetch(`${API}/board/terms/${id}`, { method: 'DELETE', headers: authHeaders() });
            if (!res.ok) throw new Error('Delete failed');
            toast.success('Term deleted from registry', { id: loadId });
            loadTerms();
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Decommissioning failed', { id: loadId }); }
        setLoading(false);
    };

    const saveRcConfig = async () => {
        const loadId = toast.loading('Updating Reporting Standards...');
        setLoading(true);
        try {
            const res = await fetch(`${API}/board/report-card-config`, {
                method: 'POST', headers: authHeaders(), body: JSON.stringify(rcConfig),
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Save failed');
            toast.success('Reporting protocols updated', { id: loadId });
        } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Standard sync failed', { id: loadId }); }
        setLoading(false);
    };

    const inputCls = 'w-full px-6 py-4 bg-gray-50/50 border border-transparent rounded-[20px] text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 outline-none transition-all placeholder:text-gray-300';
    const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2';

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-16"
        >
            {/* Cinematic Header */}
            <motion.div variants={itemVariants}>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg mb-3">
                    <Plus size={12} />
                    System Architecture
                </div>
                <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-none">
                    Institutional Protocol Board
                </h1>
                <p className="text-base text-gray-500 mt-4 font-medium max-w-xl">
                    Define the core academic and administrative frameworks, including examination boards, temporal terms, and reporting standards.
                </p>
            </motion.div>

            {/* Tactical Tabs */}
            <motion.div variants={itemVariants} className="flex items-center gap-2 p-1.5 bg-gray-50/50 border border-gray-100 rounded-[24px] w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-8 py-3.5 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-xl shadow-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        {tab}
                    </button>
                ))}
            </motion.div>

            {/* Board Setup Section */}
            <AnimatePresence mode="wait">
                {activeTab === 'Board Setup' && (
                    <motion.div 
                        key="board-setup"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                    >
                        <div className="lg:col-span-2 bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 space-y-8">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Registry & Board Protocols</h2>
                                <p className="text-sm text-gray-400 font-medium mt-1">Configure the primary academic affiliation and fiscal identification.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Board Classification</label>
                                    <select value={boardConfig.board_type} onChange={e => setBoardConfig({ ...boardConfig, board_type: e.target.value })} className={inputCls}>
                                        <option value="CBSE">CBSE (Central Board)</option>
                                        <option value="ICSE">ICSE (National Board)</option>
                                        <option value="State">State/Regional Board</option>
                                    </select>
                                </div>
                                {boardConfig.board_type === 'State' && (
                                    <div className="space-y-1.5">
                                        <label className={labelCls}>Board Identity</label>
                                        <input type="text" placeholder="Specify state board name" value={boardConfig.state_board_name} onChange={e => setBoardConfig({ ...boardConfig, state_board_name: e.target.value })} className={inputCls} />
                                    </div>
                                )}
                                <div className="space-y-1.5">
                                    <label className={labelCls}>UDISE Unified Code</label>
                                    <input type="text" placeholder="System tracking code" value={boardConfig.udise_code} onChange={e => setBoardConfig({ ...boardConfig, udise_code: e.target.value })} className={inputCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Fiscal PAN Tracking</label>
                                    <input type="text" placeholder="Institutional tax identity" value={boardConfig.pan_number} onChange={e => setBoardConfig({ ...boardConfig, pan_number: e.target.value })} className={inputCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Institutional GSTIN</label>
                                    <input type="text" placeholder="Goods & Services identity" value={boardConfig.gstin} onChange={e => setBoardConfig({ ...boardConfig, gstin: e.target.value })} className={inputCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Formative (FA) Weightage (%)</label>
                                    <input type="number" value={boardConfig.fa_weightage} onChange={e => setBoardConfig({ ...boardConfig, fa_weightage: Number(e.target.value) })} className={inputCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Summative (SA) Weightage (%)</label>
                                    <input type="number" value={boardConfig.sa_weightage} onChange={e => setBoardConfig({ ...boardConfig, sa_weightage: Number(e.target.value) })} className={inputCls} />
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <input type="checkbox" id="cce" checked={boardConfig.cce_enabled} onChange={e => setBoardConfig({ ...boardConfig, cce_enabled: e.target.checked })} className="w-5 h-5 accent-indigo-600 rounded-lg cursor-pointer" />
                                <label htmlFor="cce" className="text-xs font-black text-gray-700 uppercase tracking-widest cursor-pointer leading-tight">Enable CCE Architecture (Continuous Logic)</label>
                            </div>
                            <div className="pt-4">
                                <button onClick={saveBoardConfig} disabled={loading} className="w-full md:w-auto px-10 py-4 bg-gray-900 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-xl shadow-gray-200">
                                    {loading ? 'Synchronizing…' : 'Commit Protocol Changes'}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-8">
                            <div className="bg-indigo-600 rounded-[40px] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                                    <h3 className="text-xl font-black tracking-tight uppercase relative z-10">Protocol Insight</h3>
                                    <p className="text-xs text-indigo-100 mt-4 leading-relaxed font-medium relative z-10">
                                        Changes to the Board Classification and Weightage parameters will impact existing academic calculations. Ensure alignment with institutional directives before committing changes.
                                    </p>
                            </div>
                            <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                        <Plus size={20} />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Institutional Health</p>
                                </div>
                                <p className="text-2xl font-black text-gray-900 tracking-tighter">Compliant</p>
                                <p className="text-xs text-gray-400 font-medium mt-1">Universal academic standards met.</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Exam Terms Section */}
                {activeTab === 'Exam Terms' && (
                    <motion.div 
                        key="exam-terms"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                    >
                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 space-y-8">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Temporal Exam Deployment</h2>
                                <p className="text-sm text-gray-400 font-medium mt-1">Define scheduling windows for formative and summative evaluations.</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Cycle Type</label>
                                    <select value={termForm.term_type} onChange={e => setTermForm({ ...termForm, term_type: e.target.value })} className={inputCls}>
                                        {['FA1', 'FA2', 'SA1', 'SA2', 'ANNUAL', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Deployment Identity</label>
                                    <input type="text" placeholder="e.g. Quarter One" value={termForm.term_name} onChange={e => setTermForm({ ...termForm, term_name: e.target.value })} className={inputCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Standard Marks Limit</label>
                                    <input type="number" value={termForm.max_marks} onChange={e => setTermForm({ ...termForm, max_marks: Number(e.target.value) })} className={inputCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Weightage Quotient (%)</label>
                                    <input type="number" value={termForm.weightage_percent} onChange={e => setTermForm({ ...termForm, weightage_percent: Number(e.target.value) })} className={inputCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Start Protocol</label>
                                    <input type="date" value={termForm.start_date} onChange={e => setTermForm({ ...termForm, start_date: e.target.value })} className={inputCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>End Protocol</label>
                                    <input type="date" value={termForm.end_date} onChange={e => setTermForm({ ...termForm, end_date: e.target.value })} className={inputCls} />
                                </div>
                            </div>
                            <div className="pt-4">
                                <button onClick={addTerm} disabled={loading} className="w-full md:w-auto flex items-center justify-center gap-3 px-10 py-4 bg-indigo-600 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100">
                                    <Plus size={16} />
                                    {loading ? 'Deploying…' : 'Deploy Exam Term'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100">
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Classification</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Identity</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center w-32">Threshold</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-center w-32">Weightage</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Timeline</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-32">Status</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {terms.length === 0 ? (
                                            <tr><td colSpan={7} className="px-8 py-20 text-center opacity-40">
                                                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                                    <Calendar size={28} className="text-gray-300" />
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Temporal registry devoid of entities</p>
                                            </td></tr>
                                        ) : terms.map(term => (
                                            <tr key={term.id} className="hover:bg-indigo-50/30 transition-all duration-300 group/row">
                                                <td className="px-8 py-5">
                                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-100">{term.term_type}</span>
                                                </td>
                                                <td className="px-8 py-5 font-black text-gray-900 tracking-tight uppercase text-sm group-hover/row:text-indigo-600 transition-colors">{term.term_name}</td>
                                                <td className="px-8 py-5 text-gray-500 font-mono text-xs text-center">{term.max_marks}</td>
                                                <td className="px-8 py-5 text-indigo-600 font-black text-xs text-center tracking-tighter">{term.weightage_percent}%</td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-black text-gray-700 tracking-tight">{term.start_date}</span>
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">to {term.end_date}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${term.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${term.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">{term.status || 'Active'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button onClick={() => deleteTerm(term.id)} className="p-2.5 text-gray-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-300 opacity-0 group-hover/row:opacity-100">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Report Card Settings Section */}
                {activeTab === 'Report Card Settings' && (
                    <motion.div 
                        key="report-card-settings"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                    >
                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 space-y-8">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Reporting Identity</h2>
                                <p className="text-sm text-gray-400 font-medium mt-1">Configure automated reporting standards and visual identity.</p>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Institutional Identity (Full Name)</label>
                                    <input type="text" value={rcConfig.school_name} onChange={e => setRcConfig({ ...rcConfig, school_name: e.target.value })} className={inputCls} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={labelCls}>Institutional Physical Address</label>
                                    <textarea rows={2} value={rcConfig.school_address} onChange={e => setRcConfig({ ...rcConfig, school_address: e.target.value })} className={`${inputCls} resize-none`} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-1.5">
                                        <label className={labelCls}>Telemetry Comms (Phone)</label>
                                        <input type="text" value={rcConfig.school_phone} onChange={e => setRcConfig({ ...rcConfig, school_phone: e.target.value })} className={inputCls} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={labelCls}>Executive Authority (Principal)</label>
                                        <input type="text" value={rcConfig.principal_name} onChange={e => setRcConfig({ ...rcConfig, principal_name: e.target.value })} className={inputCls} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={labelCls}>Board Affiliation Code</label>
                                        <input type="text" value={rcConfig.affiliation_number} onChange={e => setRcConfig({ ...rcConfig, affiliation_number: e.target.value })} className={inputCls} />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-4">
                                <button onClick={saveRcConfig} disabled={loading} className="w-full md:w-auto px-10 py-4 bg-gray-900 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-xl shadow-gray-200">
                                    {loading ? 'Updating…' : 'Sync Reporting Standards'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 space-y-8">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Visual Composition</h2>
                                <p className="text-sm text-gray-400 font-medium mt-1">Toggle modular components within the generated report card registry.</p>
                            </div>
                            <div className="space-y-4">
                                {([
                                    ['show_co_scholastic', 'Include Co-Scholastic Analytics Registry', 'Visual assessment data across non-academic vectors.'],
                                    ['show_attendance', 'Include Attendance Surveillance Summary', 'Consolidated monthly presence/absence telemetry.'],
                                    ['show_remarks', 'Include Executive Diagnostic Remarks', 'Direct autoritative commentary on entity development.'],
                                ] as [keyof ReportCardConfig, string, string][]).map(([key, label, sub]) => (
                                    <div key={key} className="flex items-start gap-5 p-6 bg-gray-50 rounded-[32px] border border-gray-100 hover:border-indigo-100 transition-all cursor-pointer group" onClick={() => setRcConfig({ ...rcConfig, [key]: !rcConfig[key] })}>
                                        <div className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${rcConfig[key] ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-300'}`}>
                                            {rcConfig[key] && <Plus size={14} className="text-white rotate-45" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-[11px] font-black uppercase tracking-widest transition-colors ${rcConfig[key] ? 'text-indigo-600' : 'text-gray-500'}`}>{label}</p>
                                            <p className="text-xs text-gray-400 font-medium mt-1 leading-relaxed">{sub}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-8 bg-indigo-50/50 rounded-[32px] border border-indigo-100/50 flex items-center gap-6">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                                    <Plus size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Auto-Generation Engine</p>
                                    <p className="text-sm font-black text-indigo-900 mt-0.5">Dynamic Engine Status: Optimized</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
