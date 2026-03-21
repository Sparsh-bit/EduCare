'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-3.5 py-2.5 text-sm',
  lg: 'px-4 py-3 text-base',
};

export function Textarea({
  label,
  hint,
  error,
  size = 'md',
  disabled,
  rows = 3,
  className = '',
  id,
  ...props
}: TextareaProps) {
  const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'var(--color-neutral-700)' }}
        >
          {label}
        </label>
      )}
      <div
        className={[
          'rounded-lg border transition-all',
          'duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
          hasError
            ? 'border-[var(--color-danger-500)] ring-1 ring-[var(--color-danger-500)]/20'
            : 'border-[var(--color-border)] focus-within:border-[var(--color-brand-500)] focus-within:ring-1 focus-within:ring-[var(--color-brand-500)]/20',
          disabled ? 'bg-[var(--color-neutral-50)]' : 'bg-white',
        ].join(' ')}
      >
        <textarea
          {...props}
          id={textareaId}
          disabled={disabled}
          rows={rows}
          className={[
            'w-full bg-transparent outline-none resize-y',
            'text-[var(--color-text-primary)] placeholder:text-[var(--color-neutral-400)]',
            sizeClasses[size],
            disabled ? 'cursor-not-allowed' : '',
            className,
          ].join(' ')}
        />
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
