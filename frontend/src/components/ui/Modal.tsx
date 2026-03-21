'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlay?: boolean;
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  full: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  closeOnOverlay = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length) focusable[0].focus();
  }, [open]);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-[var(--color-neutral-900)]/50 backdrop-blur-sm"
            onClick={closeOnOverlay ? onClose : undefined}
            aria-hidden="true"
          />
          {/* Panel container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="panel"
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
              className={['bg-white rounded-2xl shadow-[var(--shadow-xl)] w-full pointer-events-auto', sizeClasses[size]].join(' ')}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'modal-title' : undefined}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {(title || description) && (
                <div className="px-6 pt-6 pb-4 flex items-start justify-between">
                  <div>
                    {title && (
                      <h2 id="modal-title" className="text-lg font-semibold text-[var(--color-text-primary)]">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="text-sm text-[var(--color-neutral-500)] mt-1">{description}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={onClose} className="ml-4 flex-shrink-0 -mt-1 -mr-2">
                    <X size={16} />
                  </Button>
                </div>
              )}
              {/* Body */}
              <div className="px-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
                {!(title || description) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="absolute top-4 right-4"
                  >
                    <X size={16} />
                  </Button>
                )}
                {children}
              </div>
              {/* Footer */}
              {footer && (
                <div className="px-6 py-4 border-t border-[var(--color-neutral-100)] flex items-center justify-end gap-3">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
