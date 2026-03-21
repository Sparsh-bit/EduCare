'use client';

import React from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  options?: { value: string | number; label: string }[];
}

const sizeClasses = {
  sm: 'h-8 pl-3 pr-8 text-sm',
  md: 'h-10 pl-3.5 pr-9 text-sm',
  lg: 'h-11 pl-4 pr-10 text-base',
};

export function Select({
  label,
  hint,
  error,
  size = 'md',
  disabled,
  options,
  className = '',
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--color-neutral-700)' }}
        >
          {label}
        </label>
      )}
      <div
        className={[
          'relative flex items-center rounded-lg border transition-all',
          'duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          hasError
            ? 'border-[var(--color-danger-500)] ring-1 ring-[var(--color-danger-500)]/20'
            : 'border-[var(--color-border)] focus-within:border-[var(--color-brand-500)] focus-within:ring-1 focus-within:ring-[var(--color-brand-500)]/20',
          disabled ? 'bg-[var(--color-neutral-50)] cursor-not-allowed' : 'bg-white',
        ].join(' ')}
      >
        <select
          {...props}
          id={selectId}
          disabled={disabled}
          className={[
            'w-full bg-transparent outline-none appearance-none',
            'text-[var(--color-text-primary)]',
            sizeClasses[size],
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',
            className,
          ].join(' ')}
        >
          {options
            ? options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))
            : children}
        </select>
        <span className="pointer-events-none absolute right-3 flex-shrink-0 text-[var(--color-neutral-400)]">
          <ChevronDown size={16} />
        </span>
      </div>
      {hint && !error && (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-neutral-500)' }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="mt-1.5 text-xs flex items-center gap-1" style={{ color: 'var(--color-danger-600)' }}>
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}
