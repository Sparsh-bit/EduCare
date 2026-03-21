import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={['flex flex-col items-center justify-center py-16 text-center', className].join(' ')}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-neutral-100)] flex items-center justify-center mb-4 text-[var(--color-neutral-400)]">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-[var(--color-text-primary)]">{title}</p>
      {description && (
        <p className="text-sm text-[var(--color-neutral-500)] mt-1 max-w-sm">{description}</p>
      )}
      {action && (
        <Button variant={action.variant ?? 'primary'} onClick={action.onClick} className="mt-6">
          {action.label}
        </Button>
      )}
    </div>
  );
}
