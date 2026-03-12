'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';
import { authStorage } from '@/lib/authStorage';
import { User } from '@/types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (schoolCode: string, username: string, password: string) => Promise<void>;
    logout: () => void;
    isTenantAdmin: boolean;
    isOwner: boolean;
    isCoOwner: boolean;
    isAdmin: boolean;
    isTeacher: boolean;
    isAccountant: boolean;
    isFrontDesk: boolean;
    isHrManager: boolean;
    isParent: boolean;
    hasAdminAccess: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    login: async () => { /* default noop */ },
    logout: () => { },
    isTenantAdmin: false,
    isOwner: false,
    isCoOwner: false,
    isAdmin: false,
    isTeacher: false,
    isAccountant: false,
    isFrontDesk: false,
    isHrManager: false,
    isParent: false,
    hasAdminAccess: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Try to restore session from cookie (HttpOnly) or stored token
        const token = authStorage.getToken();
        if (!token) {
            Promise.resolve().then(() => setLoading(false));
            return;
        }
        api.getMe()
            .then((userData) => setUser(userData as unknown as User))
            .catch(() => {
                authStorage.clear();
            })
            .finally(() => setLoading(false));
    }, []);

    const login = async (schoolCode: string, username: string, password: string) => {
        const data = await api.login(schoolCode, username, password);
        authStorage.setAuth(data.token, data.refreshToken || '', data.user);
        setUser(data.user as unknown as User);
    };

    const logout = () => {
        // Call logout endpoint to clear HttpOnly cookies, then clear local state
        api.logout().catch(() => { /* ignore errors */ }).finally(() => {
            authStorage.clear();
            setUser(null);
            window.location.href = '/login';
        });
    };

    const isTenantAdmin = user?.role === 'tenant_admin';
    const isOwner = user?.role === 'owner';
    const isCoOwner = user?.role === 'co-owner';
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    const isTeacher = user?.role === 'teacher';
    const isAccountant = user?.role === 'accountant';
    const isFrontDesk = user?.role === 'front_desk';
    const isHrManager = user?.role === 'hr_manager';
    const isParent = user?.role === 'parent';
    const hasAdminAccess = isTenantAdmin || isOwner || isCoOwner || isAdmin;

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            isTenantAdmin,
            isOwner,
            isCoOwner,
            isAdmin,
            isTeacher,
            isAccountant,
            isFrontDesk,
            isHrManager,
            isParent,
            hasAdminAccess,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
