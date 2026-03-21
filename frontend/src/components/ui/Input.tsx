'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-3.5 text-sm',
  lg: 'h-11 px-4 text-base',
};

export function Input({
  label,
  hint,
  error,
  leftElement,
  rightElement,
  size = 'md',
  disabled,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
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
        {leftElement && (
          <span className="pl-3 flex-shrink-0 text-[var(--color-neutral-400)]">
            {leftElement}
          </span>
        )}
        <input
          {...props}
          id={inputId}
          disabled={disabled}
          className={[
            'w-full bg-transparent outline-none flex-1',
            'text-[var(--color-text-primary)] placeholder:text-[var(--color-neutral-400)]',
            sizeClasses[size],
            leftElement ? 'pl-2' : '',
            rightElement ? 'pr-2' : '',
            disabled ? 'cursor-not-allowed' : '',
            className,
          ].join(' ')}
        />
        {rightElement && (
          <span className="pr-3 flex-shrink-0 text-[var(--color-neutral-400)]">
            {rightElement}
          </span>
        )}
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
