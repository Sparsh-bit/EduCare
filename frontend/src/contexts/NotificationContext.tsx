'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

export type NotifType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
    id: string;
    type: NotifType;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
}

interface NotificationContextValue {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (type: NotifType, title: string, message?: string) => void;
    markAllRead: () => void;
    dismiss: (id: string) => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = 'educare_notifications';
const MAX_STORED = 50;

function loadFromStorage(): Notification[] {
    try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        return raw ? (JSON.parse(raw) as Notification[]) : [];
    } catch {
        return [];
    }
}

function saveToStorage(notifications: Notification[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_STORED)));
    } catch {
        // storage quota exceeded — ignore
    }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const initialized = useRef(false);

    useEffect(() => {
        if (!initialized.current) {
            initialized.current = true;
            setNotifications(loadFromStorage());
        }
    }, []);

    const persist = useCallback((next: Notification[]) => {
        setNotifications(next);
        saveToStorage(next);
    }, []);

    const addNotification = useCallback(
        (type: NotifType, title: string, message = '') => {
            const n: Notification = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                type,
                title,
                message,
                timestamp: Date.now(),
                read: false,
            };
            setNotifications((prev) => {
                const next = [n, ...prev].slice(0, MAX_STORED);
                saveToStorage(next);
                return next;
            });
        },
        []
    );

    const markAllRead = useCallback(() => {
        setNotifications((prev) => {
            const next = prev.map((n) => ({ ...n, read: true }));
            saveToStorage(next);
            return next;
        });
    }, []);

    const dismiss = useCallback((id: string) => {
        setNotifications((prev) => {
            const next = prev.filter((n) => n.id !== id);
            saveToStorage(next);
            return next;
        });
    }, []);

    const clearAll = useCallback(() => {
        persist([]);
    }, [persist]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, dismiss, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
    return ctx;
}
