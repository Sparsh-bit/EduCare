'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Download, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Badge } from '@/components/ui';
import showToast from '@/lib/toast';

// ─── Types ──────────────────────────────────────────────────
type Strategy = 'skip' | 'replace' | 'add_both';
type Step = 1 | 2 | 3 | 4;

interface DuplicateRow {
    row: number;
    new_student: { student_name: string; class: string; section: string; father_name: string; mother_name: string; admission_number: string; phone: string };
    existing_student: { id?: number; source?: 'in_file' | 'erp'; conflict_row?: number; name: string; father_name: string; admission_no: string; class_name: string };
}

interface PreviewResult {
    batch_id: number;
    file_name: string;
    total_rows_detected: number;
    valid_students: number;
    duplicate_count: number;
    invalid_rows: number;
    errors: Array<{ row: number; errors: string[]; student_name?: string; class_name?: string; father_name?: string }>;
    preview_records: Array<Record<string, unknown>>;
    duplicate_rows: DuplicateRow[];
}

interface ConfirmResult {
    batch_id: number;
    students_added: number;
    skipped_rows: number;
    skipped: Array<{ row: number; reason: string; name?: string }>;
    failed: Array<{ row: number; reason: string; name?: string }>;
    created_preview: Array<{ row: number; id: number; name: string; class_name: string }>;
}

// ─── Step Indicator ──────────────────────────────────────────
function StepIndicator({ current }: { current: Step }) {
    const steps = ['Upload', 'Preview', 'Confirm', 'Done'];
    return (
        <div className="flex items-center gap-0 mb-8">
            {steps.map((label, i) => {
                const num = i + 1;
                const done = current > num;
                const active = current === num;
                return (
                    <div key={label} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                                    done ? 'text-white' : active ? 'text-white' : 'bg-neutral-200 text-neutral-400'
                                }`}
                                style={done || active ? { backgroundColor: 'var(--color-brand-600)' } : {}}
                            >
                                {done ? <Check size={14} /> : num}
                            </div>
                            <span className={`text-xs whitespace-nowrap ${active ? 'text-brand-700 font-medium' : 'text-neutral-400'}`}>{label}</span>
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`flex-1 h-px mx-2 mb-5 transition-colors ${done ? 'bg-brand-400' : 'bg-neutral-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────
export default function BulkUploadPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>(1);
    const [file, setFile] = useState<File | null>(null);
    const [strategy, setStrategy] = useState<Strategy>('skip');
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [result, setResult] = useState<ConfirmResult | null>(null);
    const [errorFilter, setErrorFilter] = useState<'all' | 'new' | 'duplicates' | 'errors'>('all');
    const [reverting, setReverting] = useState(false);
    const [duplicateDecisions, setDuplicateDecisions] = useState<Record<number, Strategy>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);
    const confirmingRef = useRef(false);

    const handleFile = useCallback((f: File) => {
        if (f.size > 10 * 1024 * 1024) { showToast.error('File must be under 10MB'); return; }
        const ext = f.name.split('.').pop()?.toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) { showToast.error('Only .xlsx, .xls, .csv files accepted'); return; }
        setFile(f);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    }, [handleFile]);

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        try {
            const res = await api.importStudentsFile(file);
            setPreview(res);
            setStep(2);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Upload failed';
            showToast.error(msg);
        } finally {
            setUploading(false);
        }
    };

    const handleConfirm = async () => {
        if (!preview || confirmingRef.current) return;
        confirmingRef.current = true;
        setConfirming(true);
        setConfirmError(null);
        setStep(3);
        try {
            const res = await api.confirmStudentImportBatch(
                preview.batch_id,
                strategy,
                Object.keys(duplicateDecisions).length > 0 ? duplicateDecisions as Record<number, 'skip' | 'replace' | 'add_both'> : undefined,
            );
            setResult(res);
            setStep(4);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Import failed';
            setConfirmError(msg);
        } finally {
            setConfirming(false);
            confirmingRef.current = false;
        }
    };

    const handleRevert = async () => {
        if (!result || !confirm('This will delete/undo all students imported in this batch. Are you sure?')) return;
        setReverting(true);
        try {
            await api.revertStudentImportBatch(result.batch_id);
            showToast.success('Import reverted successfully');
            router.push('/students');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Revert failed';
            showToast.error(msg);
        } finally {
            setReverting(false);
        }
    };

    const reset = () => {
        setStep(1); setFile(null); setPreview(null); setResult(null); setStrategy('skip'); setDuplicateDecisions({}); setConfirmError(null);
    };

    // Template download
    const downloadTemplate = () => {
        const headers = 'Student_ID,First_Name,Last_Name,Gender,DOB,Class,Section,Roll_No,Blood_Group,Aadhaar_No,Phone,Stud_Email,Father_Name,Father_Occupation,Mother_Name,Mother_Phone,Mother_Occupation,Guardian_Name,Guardian_Relation,Guardian_P,Address,City,State,Pincode,Nationality,Admission_Date,Transport,Bus_Route,Hostel,Category,Religion';
        const sample1 = 'ADM001,Raj,Kumar,Male,2010-05-15,5,A,12,B+,123456789012,9876543210,raj@example.com,Suresh Kumar,Engineer,Priya Kumar,9876543211,Teacher,,,9876500001,123 Main St,Delhi,Delhi,110001,Indian,2023-04-01,Yes,Route-1,No,General,Hindu';
        const sample2 = 'ADM002,Priya,Sharma,Female,2011-03-22,4,B,8,O+,987654321098,9876500001,,Ramesh Sharma,Business,Sunita Sharma,9876500002,Homemaker,,,9876500003,456 Park Ave,Mumbai,Maharashtra,400001,Indian,2023-04-01,No,,No,OBC,Hindu';
        const csv = [headers, sample1, sample2].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'student_import_template.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 min-h-screen bg-neutral-50">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => router.push('/students')} className="p-1.5 rounded-lg hover:bg-white text-neutral-500 hover:text-neutral-700 transition-colors">
                    <ArrowLeft size={16} />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-neutral-900">Bulk Import Students</h1>
                    <p className="text-xs text-neutral-500">Import multiple students at once via Excel or CSV</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto">
                <StepIndicator current={step} />

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                            <Step1 file={file} dragging={dragging} uploading={uploading} strategy={strategy}
                                fileInputRef={fileInputRef}
                                onDrop={handleDrop}
                                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onFileSelect={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                                onRemoveFile={() => setFile(null)}
                                onStrategyChange={setStrategy}
                                onUpload={handleUpload}
                                onDownloadTemplate={downloadTemplate}
                            />
                        </motion.div>
                    )}

                    {step === 2 && preview && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                            <Step2 preview={preview} strategy={strategy} errorFilter={errorFilter}
                                setErrorFilter={setErrorFilter}
                                duplicateDecisions={duplicateDecisions}
                                setDuplicateDecisions={setDuplicateDecisions}
                                defaultStrategy={strategy}
                                onBack={() => setStep(1)}
                                onConfirm={handleConfirm}
                            />
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Step3 preview={preview} confirming={confirming} error={confirmError}
                                onRetry={handleConfirm}
                                onBack={() => setStep(2)}
                            />
                        </motion.div>
                    )}

                    {step === 4 && result && (
                        <motion.div key="step4" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                            <Step4 result={result} reverting={reverting}
                                onViewStudents={() => router.push('/students')}
                                onImportMore={reset}
                                onRevert={handleRevert}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// ─── Step 1: Upload ──────────────────────────────────────────
function Step1({ file, dragging, uploading, strategy, fileInputRef, onDrop, onDragOver, onDragLeave, onFileSelect, onRemoveFile, onStrategyChange, onUpload, onDownloadTemplate }: {
    file: File | null; dragging: boolean; uploading: boolean; strategy: Strategy;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onDrop: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveFile: () => void;
    onStrategyChange: (s: Strategy) => void;
    onUpload: () => void;
    onDownloadTemplate: () => void;
}) {
    return (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6">
            {/* Drop Zone */}
            <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={`border-2 border-dashed rounded-2xl p-14 text-center transition-all ${
                    dragging ? 'border-brand-500 bg-brand-50/50 scale-[1.01]' : 'border-neutral-300 hover:border-brand-400 hover:bg-brand-50/20'
                }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={onFileSelect}
                />
                <Upload size={40} className={`mx-auto mb-3 ${dragging ? 'text-brand-500' : 'text-neutral-400'}`} />
                <p className="text-lg font-medium text-neutral-700 mb-1">Drag &amp; drop your Excel file here</p>
                <p className="text-sm text-neutral-400 mb-4">or</p>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Browse Files</Button>
                <p className="text-xs text-neutral-400 mt-3">Accepts .xlsx, .xls, .csv files up to 10MB</p>
            </div>

            {/* Selected file */}
            {file && (
                <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 flex items-center gap-3">
                    <FileSpreadsheet size={20} className="text-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 truncate">{file.name}</p>
                        <p className="text-xs text-neutral-500">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={onRemoveFile} className="text-neutral-400 hover:text-neutral-600 flex-shrink-0">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Template */}
            <button
                onClick={onDownloadTemplate}
                className="flex items-center gap-2 text-sm text-brand-600 hover:underline"
                style={{ color: 'var(--color-brand-600)' }}
            >
                <Download size={14} /> Download Excel Template
            </button>

            {/* Duplicate strategy */}
            <div>
                <p className="text-sm font-semibold text-neutral-700 mb-3">What to do if a student already exists?</p>
                <div className="space-y-2">
                    {([
                        ['skip', 'Skip', 'Keep existing record, ignore the imported row'],
                        ['replace', 'Replace', 'Update the existing record with imported data'],
                        ['add_both', 'Add Both', 'Add as a separate record alongside the existing one'],
                    ] as const).map(([val, label, desc]) => (
                        <label key={val} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50/30">
                            <input
                                type="radio"
                                name="strategy"
                                value={val}
                                checked={strategy === val}
                                onChange={() => onStrategyChange(val)}
                                className="mt-0.5 accent-brand-600"
                            />
                            <div>
                                <p className="text-sm font-medium text-neutral-800">{label}</p>
                                <p className="text-xs text-neutral-500">{desc}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex justify-end">
                <Button variant="primary" disabled={!file} loading={uploading} onClick={onUpload}>
                    Preview Import
                </Button>
            </div>
        </div>
    );
}

// ─── Step 2: Preview ─────────────────────────────────────────
function Step2({ preview, strategy, errorFilter, setErrorFilter, duplicateDecisions, setDuplicateDecisions, defaultStrategy, onBack, onConfirm }: {
    preview: PreviewResult; strategy: Strategy; errorFilter: 'all' | 'new' | 'duplicates' | 'errors';
    setErrorFilter: (f: 'all' | 'new' | 'duplicates' | 'errors') => void;
    duplicateDecisions: Record<number, Strategy>;
    setDuplicateDecisions: React.Dispatch<React.SetStateAction<Record<number, Strategy>>>;
    defaultStrategy: Strategy;
    onBack: () => void; onConfirm: () => void;
}) {
    void strategy;
    // NOTE: preview_records only contains VALID rows (backend filters before sending).
    // The errors array contains invalid row details separately.
    // We show valid rows in the table and errors as a list view.
    const displayRecords = preview.preview_records;

    const columns = displayRecords.length > 0
        ? Object.keys(displayRecords[0])
            .filter(k => !k.startsWith('_') && !['class_id', 'section_id', 'school_id', 'academic_year_id'].includes(k))
            .slice(0, 6)
        : [];

    const strategyLabels: Record<Strategy, string> = {
        skip: 'Skip',
        replace: 'Replace',
        add_both: 'Add Both',
    };

    return (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            {/* Summary bar */}
            <div className="bg-neutral-50 border-b border-neutral-200 p-4 flex items-center gap-6 flex-wrap text-sm">
                <span className="text-neutral-700 font-medium">{preview.total_rows_detected} rows detected</span>
                <span className="text-emerald-600 flex items-center gap-1">
                    <Check size={14} /> {preview.valid_students} ready to import
                </span>
                {preview.duplicate_count > 0 && (
                    <span className="text-amber-600 flex items-center gap-1">
                        <AlertCircle size={14} /> {preview.duplicate_count} duplicates
                    </span>
                )}
                {preview.invalid_rows > 0 && (
                    <span className="text-red-600 flex items-center gap-1">
                        <AlertCircle size={14} /> {preview.invalid_rows} rows have errors
                    </span>
                )}
            </div>

            {/* Filter tabs */}
            <div className="border-b border-neutral-100 px-4 flex gap-1">
                {(['all', 'new', 'duplicates', 'errors'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setErrorFilter(f)}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                            errorFilter === f ? 'border-brand-600 text-brand-700' : 'border-transparent text-neutral-500 hover:text-neutral-700'
                        }`}
                        style={errorFilter === f ? { borderBottomColor: 'var(--color-brand-600)' } : {}}
                    >
                        {f === 'all' ? `All (${preview.total_rows_detected})`
                            : f === 'new' ? `Valid (${preview.valid_students})`
                            : f === 'duplicates' ? `Duplicates (${preview.duplicate_count})`
                            : `Errors (${preview.invalid_rows})`}
                    </button>
                ))}
            </div>

            {/* Duplicates tab */}
            {errorFilter === 'duplicates' ? (
                <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
                    {preview.duplicate_rows.length === 0 ? (
                        <p className="text-sm text-neutral-400 text-center py-8">No duplicates found</p>
                    ) : (
                        preview.duplicate_rows.map((dup) => {
                            const current = duplicateDecisions[dup.row] || defaultStrategy;
                            return (
                                <div key={dup.row} className="border border-amber-200 rounded-xl bg-amber-50/40 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-semibold text-amber-700">Row {dup.row} — Duplicate detected</span>
                                        <div className="flex gap-1">
                                            {(['skip', 'replace', 'add_both'] as Strategy[]).map((dec) => (
                                                <button
                                                    key={dec}
                                                    onClick={() => setDuplicateDecisions(prev => ({ ...prev, [dup.row]: dec }))}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                                        current === dec
                                                            ? 'bg-brand-600 text-white border-brand-600'
                                                            : 'bg-white text-neutral-600 border-neutral-300 hover:border-brand-400'
                                                    }`}
                                                    style={current === dec ? { backgroundColor: 'var(--color-brand-600)', borderColor: 'var(--color-brand-600)' } : {}}
                                                >
                                                    {strategyLabels[dec]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white rounded-lg border border-neutral-200 p-3">
                                            <p className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wide">From File</p>
                                            <p className="text-sm font-medium text-neutral-800">{dup.new_student.student_name}</p>
                                            <p className="text-xs text-neutral-500">{dup.new_student.class}{dup.new_student.section ? ` – ${dup.new_student.section}` : ''}</p>
                                            <p className="text-xs text-neutral-500">Father: {dup.new_student.father_name || '—'}</p>
                                            <p className="text-xs text-neutral-500">Adm: {dup.new_student.admission_number || '—'}</p>
                                        </div>
                                        <div className={`rounded-lg border p-3 ${dup.existing_student.source === 'in_file' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-100'}`}>
                                            <p className={`text-xs font-semibold mb-2 uppercase tracking-wide ${dup.existing_student.source === 'in_file' ? 'text-amber-600' : 'text-red-500'}`}>
                                                {dup.existing_student.source === 'in_file' ? `In This File (Row ${dup.existing_student.conflict_row})` : 'In ERP'}
                                            </p>
                                            <p className="text-sm font-medium text-neutral-800">{dup.existing_student.name}</p>
                                            <p className="text-xs text-neutral-500">{dup.existing_student.class_name}</p>
                                            <p className="text-xs text-neutral-500">Father: {dup.existing_student.father_name || '—'}</p>
                                            <p className="text-xs text-neutral-500">Adm: {dup.existing_student.admission_no || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : errorFilter === 'errors' ? (
                /* Errors tab: dedicated error list from preview.errors */
                <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                    {preview.errors.length === 0 ? (
                        <p className="text-sm text-neutral-400 text-center py-8">No errors found</p>
                    ) : (
                        preview.errors.slice(0, 50).map((e, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                                <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                <div>
                                    <span className="text-xs font-semibold text-red-700">Row {e.row}</span>
                                    {(e.student_name || e.class_name) && (
                                        <p className="text-xs text-red-600 mt-0.5">
                                            {e.student_name && <span className="font-medium">{e.student_name}</span>}
                                            {e.class_name && <span> — {e.class_name}</span>}
                                            {e.father_name && <span> (Father: {e.father_name})</span>}
                                        </p>
                                    )}
                                    <ul className="mt-0.5 space-y-0.5">
                                        {e.errors.map((msg, j) => (
                                            <li key={j} className="text-xs text-red-600">{msg}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))
                    )}
                    {preview.errors.length > 50 && (
                        <p className="text-xs text-neutral-400 text-center py-2">Showing 50 of {preview.errors.length} errors</p>
                    )}
                </div>
            ) : (
                /* Valid rows table (all / new tabs) */
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-neutral-100 bg-neutral-50/50">
                                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">#</th>
                                {columns.map(col => (
                                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-neutral-500 capitalize">
                                        {col.replace(/_/g, ' ')}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayRecords.slice(0, 20).map((record, i) => (
                                <tr key={i} className="border-b border-neutral-50 bg-emerald-50/20">
                                    <td className="px-4 py-2.5 text-xs text-neutral-400">{i + 1}</td>
                                    {columns.map(col => (
                                        <td key={col} className="px-4 py-2.5 text-sm text-neutral-700 max-w-[140px] truncate">
                                            {String(record[col] ?? '—')}
                                        </td>
                                    ))}
                                    <td className="px-4 py-2.5">
                                        <Badge variant="success" size="sm">Ready</Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {displayRecords.length > 20 && (
                        <p className="text-xs text-neutral-400 text-center py-3">
                            Showing 20 of {displayRecords.length} valid rows
                        </p>
                    )}
                    {displayRecords.length === 0 && (
                        <p className="text-sm text-neutral-400 text-center py-8">No valid rows to preview</p>
                    )}
                </div>
            )}

            <div className="border-t border-neutral-100 p-4 flex items-center justify-between">
                <Button variant="ghost" onClick={onBack} leftIcon={<ArrowLeft size={14} />}>Back</Button>
                <Button variant="primary" onClick={onConfirm} disabled={preview.valid_students === 0}>
                    Import {preview.valid_students} Student{preview.valid_students !== 1 ? 's' : ''}
                </Button>
            </div>

            {preview.invalid_rows > 0 && (
                <div className="border-t border-neutral-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
                    <AlertCircle size={14} />
                    {preview.invalid_rows} row{preview.invalid_rows !== 1 ? 's' : ''} skipped — fix in your Excel file and re-upload to include them
                </div>
            )}
        </div>
    );
}

// ─── Step 3: Confirming ──────────────────────────────────────
function Step3({ preview, confirming, error, onRetry, onBack }: {
    preview: PreviewResult | null; confirming: boolean;
    error: string | null; onRetry: () => void; onBack: () => void;
}) {
    if (error) {
        return (
            <div className="bg-white rounded-2xl border border-neutral-200 p-16 text-center">
                <AlertCircle size={40} className="mx-auto mb-4 text-red-500" />
                <p className="text-lg font-semibold text-neutral-800 mb-2">Import Failed</p>
                <p className="text-sm text-red-600 mb-6 max-w-sm mx-auto">{error}</p>
                <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={onBack} leftIcon={<ArrowLeft size={14} />}>Back to Preview</Button>
                    <Button variant="primary" onClick={onRetry}>Try Again</Button>
                </div>
            </div>
        );
    }
    return (
        <div className="bg-white rounded-2xl border border-neutral-200 p-16 text-center">
            {confirming ? (
                <>
                    <div className="w-16 h-16 rounded-full border-4 border-neutral-200 border-t-brand-600 animate-spin mx-auto mb-6" />
                    <p className="text-lg font-semibold text-neutral-800">Importing {preview?.valid_students ?? ''} students...</p>
                    <p className="text-sm text-neutral-500 mt-2">Please wait, this may take a moment</p>
                </>
            ) : (
                <p className="text-sm text-neutral-500">Processing...</p>
            )}
        </div>
    );
}

// ─── Step 4: Done ────────────────────────────────────────────
function Step4({ result, reverting, onViewStudents, onImportMore, onRevert }: {
    result: ConfirmResult; reverting: boolean;
    onViewStudents: () => void; onImportMore: () => void; onRevert: () => void;
}) {
    return (
        <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center space-y-6">
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="relative mx-auto w-20 h-20"
            >
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="absolute inset-0 rounded-full bg-emerald-100"
                />
                <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                    <Check size={36} className="text-emerald-500" />
                </div>
            </motion.div>

            <div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Import Complete!</h2>
                <p className="text-sm text-neutral-500">
                    <strong className="text-emerald-600">{result.students_added} added</strong>
                    {result.skipped_rows > 0 && <>, <strong className="text-neutral-600">{result.skipped_rows} skipped</strong></>}
                    {result.failed.length > 0 && <>, <strong className="text-red-500">{result.failed.length} failed</strong></>}
                </p>
            </div>

            {result.created_preview.length > 0 && (
                <div className="text-left bg-emerald-50/50 rounded-xl border border-emerald-200 p-4">
                    <p className="text-xs font-semibold text-emerald-700 mb-2 uppercase">Students Added</p>
                    <div className="space-y-1">
                        {result.created_preview.slice(0, 5).map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-neutral-700">{s.name}</span>
                                <span className="text-neutral-500 text-xs">{s.class_name}</span>
                            </div>
                        ))}
                        {result.created_preview.length > 5 && (
                            <p className="text-xs text-neutral-500">+{result.created_preview.length - 5} more</p>
                        )}
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button variant="primary" onClick={onViewStudents}>View Students</Button>
                <Button variant="outline" onClick={onImportMore}>Import More</Button>
            </div>

            <button
                onClick={onRevert}
                disabled={reverting}
                className="text-xs text-red-500 hover:text-red-700 underline disabled:opacity-50"
            >
                {reverting ? 'Reverting...' : 'Revert this import'}
            </button>
        </div>
    );
}
