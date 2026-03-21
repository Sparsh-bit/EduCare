'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, reportApiError } from '@/lib/api';

const MODULES: Record<string, { title: string, table: string, help: string }> = {
    'fees-category': { title: 'Fees Category', table: 'fee_categories', help: 'E.g., Tuition Fee, Transport Fee' },
    'fees-group': { title: 'Fees Group', table: 'fee_groups', help: 'E.g., Regular, New Admission' },
    'discount-policy': { title: 'Discount Policy', table: 'discount_policies', help: 'E.g., Staff Sibling, Merit' }
};

export default function GenericFeesSettingPage() {
    const params = useParams();
    const router = useRouter();
    const moduleKey = params.module as string;

    const [items, setItems] = useState<{ id: number; name: string }[]>([]);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(true);

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
            router.push('/fees/setup');
            return;
        }
        (async () => {
            setLoading(true);
            await loadItems();
        })();
    }, [moduleKey]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createMasterData(info.table, { name });
            setName('');
            loadItems();
        } catch (e) {
            reportApiError(e);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you confirm?')) return;
        try {
            await api.deleteMasterData(info.table, id);
            loadItems();
        } catch (e) {
            reportApiError(e);
        }
    };

    if (!info) return null;

    return (
        <div className="p-6 bg-[#f8f9fb] min-h-screen">
            <div className="mb-6 flex items-center text-sm text-slate-500 gap-2">
                <button onClick={() => router.push('/dashboard')} className="hover:text-teal-600 transition-colors">
                    <span className="text-teal-600">🏠</span>
                </button>
                <span>/</span>
                <span onClick={() => router.push('/fees/setup')} className="text-teal-600 cursor-pointer hover:underline">Fees Setting</span>
                <span>/</span>
                <span className="text-slate-900 font-medium">{info.title}</span>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden h-fit">
                    <div className="p-4 border-b border-slate-100 font-bold text-slate-800 tracking-wide text-sm bg-slate-50/50">
                        Add {info.title}
                    </div>
                    <form onSubmit={handleSave} className="p-5 space-y-4">
                        <div>
                            <label className="text-xs font-semibold text-red-500 mb-1 block">Name*</label>
                            <input
                                required
                                value={name}
                                onChange={e => setName(e.target.value)}
                                type="text"
                                placeholder={info.help}
                                className="w-full px-3 py-2 border border-slate-200 rounded text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                            />
                        </div>
                        <div className="pt-2">
                            <button type="submit" className="bg-teal-700 hover:bg-teal-800 text-white font-medium py-2 px-6 rounded text-sm transition-colors shadow-sm">
                                Save
                            </button>
                        </div>
                    </form>
                </div>

                <div className="w-full lg:w-2/3 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 font-bold text-slate-800 tracking-wide text-sm bg-slate-50/50">
                        {info.title} List
                    </div>
                    <div className="p-5">
                        <div className="overflow-x-auto border border-slate-100 rounded">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 font-bold text-slate-800">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-slate-200">Name</th>
                                        <th className="px-4 py-3 border-b border-slate-200 text-right w-24">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="text-slate-700">
                                    {loading ? (
                                        <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                                    ) : items.length === 0 ? (
                                        <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400">No {info.title.toLowerCase()} found</td></tr>
                                    ) : (
                                        items.map(item => (
                                            <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button type="button" onClick={() => handleDelete(item.id)} className="bg-red-50 hover:bg-red-100 text-red-600 rounded px-2 py-1 text-xs transition-colors">
                                                        Delete
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
        </div>
    );
}
