/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useState, useEffect } from 'react';
import { api, reportApiError } from '@/lib/api';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { 
    CalendarDays, 
    IndianRupee, 
    ClipboardList, 
    Bell, 
    BookOpen, 
    Award,
    ArrowRight,
    GraduationCap,
    Zap,
    MapPin
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }
};

export default function ParentDashboard() {
    const { user } = useAuth();
    const [children, setChildren] = useState<Record<string, any>[]>([]);
    const [notices, setNotices] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.getChildren(), api.getParentNotices()])
            .then(([c, n]) => { 
                setChildren(c as Record<string, any>[]); 
                setNotices(n as Record<string, any>[]); 
            })
            .catch(reportApiError)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-[3px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-400">Syncing with EduCare...</p>
        </div>
    );

    const quickLinks = [
        { href: '/parent/attendance', label: 'Attendance', icon: CalendarDays, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { href: '/parent/fees', label: 'Fees', icon: IndianRupee, color: 'text-rose-600', bg: 'bg-rose-50' },
        { href: '/parent/results', label: 'Results', icon: Award, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { href: '/parent/homework', label: 'Homework', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50' },
        { href: '/parent/notices', label: 'Notices', icon: Bell, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8 pb-12"
        >
            {/* Premium Hero */}
            <motion.div variants={itemVariants} className="relative p-8 md:p-10 rounded-[40px] overflow-hidden group">
                <div className="absolute inset-0 bg-mesh-light opacity-60 group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-transparent to-transparent" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/80 backdrop-blur-md border border-white/50 rounded-full shadow-sm mb-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">Parent Gateway</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                            Welcome back, <br />
                            <span className="text-gradient-purple">{user?.name?.split(' ')[0] || 'Parent'}</span>
                        </h1>
                        <p className="text-base text-slate-500 mt-4 font-medium flex items-center gap-2">
                             <MapPin size={16} className="text-indigo-500" />
                             {user?.school_name || 'EduCare Excellence Academy'}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Children Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {children.map((child, idx) => (
                    <motion.div 
                        key={child.id}
                        variants={itemVariants}
                        className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500"
                    >
                        <div className="p-8">
                            <div className="flex items-center gap-6 mb-8">
                                <div className="relative">
                                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[24px] flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-indigo-200 group-hover:rotate-6 transition-transform">
                                        {child.name.charAt(0)}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{child.name}</h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded-lg">
                                            {String(child.class_name || '').toLowerCase().startsWith('class') ? child.class_name : 'Class ' + child.class_name}
                                        </span>
                                        <span className="px-2.5 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase rounded-lg">
                                            Section {child.section_name}
                                        </span>
                                        <span className="px-2.5 py-1 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase rounded-lg">
                                            Roll #{child.current_roll_no}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-5 gap-3">
                                {quickLinks.map(({ href, label, icon: Icon, color, bg }) => (
                                    <Link
                                        key={href}
                                        href={`${href}?id=${child.id}`}
                                        className="flex flex-col items-center gap-2.5 p-4 rounded-[24px] bg-slate-50/50 hover:bg-white hover:shadow-lg hover:shadow-indigo-500/10 transition-all border border-transparent hover:border-indigo-100 group/link"
                                    >
                                        <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center group-hover/link:scale-110 transition-transform`}>
                                            <Icon size={20} />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 group-hover/link:text-indigo-600">{label}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ))}

                {children.length === 0 && (
                    <motion.div variants={itemVariants} className="xl:col-span-2 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 p-20 text-center">
                        <GraduationCap size={48} className="mx-auto mb-4 text-slate-300" />
                        <h3 className="text-lg font-bold text-slate-900">No Students Linked</h3>
                        <p className="text-sm text-slate-500 mt-2">Please contact the school administration to link your child&apos;s profile.</p>
                    </motion.div>
                )}
            </div>

            {/* Notices Section */}
            <motion.div variants={itemVariants} className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16" />
                
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#f1f0ff] rounded-xl flex items-center justify-center">
                            <Bell size={20} className="text-[#6c5ce7]" />
                        </div>
                        Intelligence Feed
                    </h3>
                    <Link href="/parent/notices" className="text-xs font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                        View All <ArrowRight size={14} />
                    </Link>
                </div>

                {notices.length === 0 ? (
                    <div className="py-12 text-center">
                        <Zap size={32} className="mx-auto mb-3 text-slate-200" />
                        <p className="text-slate-400 font-medium">No recent updates in your feed.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        {notices.slice(0, 4).map((n) => (
                            <div key={n.id} className="p-6 bg-slate-50/50 rounded-[32px] border border-transparent hover:border-indigo-100 hover:bg-white transition-all group/notice">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="px-2 py-1 bg-white text-[9px] font-black uppercase tracking-widest text-indigo-600 rounded-lg border border-indigo-50">Notice</span>
                                    <span className="text-[10px] font-bold text-slate-400">{new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                </div>
                                <p className="text-sm font-bold text-slate-900 group-hover/notice:text-indigo-600 transition-colors">{n.title}</p>
                                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{n.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
