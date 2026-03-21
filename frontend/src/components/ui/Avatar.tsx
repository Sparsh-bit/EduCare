import React from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}

const sizePx: Record<NonNullable<AvatarProps['size']>, number> = {
  xs: 24, sm: 32, md: 40, lg: 48, xl: 64,
};

const statusDotSize: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
};

const statusColors: Record<NonNullable<AvatarProps['status']>, string> = {
  online:  'bg-[var(--color-success-500)]',
  offline: 'bg-[var(--color-neutral-400)]',
  away:    'bg-[var(--color-warning-500)]',
  busy:    'bg-[var(--color-danger-500)]',
};

// 8 deterministic background colors for fallback initials
const FALLBACK_BG_COLORS = [
  'var(--color-brand-600)',
  'var(--color-info-500)',
  'var(--color-success-500)',
  'var(--color-warning-500)',
  'var(--color-danger-500)',
  'var(--color-brand-400)',
  'hsl(280 60% 50%)',
  'hsl(200 70% 45%)',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorIndex(name: string): number {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return sum % FALLBACK_BG_COLORS.length;
}

export function Avatar({ src, name, size = 'md', status, className = '' }: AvatarProps) {
  const px = sizePx[size];
  const initials = getInitials(name);
  const bgColor = FALLBACK_BG_COLORS[getColorIndex(name)];
  const fontSize = px <= 24 ? '0.6rem' : px <= 32 ? '0.7rem' : px <= 40 ? '0.8rem' : px <= 48 ? '0.9rem' : '1.1rem';

  return (
    <div
      className={['relative inline-flex flex-shrink-0', className].join(' ')}
      style={{ width: px, height: px }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold select-none"
          style={{ backgroundColor: bgColor, fontSize }}
          aria-label={name}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={[
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white flex-shrink-0',
            statusDotSize[size],
            statusColors[status],
          ].join(' ')}
        />
      )}
    </div>
  );
}
