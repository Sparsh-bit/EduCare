import React from 'react';

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

interface CardProps {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Card({ padding = 'md', hover = false, className = '', children }: CardProps) {
  return (
    <div
      className={[
        'bg-white border rounded-xl shadow-[var(--shadow-sm)]',
        'border-[var(--color-border)]',
        hover ? 'transition-shadow duration-[200ms] hover:shadow-[var(--shadow-md)] cursor-pointer' : '',
        paddingClasses[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}
export function CardHeader({ className = '', children }: CardHeaderProps) {
  return (
    <div className={['flex items-start justify-between pb-4 border-b border-[var(--color-neutral-100)]', className].join(' ')}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}
export function CardTitle({ className = '', children }: CardTitleProps) {
  return (
    <h3 className={['text-base font-semibold text-[var(--color-text-primary)]', className].join(' ')}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  className?: string;
  children: React.ReactNode;
}
export function CardDescription({ className = '', children }: CardDescriptionProps) {
  return (
    <p className={['text-sm text-[var(--color-neutral-500)] mt-0.5', className].join(' ')}>
      {children}
    </p>
  );
}

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}
export function CardContent({ className = '', children }: CardContentProps) {
  return <div className={['pt-4', className].join(' ')}>{children}</div>;
}

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}
export function CardFooter({ className = '', children }: CardFooterProps) {
  return (
    <div className={['pt-4 border-t border-[var(--color-neutral-100)] flex items-center gap-3', className].join(' ')}>
      {children}
    </div>
  );
}
