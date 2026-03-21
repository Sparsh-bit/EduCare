'use client';

import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown() {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error('DropdownMenu compound component misuse');
  return ctx;
}

interface DropdownMenuProps { children: React.ReactNode; }
export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, []);

  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
      <div ref={containerRef} className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

interface DropdownMenuTriggerProps { children: React.ReactElement<React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }>; asChild?: boolean }
export function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef } = useDropdown();
  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      setOpen(!open);
      (children.props as React.HTMLAttributes<HTMLElement>).onClick?.(e as React.MouseEvent<HTMLElement>);
    },
    ref: triggerRef,
    'aria-expanded': open,
    'aria-haspopup': true as const,
  });
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}
export function DropdownMenuContent({ children, align = 'right', className = '' }: DropdownMenuContentProps) {
  const { open } = useDropdown();
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.12, ease: [0.4, 0, 0.2, 1] } }}
          exit={{ opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.1 } }}
          className={[
            'absolute top-full mt-1.5 z-50',
            'bg-white border border-[var(--color-neutral-200)] shadow-[var(--shadow-lg)]',
            'rounded-xl py-1.5 min-w-[10rem]',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          ].join(' ')}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}
export function DropdownMenuItem({ children, onClick, variant = 'default', leftIcon, rightIcon, className = '' }: DropdownMenuItemProps) {
  const { setOpen } = useDropdown();
  const handleClick = useCallback(() => {
    onClick?.();
    setOpen(false);
  }, [onClick, setOpen]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        'flex items-center gap-2.5 w-full px-3 py-2 text-sm rounded-lg mx-1',
        'transition-colors duration-[100ms] cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        variant === 'danger'
          ? 'text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)]'
          : 'text-[var(--color-neutral-700)] hover:bg-[var(--color-neutral-100)]',
        className,
      ].join(' ')}
      style={{ width: 'calc(100% - 0.5rem)' }}
    >
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      <span className="flex-1 text-left">{children}</span>
      {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-[var(--color-neutral-100)] my-1" />;
}

interface DropdownMenuLabelProps { children: React.ReactNode }
export function DropdownMenuLabel({ children }: DropdownMenuLabelProps) {
  return (
    <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-neutral-400)]">
      {children}
    </div>
  );
}
