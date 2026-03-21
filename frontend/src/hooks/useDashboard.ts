'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { DashboardStats, Exam } from '@/lib/types';

export interface ActivityItem {
    type: string;
    description: string;
    created_at: string;
}

export interface DashboardData {
    stats: DashboardStats;
    upcomingExams: Exam[];
    recentActivity: ActivityItem[];
}

interface UseDashboardReturn {
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
    refresh: () => void;
}

export function useDashboard(): UseDashboardReturn {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [stats, upcomingExams, activityRes] = await Promise.all([
                api.getDashboardStats(),
                api.getUpcomingExams().catch(() => [] as Exam[]),
                api.getRecentActivity().catch(() => ({ data: [] as ActivityItem[] })),
            ]);
            setData({
                stats,
                upcomingExams: Array.isArray(upcomingExams) ? upcomingExams : [],
                recentActivity: Array.isArray(activityRes?.data) ? activityRes.data : [],
            });
        } catch {
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return { data, loading, error, refresh: load };
}
