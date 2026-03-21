import React from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    iconBg?: string;
    change?: {
        value: number;
        label?: string;
        direction?: 'up' | 'down' | 'neutral';
    };
    href?: string;
    className?: string;
}

export function StatCard({
    title,
    value,
    subtitle,
    icon,
    iconBg = 'bg-brand-50',
    change,
    href,
    className = '',
}: StatCardProps) {
    const changeDir = change?.direction ??
        (change && change.value > 0 ? 'up' : change && change.value < 0 ? 'down' : 'neutral');

    const changeColors = {
        up: 'text-emerald-600 bg-emerald-50',
        down: 'text-red-600 bg-red-50',
        neutral: 'text-gray-500 bg-gray-100',
    };

    const ChangeIcon = changeDir === 'up' ? TrendingUp : changeDir === 'down' ? TrendingDown : Minus;

    const content = (
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow ${className}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-gray-900 leading-tight truncate">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                    )}
                    {change !== undefined && (
                        <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-semibold ${changeColors[changeDir]}`}>
                            <ChangeIcon size={11} />
                            {Math.abs(change.value)}%
                            {change.label && <span className="font-normal opacity-75 ml-0.5">{change.label}</span>}
                        </div>
                    )}
                </div>
                {icon && (
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );

    if (href) {
        return <Link href={href} className="block">{content}</Link>;
    }
    return content;
}

export default StatCard;
