'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:   'bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] active:scale-[0.98]',
  secondary: 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)] hover:bg-[var(--color-brand-100)]',
  ghost:     'bg-transparent text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-100)] hover:text-[var(--color-neutral-900)]',
  danger:    'bg-[var(--color-danger-500)] text-white hover:bg-[var(--color-danger-600)] active:scale-[0.98]',
  success:   'bg-[var(--color-success-500)] text-white hover:bg-[var(--color-success-600)] active:scale-[0.98]',
  outline:   'bg-transparent border border-[var(--color-neutral-300)] text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-50)]',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-md',
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-9 px-4 text-sm gap-2 rounded-lg',
  lg: 'h-11 px-5 text-base gap-2 rounded-lg',
};

const spinnerSizes: Record<NonNullable<ButtonProps['size']>, number> = {
  xs: 12, sm: 14, md: 14, lg: 16,
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerSize = spinnerSizes[size];

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2',
        'select-none',
        variantClasses[variant],
        sizeClasses[size],
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading ? (
        <span
          className="animate-spin rounded-full border-2 border-current border-t-transparent flex-shrink-0"
          style={{ width: spinnerSize, height: spinnerSize }}
          aria-hidden="true"
        />
      ) : (
        leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
      )}
      {children}
      {rightIcon && !loading && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
}
