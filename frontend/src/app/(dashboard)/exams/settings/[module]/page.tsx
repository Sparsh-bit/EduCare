'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, reportApiError } from '@/lib/api';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';

const MODULES: Record<string, { title: string, table: string, help: string }> = {
    'exam-area': { title: 'Exam Area', table: 'exam_areas', help: 'e.g. Scholastic, Co-Scholastic' },
    'subject-group': { title: 'Subject Group', table: 'subject_groups', help: 'e.g. Science Subjects Group' },
    'grade-mapping': { title: 'Marks & Grade Mapping', table: 'grade_mappings', help: 'e.g. A1 (91% - 100%)' },
    'remark-setting': { title: 'Remark Setting', table: 'remarks_bank', help: 'e.g. Excellent, Good' }
};

export default function GenericExamSettingPage() {
    const params = useParams();
    const router = useRouter();
    const moduleKey = params.module as string;

    const [items, setItems] = useState<{ id: number; name: string }[]>([]);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const info = MODULES[moduleKey];

    const loadItems = async () => {
        try {
            const data = await api.getMasterData(info.table);
            setItems(data);
        } catch (e) {
            reportApiError(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!info) {
            router.push('/exams/settings');
            return;
        }
        (async () => {
            setLoading(true);
            await loadItems();
        })();
    }, [moduleKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.createMasterData(info.table, { name });
            setName('');
            loadItems();
        } catch (e) {
            reportApiError(e);
        }
        setSaving(false);
    };

    const handleDelete = async (id: number) => {
        try {
            await api.deleteMasterData(info.table, id);
            loadItems();
        } catch (e) {
            reportApiError(e);
        }
    };

    if (!info) return null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{info.title}</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage entries for this exam setting</p>
                </div>
                <button
                    onClick={() => router.push('/exams/settings')}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft size={14} /> Back
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-5">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Add New Entry</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Add a new value to this setting</p>
                    </div>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Name</label>
                            <input
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                type="text"
                                placeholder={info.help}
                                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:border-[#a29bfe] outline-none transition-colors"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-[#6c5ce7] text-white rounded-lg text-sm font-semibold py-2.5 hover:bg-[#5b4bd5] transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : `Add ${info.title}`}
                        </button>
                        <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Changes here will reflect across all linked exam modules and report cards immediately.
                            </p>
                        </div>
                    </form>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-slate-900">Saved Entries</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{items.length} record{items.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button onClick={loadItems} className="p-2 rounded-lg hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-600">
                            <RefreshCw size={15} />
                        </button>
                    </div>

                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500">Name</th>
                                <th className="px-5 py-3 text-xs font-medium text-slate-500 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={2} className="px-5 py-12 text-center">
                                    <div className="w-6 h-6 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin mx-auto" />
                                </td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={2} className="px-5 py-12 text-center text-slate-400 text-sm">No entries yet</td></tr>
                            ) : (
                                items.map((item, idx) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-md bg-slate-100 text-xs text-slate-500 font-medium flex items-center justify-center">{idx + 1}</span>
                                                <span className="font-medium text-slate-900">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(item.id)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
