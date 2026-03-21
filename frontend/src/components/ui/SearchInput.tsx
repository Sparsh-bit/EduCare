'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    debounceMs?: number;
    onChange: (value: string) => void;
    className?: string;
    size?: 'sm' | 'md';
    autoFocus?: boolean;
}

export function SearchInput({
    value: controlledValue,
    defaultValue = '',
    placeholder = 'Search...',
    debounceMs = 300,
    onChange,
    className = '',
    size = 'md',
    autoFocus,
}: SearchInputProps) {
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState(controlledValue ?? defaultValue);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (isControlled) setInternalValue(controlledValue!);
    }, [controlledValue, isControlled]);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            if (!isControlled) setInternalValue(val);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => onChange(val), debounceMs);
        },
        [isControlled, onChange, debounceMs],
    );

    const handleClear = useCallback(() => {
        if (!isControlled) setInternalValue('');
        if (debounceRef.current) clearTimeout(debounceRef.current);
        onChange('');
    }, [isControlled, onChange]);

    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    const sizeClasses = size === 'sm'
        ? 'h-8 text-xs pl-8 pr-7'
        : 'h-9 text-sm pl-9 pr-8';

    const iconSize = size === 'sm' ? 13 : 15;
    const iconLeft = size === 'sm' ? 'left-2.5' : 'left-3';
    const clearRight = size === 'sm' ? 'right-1.5' : 'right-2';

    return (
        <div className={`relative ${className}`}>
            <Search
                size={iconSize}
                className={`absolute ${iconLeft} top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none`}
            />
            <input
                type="text"
                value={internalValue}
                onChange={handleChange}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className={`w-full ${sizeClasses} bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all`}
                style={{ '--tw-ring-color': 'var(--color-brand-500)' } as React.CSSProperties}
            />
            {internalValue && (
                <button
                    onClick={handleClear}
                    className={`absolute ${clearRight} top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded transition-colors`}
                    aria-label="Clear search"
                >
                    <X size={iconSize - 1} />
                </button>
            )}
        </div>
    );
}

export default SearchInput;
