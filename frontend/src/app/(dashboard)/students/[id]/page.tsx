'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    ArrowLeft, Pencil, Printer, ChevronDown, Phone,
    CalendarCheck, IndianRupee, CheckCircle, AlertTriangle,
    User, BookOpen, GraduationCap, FileText, Activity,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Student, StudentAttendanceSummary, StudentFeeStatus } from '@/lib/types';
import { Avatar, Badge, Button, Skeleton, SkeletonText, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui';
import showToast from '@/lib/toast';
import { formatINR, timeAgo } from '@/lib/format';

type ProfileTab = 'Overview' | 'Personal' | 'Parents' | 'Academic' | 'Fees' | 'Attendance' | 'Documents' | 'Activity';
const TABS: ProfileTab[] = ['Overview', 'Personal', 'Parents', 'Academic', 'Fees', 'Attendance', 'Documents', 'Activity'];

export default function StudentProfilePage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);

    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ProfileTab>('Overview');

    const [attendance, setAttendance] = useState<StudentAttendanceSummary | null>(null);
    const [fees, setFees] = useState<StudentFeeStatus | null>(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        api.getStudent(id)
            .then(s => {
                setStudent(s);
                // load supplementary data
                api.getStudentAttendance(id).then(setAttendance).catch(() => {});
                api.getStudentFees(id).then(setFees).catch(() => {});
            })
            .catch(() => setError('Student not found'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleDeactivate = async () => {
        if (!student || !confirm(`Mark ${student.name} as inactive?`)) return;
        try {
            await api.updateStudent(id, { status: 'inactive' });
            showToast.success('Student marked inactive');
            setStudent(s => s ? { ...s, status: 'inactive' } : s);
        } catch { showToast.error('Failed to update status'); }
    };

    const handleGenerateTC = async () => {
        if (!student || !confirm('Generate Transfer Certificate?')) return;
        try {
            await api.generateTC(id);
            showToast.success('TC generated');
        } catch { showToast.error('Failed to generate TC'); }
    };

    if (loading) return <ProfileSkeleton />;
    if (error || !student) return (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div>
                <p className="text-sm text-red-600 mb-4">{error ?? 'Not found'}</p>
                <button onClick={() => router.push('/students')} className="text-sm underline text-neutral-500">Back to students</button>
            </div>
        </div>
    );

    return (
        <div className="p-6 space-y-4">
            {/* Back */}
            <button onClick={() => router.push('/students')} className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
                <ArrowLeft size={14} /> All Students
            </button>

            {/* ── Profile Header ── */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-6 text-white"
                style={{ background: 'linear-gradient(135deg, var(--color-brand-800) 0%, var(--color-brand-700) 100%)' }}
            >
                <div className="flex items-start gap-6 flex-wrap">
                    <div className="ring-4 ring-white/20 rounded-full flex-shrink-0">
                        <Avatar name={student.name} size="xl" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl font-bold mb-2">{student.name}</h1>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {student.class_name && (
                                <span className="px-2.5 py-1 rounded-full bg-white/15 text-xs font-medium">
                                    {student.class_name}{student.section_name ? ` - ${student.section_name}` : ''}
                                </span>
                            )}
                            {student.academic_year && (
                                <span className="px-2.5 py-1 rounded-full bg-white/15 text-xs font-medium">{student.academic_year}</span>
                            )}
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${student.status === 'active' ? 'bg-emerald-500/30 text-emerald-100' : 'bg-white/15'}`}>
                                {student.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-white/50 text-xs uppercase tracking-wide mb-0.5">Admission No</p>
                                <p className="text-sm font-medium">{student.admission_no}</p>
                            </div>
                            <div>
                                <p className="text-white/50 text-xs uppercase tracking-wide mb-0.5">Father&apos;s Name</p>
                                <p className="text-sm font-medium">{student.father_name || '—'}</p>
                            </div>
                            <div>
                                <p className="text-white/50 text-xs uppercase tracking-wide mb-0.5">Phone</p>
                                <p className="text-sm font-medium">{student.phone || student.father_phone || '—'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 ml-auto flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            className="!border-white/30 !text-white hover:!bg-white/10"
                            leftIcon={<Pencil size={13} />}
                            onClick={() => router.push(`/students/${id}/edit`)}
                        >
                            Edit
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="!border-white/30 !text-white hover:!bg-white/10"
                            leftIcon={<Printer size={13} />}
                        >
                            Print ID Card
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="!border-white/30 !text-white hover:!bg-white/10" rightIcon={<ChevronDown size={12} />}>
                                    More
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="right">
                                <DropdownMenuItem onClick={handleGenerateTC}><FileText size={14} className="mr-2" /> Generate TC</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/fees?student=${id}`)}><IndianRupee size={14} className="mr-2" /> View Fee History</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/attendance?student=${id}`)}><CalendarCheck size={14} className="mr-2" /> Attendance</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDeactivate} className="text-red-600 hover:!bg-red-50">
                                    Mark Inactive
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </motion.div>

            {/* ── Tabs ── */}
            <div className="bg-white rounded-2xl border border-neutral-200">
                <div className="border-b border-neutral-100 px-4 overflow-x-auto">
                    <div className="flex gap-1">
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                    activeTab === tab
                                        ? 'border-brand-600 text-brand-700'
                                        : 'border-transparent text-neutral-500 hover:text-neutral-700'
                                }`}
                                style={activeTab === tab ? { borderBottomColor: 'var(--color-brand-600)', color: 'var(--color-brand-700)' } : {}}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'Overview' && <OverviewTab student={student} attendance={attendance} fees={fees} />}
                    {activeTab === 'Personal' && <PersonalTab student={student} />}
                    {activeTab === 'Parents' && <ParentsTab student={student} />}
                    {activeTab === 'Academic' && <AcademicTab student={student} />}
                    {activeTab === 'Fees' && <FeesTab studentId={id} fees={fees} router={router} />}
                    {activeTab === 'Attendance' && <AttendanceTab studentId={id} attendance={attendance} />}
                    {activeTab === 'Documents' && <DocumentsTab />}
                    {activeTab === 'Activity' && <ActivityTab student={student} />}
                </div>
            </div>
        </div>
    );
}

// ─── Overview Tab ────────────────────────────────────────────
function OverviewTab({ student, attendance, fees }: { student: Student; attendance: StudentAttendanceSummary | null; fees: StudentFeeStatus | null }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Attendance */}
                <div className="p-4 rounded-xl border border-neutral-200">
                    <div className="flex items-center gap-2 mb-3">
                        <CalendarCheck size={16} className="text-blue-500" />
                        <span className="text-sm font-medium text-neutral-700">Attendance</span>
                    </div>
                    {attendance ? (
                        <>
                            <p className="text-3xl font-bold text-neutral-900">{attendance.percentage.toFixed(1)}%</p>
                            <p className="text-xs text-neutral-500 mt-1">{attendance.present} present / {attendance.total_days} days</p>
                            {attendance.percentage < 75 && (
                                <Badge variant="danger" size="sm" className="mt-2">Below 75%</Badge>
                            )}
                        </>
                    ) : <p className="text-sm text-neutral-400">No data</p>}
                </div>

                {/* Fee */}
                <div className="p-4 rounded-xl border border-neutral-200">
                    <div className="flex items-center gap-2 mb-3">
                        <IndianRupee size={16} className="text-emerald-500" />
                        <span className="text-sm font-medium text-neutral-700">Fee Status</span>
                    </div>
                    {fees ? (
                        <>
                            <p className="text-3xl font-bold text-neutral-900">{formatINR(fees.total_paid ?? 0)}</p>
                            <p className="text-xs text-neutral-500 mt-1">
                                Due: {formatINR((fees.total_due ?? 0) - (fees.total_paid ?? 0))}
                            </p>
                        </>
                    ) : <p className="text-sm text-neutral-400">No data</p>}
                </div>

                {/* Student info */}
                <div className="p-4 rounded-xl border border-neutral-200">
                    <div className="flex items-center gap-2 mb-3">
                        <GraduationCap size={16} className="text-brand-500" />
                        <span className="text-sm font-medium text-neutral-700">Quick Info</span>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Class</span>
                            <span className="font-medium">{student.class_name ?? '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Category</span>
                            <span className="font-medium">{student.category ?? '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-500">Admitted</span>
                            <span className="font-medium">{new Date(student.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Personal Tab ────────────────────────────────────────────
function PersonalTab({ student }: { student: Student }) {
    const fields: [string, string | undefined][] = [
        ['Admission No', student.admission_no],
        ['Date of Birth', student.dob ? new Date(student.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : undefined],
        ['Gender', student.gender],
        ['Blood Group', student.blood_group],
        ['Category', student.category],
        ['Religion', student.religion],
        ['Nationality', student.nationality],
        ['Aadhaar', student.aadhaar ? `${student.aadhaar.slice(0, 4)} ${student.aadhaar.slice(4, 8)} ${student.aadhaar.slice(8)}` : undefined],
        ['Phone', student.phone],
        ['Email', student.email],
        ['Address', [student.address, student.city, student.state, student.pincode].filter(Boolean).join(', ')],
    ];
    return <FieldGrid fields={fields} />;
}

// ─── Parents Tab ─────────────────────────────────────────────
function ParentsTab({ student }: { student: Student }) {
    return (
        <div className="grid md:grid-cols-3 gap-4">
            <ParentCard
                title="Father"
                name={student.father_name}
                phone={student.father_phone}
                email={student.father_email}
                occupation={student.father_occupation}
            />
            <ParentCard
                title="Mother"
                name={student.mother_name}
                phone={student.mother_phone}
                occupation={student.mother_occupation}
            />
            <ParentCard
                title="Guardian"
                name={student.guardian_name}
                phone={student.guardian_phone}
                extra={student.guardian_relation}
            />
        </div>
    );
}

function ParentCard({ title, name, phone, email, occupation, extra }: {
    title: string; name?: string; phone?: string; email?: string; occupation?: string; extra?: string;
}) {
    return (
        <div className="p-4 rounded-xl border border-neutral-200">
            <div className="flex items-center gap-2 mb-3">
                <User size={14} className="text-neutral-400" />
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</span>
            </div>
            {name ? (
                <div className="space-y-2">
                    <p className="font-medium text-neutral-900">{name}</p>
                    {extra && <p className="text-xs text-neutral-500">{extra}</p>}
                    {occupation && <p className="text-sm text-neutral-600">{occupation}</p>}
                    {phone && (
                        <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
                            <Phone size={12} />{phone}
                        </a>
                    )}
                    {email && <p className="text-xs text-neutral-500">{email}</p>}
                </div>
            ) : (
                <p className="text-sm text-neutral-400">Not provided</p>
            )}
        </div>
    );
}

// ─── Academic Tab ─────────────────────────────────────────────
function AcademicTab({ student }: { student: Student }) {
    const fields: [string, string | undefined][] = [
        ['Admission No', student.admission_no],
        ['Class', student.class_name],
        ['Section', student.section_name],
        ['Roll No', student.current_roll_no],
        ['Academic Year', student.academic_year],
        ['Student UID', student.student_uid],
        ['Previous School', student.previous_school],
    ];
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-neutral-400" />
                <span className="text-sm font-semibold text-neutral-700">Academic Details</span>
            </div>
            <FieldGrid fields={fields} />
        </div>
    );
}

// ─── Fees Tab ─────────────────────────────────────────────────
function FeesTab({ studentId, fees, router }: { studentId: number; fees: StudentFeeStatus | null; router: ReturnType<typeof useRouter> }) {
    return (
        <div className="space-y-4">
            {fees ? (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <StatBox label="Total Fee" value={formatINR(fees.total_fee)} />
                        <StatBox label="Paid" value={formatINR(fees.total_paid)} color="emerald" />
                        <StatBox label="Due" value={formatINR(fees.total_due)} color="red" />
                    </div>
                    {fees.installments && fees.installments.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-100 bg-neutral-50">
                                        <th className="px-3 py-2 text-left text-xs text-neutral-500 font-medium">Installment</th>
                                        <th className="px-3 py-2 text-left text-xs text-neutral-500 font-medium">Due Date</th>
                                        <th className="px-3 py-2 text-right text-xs text-neutral-500 font-medium">Amount</th>
                                        <th className="px-3 py-2 text-left text-xs text-neutral-500 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fees.installments.map((inst, i) => (
                                        <tr key={i} className="border-b border-neutral-50">
                                            <td className="px-3 py-2">Installment {inst.installment_no ?? i + 1}</td>
                                            <td className="px-3 py-2 text-neutral-500">{inst.due_date ? new Date(inst.due_date).toLocaleDateString('en-IN') : '—'}</td>
                                            <td className="px-3 py-2 text-right">{formatINR(inst.amount)}</td>
                                            <td className="px-3 py-2">
                                                <Badge variant={inst.paid ? 'success' : inst.is_overdue ? 'danger' : 'default'} size="sm">
                                                    {inst.paid ? 'Paid' : inst.is_overdue ? 'Overdue' : 'Pending'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            ) : (
                <p className="text-sm text-neutral-400 py-4">No fee data available</p>
            )}
            <Button variant="primary" size="sm" onClick={() => router.push(`/fees?student=${studentId}`)}>
                Collect Fee
            </Button>
        </div>
    );
}

// ─── Attendance Tab ───────────────────────────────────────────
function AttendanceTab({ studentId, attendance }: { studentId: number; attendance: StudentAttendanceSummary | null }) {
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [records, setRecords] = useState<Record<string, 'P' | 'A' | 'L' | 'H'>>({});

    useEffect(() => {
        // fetch monthly data when studentId or month changes
        void studentId;
        void month;
        // Would call api.getStudentAttendance(studentId, { month }) but we keep it simple
    }, [studentId, month]);

    const [year, mon] = month.split('-').map(Number);
    const daysInMonth = new Date(year, mon, 0).getDate();
    const firstDay = new Date(year, mon - 1, 1).getDay();

    const STATUS_COLORS = {
        P: 'bg-emerald-100 text-emerald-700',
        A: 'bg-red-100 text-red-700',
        L: 'bg-amber-100 text-amber-700',
        H: 'bg-neutral-100 text-neutral-500',
    };

    const prevMonth = () => {
        const d = new Date(`${month}-01`);
        d.setMonth(d.getMonth() - 1);
        setMonth(d.toISOString().slice(0, 7));
    };
    const nextMonth = () => {
        const d = new Date(`${month}-01`);
        d.setMonth(d.getMonth() + 1);
        if (d <= new Date()) setMonth(d.toISOString().slice(0, 7));
    };

    const monthName = new Date(`${month}-01`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-4">
            {/* Month nav */}
            <div className="flex items-center gap-3">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500">‹</button>
                <span className="text-sm font-medium text-neutral-700 min-w-[140px] text-center">{monthName}</span>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500">›</button>
            </div>

            {/* Calendar grid */}
            <div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-center text-xs text-neutral-400 font-medium py-1">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateStr = `${month}-${String(day).padStart(2, '0')}`;
                        const status = records[dateStr];
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        return (
                            <div key={day} className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative ${status ? STATUS_COLORS[status] : isToday ? 'bg-brand-50' : 'bg-neutral-50'}`}>
                                <span className={`font-medium ${isToday ? 'text-brand-700' : ''}`}>{day}</span>
                                {status && <span className="text-[9px] font-bold">{status}</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-xs">
                {Object.entries({ P: 'Present', A: 'Absent', L: 'Late', H: 'Holiday' }).map(([k, v]) => (
                    <div key={k} className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${STATUS_COLORS[k as keyof typeof STATUS_COLORS]}`}>
                        <span className="font-bold">{k}</span>{v}
                    </div>
                ))}
            </div>

            {/* Summary */}
            {attendance && (
                <div className="flex gap-4 text-sm flex-wrap">
                    <span className="text-neutral-600">Present: <strong className="text-emerald-600">{attendance.present}</strong></span>
                    <span className="text-neutral-600">Absent: <strong className="text-red-500">{attendance.absent}</strong></span>
                    <span className="text-neutral-600">Late: <strong className="text-amber-500">{attendance.late}</strong></span>
                    <span className="text-neutral-600">Percentage: <strong>{attendance.percentage.toFixed(1)}%</strong></span>
                    {attendance.percentage < 75 && (
                        <Badge variant="danger" size="sm" className="flex items-center gap-1">
                            <AlertTriangle size={10} /> Below 75% — Parent notified
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Documents Tab ────────────────────────────────────────────
function DocumentsTab() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText size={40} className="text-neutral-300 mb-3" />
            <p className="text-sm text-neutral-500">Documents will appear here once uploaded during admission</p>
        </div>
    );
}

// ─── Activity Tab ─────────────────────────────────────────────
function ActivityTab({ student }: { student: Student }) {
    const items = [
        { date: student.created_at, action: 'Student admitted', who: 'Admin' },
    ];
    return (
        <div className="space-y-0">
            {items.map((item, i) => (
                <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: 'var(--color-brand-500)' }} />
                        {i < items.length - 1 && <div className="w-px flex-1 mt-1 bg-neutral-200" />}
                    </div>
                    <div className="pb-4 min-w-0">
                        <p className="text-sm font-medium text-neutral-800">{item.action}</p>
                        <p className="text-xs text-neutral-500">{item.who} · {timeAgo(item.date)}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────
function FieldGrid({ fields }: { fields: [string, string | undefined][] }) {
    return (
        <div className="grid md:grid-cols-2 gap-4">
            {fields.map(([label, value]) => (
                <div key={label}>
                    <p className="text-xs text-neutral-400 uppercase tracking-wide mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-neutral-800">{value || '—'}</p>
                </div>
            ))}
        </div>
    );
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
    const colorMap: Record<string, string> = { emerald: 'text-emerald-600', red: 'text-red-500', amber: 'text-amber-500' };
    return (
        <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50">
            <p className="text-xs text-neutral-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${colorMap[color ?? ''] ?? 'text-neutral-900'}`}>{value}</p>
        </div>
    );
}

function ProfileSkeleton() {
    return (
        <div className="p-6 space-y-4">
            <Skeleton className="w-32 h-4 rounded" />
            <Skeleton className="w-full h-44 rounded-2xl" />
            <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <SkeletonText lines={5} />
            </div>
        </div>
    );
}

// Suppress unused import warnings
void CheckCircle; void Activity;
