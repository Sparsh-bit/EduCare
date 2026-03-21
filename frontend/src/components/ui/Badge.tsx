import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
  size?: 'sm' | 'md';
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)]',
  success: 'bg-[var(--color-success-50)] text-[var(--color-success-600)]',
  warning: 'bg-[var(--color-warning-50)] text-[var(--color-warning-600)]',
  danger:  'bg-[var(--color-danger-50)] text-[var(--color-danger-600)]',
  info:    'bg-[var(--color-info-50)] text-[var(--color-info-600)]',
  brand:   'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]',
};

const dotColors: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-[var(--color-neutral-400)]',
  success: 'bg-[var(--color-success-500)]',
  warning: 'bg-[var(--color-warning-500)]',
  danger:  'bg-[var(--color-danger-500)]',
  info:    'bg-[var(--color-info-500)]',
  brand:   'bg-[var(--color-brand-500)]',
};

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export function Badge({
  variant = 'default',
  size = 'md',
  dot = false,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={['w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant]].join(' ')}
        />
      )}
      {children}
    </span>
  );
}
