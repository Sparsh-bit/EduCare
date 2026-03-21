import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  circle?: boolean;
}

export function Skeleton({ className = '', width, height, rounded = false, circle = false }: SkeletonProps) {
  return (
    <div
      className={[
        'relative overflow-hidden bg-[var(--color-neutral-200)]',
        circle ? 'rounded-full' : rounded ? 'rounded-full' : 'rounded-md',
        className,
      ].join(' ')}
      style={{ width, height }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
          animation: 'shimmer 1.5s infinite',
        }}
      />
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps) {
  const widths = ['100%', '85%', '92%', '78%', '88%', '95%', '70%'];
  return (
    <div className={['space-y-2', className].join(' ')}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.875rem"
          width={widths[i % widths.length]}
        />
      ))}
    </div>
  );
}
