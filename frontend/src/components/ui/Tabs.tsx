'use client';

import React, { createContext, useContext, useId } from 'react';
import { motion } from 'framer-motion';

interface Tab {
    value: string;
    label: string;
    count?: number;
    disabled?: boolean;
}

interface TabsContextValue {
    value: string;
    onChange: (value: string) => void;
    variant: 'line' | 'pills';
    layoutId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs() {
    const ctx = useContext(TabsContext);
    if (!ctx) throw new Error('Tabs subcomponents must be used inside <Tabs>');
    return ctx;
}

interface TabsProps {
    value: string;
    onChange: (value: string) => void;
    tabs: Tab[];
    variant?: 'line' | 'pills';
    className?: string;
}

export function Tabs({ value, onChange, tabs, variant = 'line', className = '' }: TabsProps) {
    const layoutId = useId();

    return (
        <TabsContext.Provider value={{ value, onChange, variant, layoutId }}>
            <div
                role="tablist"
                className={`flex items-center ${
                    variant === 'line'
                        ? 'border-b border-gray-200 gap-0'
                        : 'bg-gray-100 rounded-xl p-1 gap-1'
                } ${className}`}
            >
                {tabs.map((tab) => (
                    <TabButton key={tab.value} tab={tab} />
                ))}
            </div>
        </TabsContext.Provider>
    );
}

function TabButton({ tab }: { tab: Tab }) {
    const { value, onChange, variant, layoutId } = useTabs();
    const isActive = value === tab.value;

    if (variant === 'line') {
        return (
            <button
                role="tab"
                aria-selected={isActive}
                disabled={tab.disabled}
                onClick={() => !tab.disabled && onChange(tab.value)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <span className="flex items-center gap-1.5">
                    {tab.label}
                    {tab.count !== undefined && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                            isActive ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
                        }`} style={isActive ? { backgroundColor: 'var(--color-brand-100)', color: 'var(--color-brand-700)' } : undefined}>
                            {tab.count}
                        </span>
                    )}
                </span>
                {isActive && (
                    <motion.div
                        layoutId={layoutId}
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--color-brand-500)' }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                )}
            </button>
        );
    }

    return (
        <button
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.value)}
            className={`relative flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
        >
            {isActive && (
                <motion.div
                    layoutId={layoutId}
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5">
                {tab.label}
                {tab.count !== undefined && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                        isActive ? 'bg-gray-200 text-gray-700' : 'bg-gray-200/60 text-gray-500'
                    }`}>
                        {tab.count}
                    </span>
                )}
            </span>
        </button>
    );
}

export default Tabs;
