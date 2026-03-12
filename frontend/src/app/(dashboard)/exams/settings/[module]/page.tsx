'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, reportApiError } from '@/lib/api';

const MODULES: Record<string, { title: string, table: string, help: string, icon: string }> = {
    'exam-area': { title: 'Exam Area', table: 'exam_areas', help: 'E.g., Scholastic, Co-Scholastic', icon: '🎯' },
    'subject-group': { title: 'Subject Group', table: 'subject_groups', help: 'E.g., Science Subjects Group', icon: '📚' },
    'grade-mapping': { title: 'Marks & Grade Mapping', table: 'grade_mappings', help: 'E.g., A1 (91% - 100%)', icon: '📊' },
    'remark-setting': { title: 'Remark Setting', table: 'remarks_bank', help: 'E.g., Excellent, Good', icon: '✍️' }
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
        if (!window.confirm('Are you sure you want to delete this configuration?')) return;
        try {
            await api.deleteMasterData(info.table, id);
            loadItems();
        } catch (e) {
            reportApiError(e);
        }
    };

    if (!info) return null;

    return (
        <div className="space-y-8 animate-fade-in p-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-[#f1f0ff] flex items-center justify-center text-xl shadow-sm">{info.icon}</span>
                        {info.title}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1.5 font-medium ml-1">Configure academic standards and institutional rules</p>
                </div>
                <button
                    onClick={() => router.push('/exams/settings')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-500 hover:text-[#6c5ce7] hover:border-[#f1f0ff] transition-all shadow-sm"
                >
                    <span className="text-lg">⬅</span> Back to Overview
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6 sticky top-8">
                    <div>
                        <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-widest mb-1">Configuration</h3>
                        <p className="text-[11px] text-gray-400 font-bold">Add new master entry to this module</p>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-widest font-extrabold text-gray-400 ml-1">System Label / Name</label>
                            <input
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                type="text"
                                placeholder={info.help}
                                className="w-full bg-gray-50 border-none rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-[#6c5ce7]/20 py-4 px-5"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-[#6c5ce7] text-white rounded-2xl text-sm font-bold py-4 shadow-xl shadow-[#6c5ce7]/10 hover:bg-[#5b4bd5] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? 'Processing...' : `Commit ${info.title}`}
                        </button>
                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                            <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-tight">
                                💡 Note: Changes to master data will reflect across all linked academic modules and report cards immediately.
                            </p>
                        </div>
                    </form>
                </div>

                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900">Registered Entries</h3>
                            <p className="text-[11px] text-gray-500 font-semibold mt-0.5">Total {items.length} records found in database</p>
                        </div>
                        <button onClick={loadItems} className="w-8 h-8 rounded-full hover:bg-white transition-colors flex items-center justify-center border border-transparent hover:border-gray-100 text-sm opacity-50 hover:opacity-100">🔄</button>
                    </div>

                    <div className="p-2 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Entry Label</th>
                                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Administrative Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 font-medium">
                                {loading ? (
                                    <tr><td colSpan={2} className="px-6 py-12 text-center">
                                        <div className="inline-block w-6 h-6 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin"></div>
                                    </td></tr>
                                ) : items.length === 0 ? (
                                    <tr><td colSpan={2} className="px-6 py-12 text-center text-gray-400 italic font-medium">No master records found</td></tr>
                                ) : (
                                    items.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <span className="w-8 h-8 rounded-xl bg-gray-50 text-[10px] text-gray-400 font-black flex items-center justify-center group-hover:bg-white group-hover:text-[#6c5ce7] transition-all border border-transparent group-hover:border-[#f1f0ff]">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-sm font-bold text-gray-800 tracking-tight group-hover:text-[#6c5ce7] transition-colors">{item.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(item.id)}
                                                    className="px-4 py-2 bg-rose-50 text-rose-600 text-[10px] font-extrabold uppercase tracking-tight rounded-xl hover:bg-rose-100 transition-all border border-rose-100 opacity-60 hover:opacity-100"
                                                >
                                                    Remove
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
        </div>
    );
}
