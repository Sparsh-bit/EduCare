'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { api, reportApiError } from '@/lib/api';
import type { Notice, Class, Section } from '@/lib/types';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BookOpen, Eye, Trash2, Send, X } from 'lucide-react';

type TabId = 'notices' | 'homework';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

const PRIORITY_BADGE: Record<string, string> = {
    urgent: 'bg-rose-50 text-rose-700 border-rose-100',
    important: 'bg-amber-50 text-amber-700 border-amber-100',
    normal: 'bg-slate-100 text-slate-500 border-slate-200',
};

const AUDIENCE_COLORS: Record<string, string> = {
    all: 'bg-[#f1f0ff] text-[#6c5ce7] border-[#a29bfe]/20',
    students: 'bg-blue-50 text-blue-700 border-blue-200',
    staff: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    parents: 'bg-amber-50 text-amber-700 border-amber-200',
};

const AUDIENCE_LABELS: Record<string, string> = {
    all: 'Everyone', students: 'Students', staff: 'Staff', parents: 'Parents',
};

// ─── Notices Tab ──────────────────────────────────────────────────────────────

function NoticesTab() {
    const [notices, setNotices] = useState<(Notice & { created_by_name?: string; priority?: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ title: '', content: '', target_audience: 'all', priority: 'normal', class_id: '' });
    const [saving, setSaving] = useState(false);
    const [filterPriority, setFilterPriority] = useState('all');
    const [viewNotice, setViewNotice] = useState<any | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getNotices();
            setNotices((data as any)?.notices || (data as any) || []);
        } catch (err) {
            reportApiError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const postNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.createNotice({
                title: form.title,
                content: form.content,
                target_audience: form.target_audience,
                class_id: form.class_id ? parseInt(form.class_id) : undefined,
                ...(form.priority !== 'normal' ? { priority: form.priority } as any : {}),
            });
            setForm({ title: '', content: '', target_audience: 'all', priority: 'normal', class_id: '' });
            toast.success('Notice posted successfully');
            load();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to post notice');
        } finally {
            setSaving(false);
        }
    };

    const deleteNotice = async (id: number) => {
        try {
            await api.deleteNotice(id);
            toast.success('Notice deleted');
            setConfirmDelete(null);
            load();
        } catch {
            toast.error('Failed to delete notice');
        }
    };

    const filtered = notices.filter(n =>
        filterPriority === 'all' || (n as any).priority === filterPriority
    );

    const inputCls = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Post Notice Form */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div>
                    <h3 className="font-semibold text-slate-900">Post Notice</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Broadcast to staff, students, or parents</p>
                </div>
                <form onSubmit={postNotice} className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Title *</label>
                        <input
                            required
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            className={inputCls}
                            placeholder="Notice title"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Content *</label>
                        <textarea
                            required
                            rows={5}
                            value={form.content}
                            onChange={e => setForm({ ...form, content: e.target.value })}
                            className={`${inputCls} resize-none`}
                            placeholder="Notice content…"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Target Audience</label>
                        <select value={form.target_audience} onChange={e => setForm({ ...form, target_audience: e.target.value })} className={inputCls}>
                            <option value="all">All</option>
                            <option value="teachers">Teachers</option>
                            <option value="parents">Parents</option>
                            <option value="students">Students</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Priority</label>
                        <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                            <option value="normal">Normal</option>
                            <option value="important">Important</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#6c5ce7] text-white rounded-lg text-sm font-semibold hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors"
                    >
                        <Send size={14} />
                        {saving ? 'Posting…' : 'Post Notice'}
                    </button>
                </form>
            </div>

            {/* Notice Feed */}
            <div className="lg:col-span-2 space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    {['all', 'normal', 'important', 'urgent'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterPriority(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                                filterPriority === f
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                        >
                            {f === 'all' ? 'All' : f}
                        </button>
                    ))}
                </div>

                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
                    ))
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
                        <Bell size={32} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">No notices yet</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filtered.map(n => (
                            <motion.div
                                key={n.id}
                                layout
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2 flex-wrap">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border capitalize ${PRIORITY_BADGE[(n as any).priority ?? 'normal']}`}>
                                            {(n as any).priority ?? 'normal'}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${AUDIENCE_COLORS[n.target_audience] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                            {AUDIENCE_LABELS[n.target_audience] ?? n.target_audience}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => setViewNotice(n)}
                                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                            title="View"
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(n.id)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-semibold text-slate-900 mt-2 text-sm">{n.title}</h3>
                                <p className="text-sm text-slate-500 mt-1.5 line-clamp-3">{n.content}</p>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                                    <span className="text-xs text-slate-400">
                                        Posted by {n.created_by_name || 'Admin'}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {n.created_at ? timeAgo(n.created_at) : ''}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* View modal */}
            {viewNotice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900 text-lg">{viewNotice.title}</h3>
                            <button onClick={() => setViewNotice(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{viewNotice.content}</p>
                        <div className="text-xs text-slate-400 pt-3 border-t border-slate-100">
                            {viewNotice.created_at ? new Date(viewNotice.created_at).toLocaleString('en-IN') : ''} · {AUDIENCE_LABELS[viewNotice.target_audience] ?? viewNotice.target_audience}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {confirmDelete !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
                        <h3 className="font-semibold text-slate-900">Delete Notice?</h3>
                        <p className="text-sm text-slate-500">This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
                            <button onClick={() => deleteNotice(confirmDelete)} className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Homework Tab ─────────────────────────────────────────────────────────────

function HomeworkTab() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([]);
    const [homeworkList, setHomeworkList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        class_id: '', section_id: '', subject_id: '',
        title: '', description: '', due_date: '',
    });
    const [filterClass, setFilterClass] = useState('');
    const [filterSection, setFilterSection] = useState('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    useEffect(() => {
        api.getClasses().then(setClasses).catch(reportApiError);
    }, []);

    useEffect(() => {
        if (form.class_id) {
            api.getSections(parseInt(form.class_id)).then(setSections).catch(reportApiError);
            setForm(f => ({ ...f, section_id: '', subject_id: '' }));
            api.getSubjects(parseInt(form.class_id)).then(setSubjects).catch(reportApiError);
        }
    }, [form.class_id]);

    const loadHomework = useCallback(async () => {
        if (!filterClass || !filterSection) return;
        setLoading(true);
        try {
            const data = await api.getHomework(parseInt(filterClass), parseInt(filterSection));
            setHomeworkList((data as any[]) || []);
        } catch (err) {
            reportApiError(err);
        } finally {
            setLoading(false);
        }
    }, [filterClass, filterSection]);

    useEffect(() => { loadHomework(); }, [loadHomework]);

    const [filterSections, setFilterSections] = useState<Section[]>([]);
    useEffect(() => {
        if (filterClass) {
            api.getSections(parseInt(filterClass)).then(setFilterSections).catch(reportApiError);
            setFilterSection('');
        } else {
            setFilterSections([]);
        }
    }, [filterClass]);

    const postHomework = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.class_id || !form.section_id || !form.subject_id) {
            toast.error('Please select class, section, and subject');
            return;
        }
        setSaving(true);
        try {
            await api.postHomework({
                title: form.title,
                description: form.description,
                class_id: parseInt(form.class_id),
                section_id: parseInt(form.section_id),
                subject_id: parseInt(form.subject_id),
                due_date: form.due_date,
            });
            setForm({ class_id: '', section_id: '', subject_id: '', title: '', description: '', due_date: '' });
            toast.success('Homework posted successfully');
            loadHomework();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to post homework');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Post Homework Form */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div>
                    <h3 className="font-semibold text-slate-900">Post Homework</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Assign homework to a class</p>
                </div>
                <form onSubmit={postHomework} className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Class *</label>
                        <select required value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })} className={inputCls}>
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Section *</label>
                        <select required value={form.section_id} onChange={e => setForm({ ...form, section_id: e.target.value })} disabled={!form.class_id} className={`${inputCls} disabled:opacity-50`}>
                            <option value="">Select Section</option>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Subject *</label>
                        <select required value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} disabled={!form.class_id} className={`${inputCls} disabled:opacity-50`}>
                            <option value="">Select Subject</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Title *</label>
                        <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Homework title" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Description *</label>
                        <textarea
                            required
                            rows={4}
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            className={`${inputCls} resize-none`}
                            placeholder="Homework instructions…"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-500">Due Date *</label>
                        <input required type="date" min={minDate} value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className={inputCls} />
                    </div>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#6c5ce7] text-white rounded-lg text-sm font-semibold hover:bg-[#5b4bd5] disabled:opacity-50 transition-colors"
                    >
                        <Send size={14} />
                        {saving ? 'Posting…' : 'Post Homework'}
                    </button>
                </form>
            </div>

            {/* Homework Feed */}
            <div className="lg:col-span-2 space-y-4">
                {/* Filters */}
                <div className="flex items-end gap-3 flex-wrap">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Class</label>
                        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] transition-colors">
                            <option value="">Select Class</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Section</label>
                        <select value={filterSection} onChange={e => setFilterSection(e.target.value)} disabled={!filterClass} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-[#a29bfe] disabled:opacity-50 transition-colors">
                            <option value="">Select Section</option>
                            {filterSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </div>

                {!filterClass || !filterSection ? (
                    <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
                        <BookOpen size={32} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Select a class and section to view homework</p>
                    </div>
                ) : loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
                    ))
                ) : homeworkList.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-slate-200 py-16 text-center">
                        <BookOpen size={32} className="text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">No homework posted for this class</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {homeworkList.map((hw: any) => (
                            <motion.div
                                key={hw.id}
                                layout
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start gap-2 flex-wrap mb-2">
                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-medium">
                                        {hw.class_name ?? `Class ${form.class_id}`}
                                    </span>
                                    <span className="px-2.5 py-1 bg-[#f1f0ff] text-[#6c5ce7] border border-[#a29bfe]/20 rounded-lg text-xs font-medium">
                                        {hw.subject_name ?? 'Subject'}
                                    </span>
                                    {hw.due_date && (
                                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-xs font-medium">
                                            Due: {new Date(hw.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                                <h3 className="font-semibold text-slate-900 text-sm">{hw.title}</h3>
                                <p className="text-sm text-slate-500 mt-1.5 line-clamp-2">{hw.description}</p>
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                                    <span className="text-xs text-slate-400">
                                        {hw.teacher_name ?? 'Teacher'}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {hw.created_at ? timeAgo(hw.created_at) : ''}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; icon: typeof Bell }[] = [
    { id: 'notices', label: 'Notices', icon: Bell },
    { id: 'homework', label: 'Homework', icon: BookOpen },
];

export default function NoticesPage() {
    const [activeTab, setActiveTab] = useState<TabId>('notices');

    return (
        <div className="space-y-6 pb-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Communication</h1>
                <p className="text-sm text-slate-500 mt-0.5">Post notices and homework for staff, students, and parents</p>
            </div>

            {/* Pill tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            activeTab === tab.id
                                ? 'bg-white text-[#6c5ce7] shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <tab.icon size={15} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'notices' && <NoticesTab />}
            {activeTab === 'homework' && <HomeworkTab />}
        </div>
    );
}
