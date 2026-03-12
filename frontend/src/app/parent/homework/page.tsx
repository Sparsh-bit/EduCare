/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';

export default function ParentHomework() {
    const [children, setChildren] = useState<Record<string, any>[]>([]);
    const [homework, setHomework] = useState<Record<string, any>[]>([]);
    const [selected, setSelected] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { api.getChildren().then(c => { setChildren(c as Record<string, any>[]); if (c.length > 0) setSelected(c[0] as Record<string, any>); }).catch(reportApiError).finally(() => setLoading(false)); }, []);
    useEffect(() => { if (selected) api.getParentHomework(selected.current_class_id as number || selected.class_id as number, selected.current_section_id as number || selected.section_id as number).then(res => setHomework((res as { data?: Record<string, any>[] }).data || [])).catch(reportApiError); }, [selected]);

    if (loading) return <div className="text-gray-400 text-center py-8">Loading...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">📚 Homework</h1>
            {children.length > 1 && (
                <div className="flex gap-2">{children.map((c) => (
                    <button key={c.id} onClick={() => setSelected(c)} className={`px-4 py-2 rounded-xl text-sm ${selected?.id === c.id ? 'bg-[#6c5ce7]/8 text-[#6c5ce7] border border-[#6c5ce7]/20' : 'text-gray-500'}`}>{c.name}</button>
                ))}</div>
            )}
            {homework.length === 0 ? <p className="text-gray-400">No homework assigned recently</p> : homework.map((hw) => (
                <div key={hw.id} className="card-glass p-5">
                    <div className="flex justify-between items-start">
                        <div><p className="font-medium text-gray-900">{hw.subject_name}</p><p className="text-sm text-gray-600 mt-1">{hw.description}</p></div>
                        <div className="text-right"><p className="text-xs text-gray-400">Due</p><p className="text-sm text-[#6c5ce7] font-medium">{new Date(hw.due_date).toLocaleDateString('en-IN')}</p></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">By {hw.teacher_name}</p>
                </div>
            ))}
        </div>
    );
}
