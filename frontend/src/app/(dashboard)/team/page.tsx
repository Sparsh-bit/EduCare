'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, reportApiError } from '@/lib/api';

interface TeamUser {
    id: number;
    name: string;
    username: string;
    role: string;
    phone?: string;
    is_active: boolean;
    created_at: string;
}

export default function TeamPage() {
    const { isOwner, loading: authLoading } = useAuth();
    const [users, setUsers] = useState<TeamUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showResetPw, setShowResetPw] = useState<number | null>(null);
    const [resetPw, setResetPw] = useState('');
    const [form, setForm] = useState({ name: '', username: '', password: '', role: 'teacher', phone: '', designation: '', department: '' });
    const [msg, setMsg] = useState({ text: '', type: '' });

    const fetchUsers = useCallback(async () => {
        try {
            const res = await api.getSchoolUsers();
            setUsers(res.data || []);
        } catch (err: unknown) {
            reportApiError(err);
            setMsg({ text: 'Failed to load team members', type: 'error' });
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (!authLoading) {
            (async () => { await fetchUsers(); })();
        }
    }, [authLoading, fetchUsers]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg({ text: '', type: '' });
        try {
            const res = await api.createUser(form);
            setMsg({ text: res.message, type: 'success' });
            setForm({ name: '', username: '', password: '', role: 'teacher', phone: '', designation: '', department: '' });
            setShowCreate(false);
            fetchUsers();
        } catch (err: unknown) {
            setMsg({ text: err instanceof Error ? err.message : 'Operation failed', type: 'error' });
        }
    };

    const handleRoleChange = async (userId: number, newRole: string) => {
        try {
            await api.updateUserRole(userId, newRole);
            setMsg({ text: `Role updated to ${newRole}`, type: 'success' });
            fetchUsers();
        } catch (err: unknown) {
            setMsg({ text: err instanceof Error ? err.message : 'Operation failed', type: 'error' });
        }
    };

    const handleToggleActive = async (u: TeamUser) => {
        try {
            if (u.is_active) {
                await api.deactivateUser(u.id);
                setMsg({ text: `${u.name} deactivated`, type: 'success' });
            } else {
                await api.reactivateUser(u.id);
                setMsg({ text: `${u.name} reactivated`, type: 'success' });
            }
            fetchUsers();
        } catch (err: unknown) {
            setMsg({ text: err instanceof Error ? err.message : 'Operation failed', type: 'error' });
        }
    };

    const handleResetPassword = async (userId: number) => {
        if (resetPw.length < 6) {
            setMsg({ text: 'Password must be at least 6 characters', type: 'error' });
            return;
        }
        try {
            await api.resetUserPassword(userId, resetPw);
            setMsg({ text: 'Password reset successfully', type: 'success' });
            setShowResetPw(null);
            setResetPw('');
        } catch (err: unknown) {
            setMsg({ text: err instanceof Error ? err.message : 'Operation failed', type: 'error' });
        }
    };

    if (authLoading || loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-8 w-48 bg-gray-200 rounded" />
                <div className="h-64 bg-gray-200 rounded-xl" />
            </div>
        );
    }

    if (!isOwner) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <p className="text-4xl mb-4">🔒</p>
                    <h2 className="text-xl font-semibold text-gray-800">Admin Access Only</h2>
                    <p className="text-sm text-gray-500 mt-2">Only the admin can manage team members.</p>
                </div>
            </div>
        );
    }

    const activeUsers = users.filter(u => u.role !== 'owner');
    const adminUser = users.find(u => u.role === 'owner');

    const roleBadge = (role: string) => {
        switch (role) {
            case 'owner': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider">Admin</span>;
            case 'co-owner': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wider">Co-Admin</span>;
            case 'teacher': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider">Teacher</span>;
            case 'accountant': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wider">Accountant</span>;
            case 'front_desk': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-700 uppercase tracking-wider">Front Desk</span>;
            case 'hr_manager': return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider">HR Manager</span>;
            default: return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wider">{role}</span>;
        }
    };

    return (
        <div className="space-y-6 max-w-6xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Create and manage employee accounts</p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="px-5 py-2.5 bg-[#6c5ce7] text-white text-sm font-medium rounded-xl hover:bg-[#5a4bd1] transition-colors shadow-sm w-fit"
                >
                    {showCreate ? '✕ Cancel' : '+ Add Employee'}
                </button>
            </div>

            {/* Messages */}
            {msg.text && (
                <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {msg.text}
                </div>
            )}

            {/* Create Form */}
            {showCreate && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Employee Account</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Full Name *</label>
                                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" placeholder="Ram Sharma" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Username *</label>
                                <input type="text" required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" placeholder="ram.sharma" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Password *</label>
                                <input type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" placeholder="••••••••" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Role *</label>
                                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7] bg-white">
                                    <option value="teacher">Teacher</option>
                                    <option value="co-owner">Co-Admin (Full Access)</option>
                                    <option value="accountant">Accountant</option>
                                    <option value="front_desk">Front Desk</option>
                                    <option value="hr_manager">HR Manager</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                                <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" placeholder="9876543210" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Designation</label>
                                <input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#6c5ce7]/20 focus:border-[#6c5ce7]" placeholder="PGT Mathematics" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-[#6c5ce7] text-white text-sm font-medium rounded-lg hover:bg-[#5a4bd1] transition-colors">Create Account</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">Total Employees</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{activeUsers.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">Active</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{activeUsers.filter(u => u.is_active).length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">Co-Admins</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{activeUsers.filter(u => u.role === 'co-owner').length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500">Teachers</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{activeUsers.filter(u => u.role === 'teacher').length}</p>
                </div>
            </div>

            {/* Team Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">All Employees</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/80">
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {/* Admin row */}
                            {adminUser && (
                                <tr className="bg-amber-50/30">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                                {adminUser.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{adminUser.name}</p>
                                                <p className="text-xs text-gray-400">@{adminUser.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">{roleBadge('owner')}</td>
                                    <td className="px-6 py-4"><span className="text-emerald-600 text-xs font-medium">● Active</span></td>
                                    <td className="px-6 py-4 text-xs text-gray-400">{new Date(adminUser.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right text-xs text-gray-400">—</td>
                                </tr>
                            )}

                            {/* Other users */}
                            {activeUsers.map(u => (
                                <tr key={u.id} className={!u.is_active ? 'opacity-50 bg-gray-50/50' : 'hover:bg-gray-50/50'}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${u.role === 'co-owner' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                                                {u.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{u.name}</p>
                                                <p className="text-xs text-gray-400">@{u.username}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {roleBadge(u.role)}
                                    </td>
                                    <td className="px-6 py-4">
                                        {u.is_active
                                            ? <span className="text-emerald-600 text-xs font-medium">● Active</span>
                                            : <span className="text-red-500 text-xs font-medium">● Inactive</span>}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Promote / Demote */}
                                            {u.role === 'teacher' ? (
                                                <button onClick={() => handleRoleChange(u.id, 'co-owner')}
                                                    className="px-2 py-1 text-[10px] font-medium bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors"
                                                    title="Promote to Co-Admin">
                                                    ↑ Promote
                                                </button>
                                            ) : u.role === 'co-owner' ? (
                                                <button onClick={() => handleRoleChange(u.id, 'teacher')}
                                                    className="px-2 py-1 text-[10px] font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                                                    title="Demote to Teacher">
                                                    ↓ Demote
                                                </button>
                                            ) : null}

                                            {/* Reset Password */}
                                            {showResetPw === u.id ? (
                                                <div className="flex items-center gap-1">
                                                    <input type="password" value={resetPw} onChange={e => setResetPw(e.target.value)}
                                                        className="w-24 px-2 py-1 border border-gray-200 rounded text-xs" placeholder="New password" />
                                                    <button onClick={() => handleResetPassword(u.id)}
                                                        className="px-2 py-1 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors">Save</button>
                                                    <button onClick={() => { setShowResetPw(null); setResetPw(''); }}
                                                        className="px-2 py-1 text-[10px] font-medium bg-gray-50 text-gray-500 rounded-md hover:bg-gray-100 transition-colors">✕</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setShowResetPw(u.id)}
                                                    className="px-2 py-1 text-[10px] font-medium bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                                                    title="Reset Password">
                                                    🔑 Reset
                                                </button>
                                            )}

                                            {/* Activate / Deactivate */}
                                            <button onClick={() => handleToggleActive(u)}
                                                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                                                {u.is_active ? '⏸ Deactivate' : '▶ Activate'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {activeUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                                        No employees yet. Click &quot;+ Add Employee&quot; to create one.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Security Notice */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">🔒 Security Notes</h3>
                <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                    <li><strong>Co-Admin</strong> has the same dashboard access as you, but cannot manage team members or change roles.</li>
                    <li><strong>Teacher</strong> can only access attendance, exams, and notices — no access to financial data.</li>
                    <li>Deactivated users are immediately locked out and cannot log in until reactivated.</li>
                    <li>All actions on this page are logged in the audit trail.</li>
                </ul>
            </div>
        </div>
    );
}
