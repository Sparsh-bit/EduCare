'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
    ShieldAlert,
    TrendingDown,
    BookOpen,
    ChevronRight,
    Search,
    Filter,
    BellRing,
    CheckCircle2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Class, Section, Student } from '@/lib/types';

type AlertTab = 'financial' | 'attendance' | 'academic';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
};

export default function AlertsPage() {
    const [activeTab, setActiveTab] = useState<AlertTab>('financial');
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [feeAlerts, setFeeAlerts] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [attendanceAlerts, setAttendanceAlerts] = useState<any[]>([]);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [matchingStudents, setMatchingStudents] = useState<Student[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [academicAnalysis, setAcademicAnalysis] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSection, setSelectedSection] = useState<string>('');

    useEffect(() => {
        loadFeeAlerts();
        api.getClasses().then(setClasses).catch(() => setClasses([]));
    }, []);

    const loadFeeAlerts = async () => {
        setLoading(true);
        try { setFeeAlerts(await api.getFeeDelayAlerts()); }
        catch (err) { reportApiError(err); }
        finally { setLoading(false); }
    };

    const runAttendanceScan = async (classId: string, sectionId?: string) => {
        if (!classId) return;
        setLoading(true);
        try {
            const res = await api.getAttendanceRisk(parseInt(classId), sectionId ? parseInt(sectionId) : undefined);
            setAttendanceAlerts(res.students || []);
        } catch (err) { reportApiError(err); toast.error('Failed to load attendance warnings'); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (selectedClass) {
            api.getSections(parseInt(selectedClass)).then(setSections).catch(() => setSections([]));
            runAttendanceScan(selectedClass, selectedSection);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedClass, selectedSection]);

    const handleStudentLookup = async (val: string) => {
        setStudentSearch(val);
        if (val.length > 2) {
            try { const res = await api.getStudents({ search: val, limit: 5 }); setMatchingStudents(res.data); }
            catch { setMatchingStudents([]); }
        } else { setMatchingStudents([]); }
    };

    const loadAcademicAlerts = async (student: Student) => {
        setSelectedStudent(student);
        setMatchingStudents([]);
        setStudentSearch(student.name);
        setAnalyzing(true);
        try { setAcademicAnalysis(await api.getWeakSubjects(student.id)); }
        catch (err) { reportApiError(err); toast.error('Failed to load academic alerts'); }
        finally { setAnalyzing(false); }
    };

    const critical = feeAlerts?.alerts?.filter((a: { severity: string }) => a.severity === 'critical').length || 0;
    const high = feeAlerts?.alerts?.filter((a: { severity: string }) => a.severity === 'high').length || 0;
    const medium = feeAlerts?.alerts?.filter((a: { severity: string }) => a.severity === 'medium').length || 0;

    return (
        <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="show" 
            className="space-y-8 pb-16"
        >
            {/* Cinematic Header */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg mb-3">
                        <ShieldAlert size={12} />
                        Surveillance Hub
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-none">
                        Intelligence & Alerts
                    </h1>
                    <p className="text-base text-gray-500 mt-4 font-medium max-w-xl">
                        A centralized diagnostic environment for real-time monitoring of financial risks, attendance anomalies, and academic development.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-6 py-4 bg-white border border-gray-100 rounded-[28px] shadow-sm">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                            <BellRing size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mt-0.5">Active Alerts</p>
                            <p className="text-lg font-black text-gray-900 mt-1">{feeAlerts?.total_alerts || 0}</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Content Tabs */}
            <motion.div variants={itemVariants} className="flex items-center gap-2 p-1.5 bg-gray-50/50 border border-gray-100 rounded-[28px] w-fit">
                {[
                    { id: 'financial', label: 'Fiscal Risk', icon: ShieldAlert },
                    { id: 'attendance', label: 'Attendance Surveillance', icon: TrendingDown },
                    { id: 'academic', label: 'Academic Prediction', icon: BookOpen },
                ].map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as AlertTab)}
                        className={`flex items-center gap-3 px-8 py-3.5 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-white text-indigo-600 shadow-xl shadow-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </motion.div>

            <AnimatePresence mode="wait">
                {activeTab === 'financial' && (
                    <motion.div
                        key="financial"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-8"
                    >
                        {/* Fiscal Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { label: 'Critical Overdue', count: critical, color: 'rose', sub: 'Immediate recovery required' },
                                { label: 'High Risk', count: high, color: 'amber', sub: '15+ days past schedule' },
                                { label: 'Medium Risk', count: medium, color: 'indigo', sub: '7+ days past schedule' },
                            ].map(s => (
                                <div key={s.label} className={`relative overflow-hidden bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm group`}>
                                    <div className={`absolute top-0 right-0 w-24 h-24 bg-${s.color}-50 rounded-full blur-3xl -mr-12 -mt-12 opacity-50 transition-transform group-hover:scale-150 duration-700`} />
                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className={`w-10 h-10 rounded-xl bg-${s.color}-50 text-${s.color}-600 flex items-center justify-center mb-6`}>
                                            <ShieldAlert size={20} />
                                        </div>
                                        <p className={`text-4xl font-black text-gray-900 leading-none tracking-tight`}>{s.count}</p>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-4">{s.label}</p>
                                        <p className="text-[10px] text-gray-500 font-medium mt-1 opacity-60 leading-relaxed font-mono">{s.sub}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading ? (
                                [...Array(6)].map((_, i) => <LoadingCard key={i} />)
                            ) : feeAlerts?.alerts?.length > 0 ? (
                                feeAlerts.alerts.map((alert: any, i: number) => (
                                    <AlertCard
                                        key={i}
                                        title={alert.student_name}
                                        subtitle={`Cycle #${alert.installment_no} • ${alert.class_name}`}
                                        metric={`₹${alert.amount}`}
                                        metricLabel="Overdue Quantum"
                                        severity={alert.severity}
                                        detail={`${alert.days_overdue} days past protocol limit`}
                                        icon={ShieldAlert}
                                    />
                                ))
                            ) : (
                                <EmptyState message="All fiscal protocols within scheduled parameters." note="No active financial anomalies detected in the current cluster." />
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'attendance' && (
                    <motion.div
                        key="attendance"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-8"
                    >
                        <div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                            <div className="flex items-center gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Class Hub</label>
                                    <select 
                                        value={selectedClass} 
                                        onChange={e => setSelectedClass(e.target.value)}
                                        className="w-full lg:w-48 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-sm font-black text-gray-900 focus:bg-white focus:border-indigo-100 transition-all outline-none appearance-none"
                                    >
                                        <option value="">Select Target</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Sector Unit</label>
                                    <select 
                                        value={selectedSection} 
                                        onChange={e => setSelectedSection(e.target.value)} 
                                        disabled={!selectedClass}
                                        className="w-full lg:w-48 bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-sm font-black text-gray-900 focus:bg-white focus:border-indigo-100 transition-all outline-none appearance-none disabled:opacity-40"
                                    >
                                        <option value="">All Sectors</option>
                                        {sections.map(s => <option key={s.id} value={s.id}>Sector {s.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            {selectedClass && !loading && (
                                <div className="px-8 py-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3">
                                    <ShieldAlert size={18} className="text-rose-600" />
                                    <span className="text-sm font-black text-rose-700 uppercase tracking-widest">
                                        {attendanceAlerts.length} Entities at critical risk
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {loading && selectedClass ? (
                                [...Array(6)].map((_, i) => <LoadingCard key={i} />)
                            ) : !selectedClass ? (
                                <div className="col-span-full py-32 flex flex-col items-center justify-center text-center opacity-40">
                                    <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center mb-8 border border-gray-100">
                                        <Filter size={40} className="text-gray-300" />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] max-w-xs">Initialize class target to begin attendance surveillance scan.</p>
                                </div>
                            ) : attendanceAlerts.length > 0 ? (
                                attendanceAlerts.map((alert: any, i: number) => (
                                    <AlertCard
                                        key={i}
                                        title={alert.name}
                                        subtitle={`Adm: ${alert.admission_no} • Roll: ${alert.current_roll_no}`}
                                        metric={`${alert.percentage}%`}
                                        metricLabel="Surveillance Level"
                                        severity={alert.percentage < 75 ? 'critical' : 'warning'}
                                        detail={alert.message}
                                        icon={TrendingDown}
                                    />
                                ))
                            ) : (
                                <EmptyState message="All entities maintaining optimal attendance protocol." note="No critical surveillance gaps discovered in the current targeting." />
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'academic' && (
                    <motion.div
                        key="academic"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-8"
                    >
                        <div className="relative max-w-2xl group mx-auto">
                            <Search size={22} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Scan Entity Name for Academic Prediction Analysis…"
                                value={studentSearch}
                                onChange={e => handleStudentLookup(e.target.value)}
                                className="w-full pl-16 pr-8 py-6 bg-white border border-gray-100 rounded-[32px] text-sm font-black uppercase tracking-widest transition-all outline-none focus:ring-1 focus:ring-indigo-100 shadow-xl shadow-gray-100 placeholder:text-gray-200"
                            />
                            <AnimatePresence>
                                {matchingStudents.length > 0 && (
                                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                                        className="absolute inset-x-0 top-full mt-4 bg-white border border-gray-100 rounded-[32px] shadow-2xl z-50 overflow-hidden"
                                    >
                                        {matchingStudents.map(s => (
                                            <button key={s.id} onClick={() => loadAcademicAlerts(s)}
                                                className="w-full px-8 py-5 flex items-center justify-between hover:bg-indigo-50/50 transition-all text-left border-b border-gray-50 last:border-0 group/item"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center font-black text-xs text-gray-400 group-hover/item:bg-indigo-600 group-hover/item:text-white transition-all">
                                                        {s.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 group-hover/item:text-indigo-600 transition-colors uppercase">{s.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-0.5">{s.class_name} • ADM {s.admission_no}</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={18} className="text-gray-200 group-hover/item:text-indigo-600 group-hover/item:translate-x-1 transition-all" />
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {analyzing ? (
                            <div className="py-32 flex flex-col items-center justify-center gap-6 opacity-40">
                                <div className="w-16 h-16 border-[4px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Executing Predictive Algorithms…</p>
                            </div>
                        ) : academicAnalysis ? (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                                <div className="bg-white rounded-[40px] border border-gray-100 p-10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 group-hover:scale-125 transition-transform duration-1000" />
                                    <div className="relative z-10">
                                        <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">{selectedStudent?.name}</h3>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mt-2 group-hover:text-indigo-600 transition-colors">{selectedStudent?.class_name} • Intelligence Registry ADM {selectedStudent?.admission_no}</p>
                                    </div>
                                    <div className="relative z-10 flex items-center gap-10">
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Fragility Vector</p>
                                            <p className="text-4xl font-black text-amber-500 mt-2 tracking-tighter">{academicAnalysis.total_alerts}</p>
                                        </div>
                                        <div className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border ${academicAnalysis.total_alerts > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                            {academicAnalysis.total_alerts > 0 ? 'Intervention Protocol Active' : 'Optimal Trajectory'}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {academicAnalysis.weak_subjects.length > 0 ? (
                                        academicAnalysis.weak_subjects.map((sub: any, i: number) => (
                                            <AlertCard 
                                                key={i} 
                                                title={sub.subject} 
                                                subtitle="Sub-optimal performance trajectory"
                                                metric={`${sub.avg_percentage}%`} 
                                                metricLabel="Mean Performance Quotient"
                                                severity={sub.severity} 
                                                detail={sub.message} 
                                                icon={TrendingDown} 
                                            />
                                        ))
                                    ) : (
                                        <EmptyState message="All academic metrics maintaining institutional standards." note="No performance fragility detected in any subject vectors." />
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="py-32 flex flex-col items-center justify-center text-center opacity-40">
                                <div className="w-24 h-24 bg-gray-50 rounded-[32px] flex items-center justify-center mb-8 border border-gray-100">
                                    <BookOpen size={40} className="text-gray-300" />
                                </div>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] max-w-xs">Initialize entity target to begin predictive performance analysis.</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function AlertCard({ title, subtitle, metric, metricLabel, severity, detail, icon: Icon }: {
    title: string; subtitle: string; metric: string; metricLabel: string;
    severity: string; detail: string; icon: React.ElementType;
}) {
    const styles: Record<string, { badge: string; metric: string; iconBg: string; border: string }> = {
        critical: { badge: 'bg-rose-50 text-rose-700 border-rose-200', metric: 'text-rose-600', iconBg: 'bg-rose-50 text-rose-600', border: 'hover:border-rose-100' },
        high:     { badge: 'bg-amber-50 text-amber-700 border-amber-200', metric: 'text-amber-600', iconBg: 'bg-amber-50 text-amber-600', border: 'hover:border-amber-100' },
        warning:  { badge: 'bg-amber-50 text-amber-700 border-amber-200', metric: 'text-amber-600', iconBg: 'bg-amber-50 text-amber-600', border: 'hover:border-amber-100' },
        medium:   { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200', metric: 'text-indigo-600', iconBg: 'bg-indigo-50 text-indigo-600', border: 'hover:border-indigo-100' },
    };
    const s = styles[severity] || styles.medium;

    return (
        <motion.div variants={itemVariants} className={`bg-white rounded-[32px] border border-gray-50 p-6 shadow-sm ${s.border} transition-all duration-300 flex flex-col gap-6 group hover:shadow-xl hover:shadow-gray-100`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-gray-900 truncate uppercase group-hover:text-indigo-600 transition-colors">{title}</h3>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1 truncate opacity-60 leading-none">{subtitle}</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-sm ${s.badge}`}>{severity}</div>
            </div>
            <div className="bg-gray-50/50 rounded-[24px] p-6 text-center border border-gray-50 group-hover:bg-white group-hover:border-indigo-50 transition-all duration-500">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-3">{metricLabel}</p>
                <p className={`text-4xl font-black tracking-tighter ${s.metric}`}>{metric}</p>
            </div>
            <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-inner ${s.iconBg}`}><Icon size={18} /></div>
                <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest opacity-40 leading-none mt-1">Diagnostic Context:</p>
                    <p className="text-xs text-gray-600 font-medium leading-relaxed mt-1.5">{detail}</p>
                </div>
            </div>
        </motion.div>
    );
}

function LoadingCard() {
    return (
        <div className="bg-white rounded-[32px] border border-gray-50 p-6 space-y-6 animate-pulse shadow-sm">
            <div className="flex justify-between items-start">
                <div className="space-y-2.5">
                    <div className="h-5 w-40 bg-gray-100 rounded-lg" />
                    <div className="h-3 w-28 bg-gray-50 rounded" />
                </div>
                <div className="h-7 w-20 bg-gray-100 rounded-full" />
            </div>
            <div className="h-24 bg-gray-50 rounded-[24px]" />
            <div className="flex gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                <div className="flex-1 space-y-2.5">
                    <div className="h-3 w-3/4 bg-gray-100 rounded-lg" />
                    <div className="h-3 w-1/2 bg-gray-50 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

function EmptyState({ message, note }: { message: string; note: string }) {
    return (
        <div className="col-span-full py-40 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-emerald-50 rounded-[40px] flex items-center justify-center mb-8 border border-emerald-100 shadow-xl shadow-emerald-50 ring-4 ring-emerald-50/50">
                <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
            <p className="text-xl font-black text-gray-900 tracking-tight uppercase">{message}</p>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-3 opacity-60 max-w-sm leading-relaxed">{note}</p>
        </div>
    );
}
