/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';

export default function ParentHomework() {
    const [children, setChildren] = useState<Record<string, any>[]>([]);
    const [homework, setHomework] = useState<Record<string, any>[]>([]);
    const [selected, setSelected] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getChildren()
            .then(c => {
                setChildren(c as Record<string, any>[]);
                if (c.length > 0) setSelected(c[0] as Record<string, any>);
            })
            .catch(reportApiError)
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (selected) {
            api.getParentHomework(
                (selected.current_class_id as number) || (selected.class_id as number),
                (selected.current_section_id as number) || (selected.section_id as number)
            )
                .then(res => setHomework((res as { data?: Record<string, any>[] }).data || []))
                .catch(reportApiError);
        }
    }, [selected]);

    if (loading) return (
        <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[#6c5ce7] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Homework</h1>
                <p className="text-sm text-slate-500 mt-0.5">Recent assignments given by teachers</p>
            </div>

            {children.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                    {children.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setSelected(c)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                selected?.id === c.id
                                    ? 'bg-[#f1f0ff] text-[#5b4bd5] border-[#6c5ce7]/20'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            )}

            {homework.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-12 text-center text-slate-400 text-sm">
                    No homework assigned recently
                </div>
            ) : (
                <div className="space-y-3">
                    {homework.map((hw) => (
                        <div key={hw.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900">{hw.subject_name}</p>
                                    <p className="text-sm text-slate-600 mt-1">{hw.description}</p>
                                    <p className="text-xs text-slate-400 mt-2">Assigned by {hw.teacher_name}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-xs text-slate-400">Due</p>
                                    <p className="text-sm text-[#6c5ce7] font-medium mt-0.5">
                                        {new Date(hw.due_date).toLocaleDateString('en-IN')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
