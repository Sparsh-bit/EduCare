'use client';

import { useRef, useCallback, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmOptions {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'danger';
}

interface ConfirmDialogProps extends ConfirmOptions {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    loading?: boolean;
}

export function ConfirmDialog({
    open, onClose, onConfirm,
    title, description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    loading = false,
}: ConfirmDialogProps) {
    return (
        <Modal open={open} onClose={onClose} size="sm">
            <div className="py-4">
                {variant === 'danger' && (
                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={22} className="text-rose-500" />
                    </div>
                )}
                <h3 className="text-base font-semibold text-slate-900 text-center mb-2">{title}</h3>
                {description && (
                    <p className="text-sm text-slate-500 text-center">{description}</p>
                )}
                <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        className="flex-1"
                        disabled={loading}
                    >
                        {loading ? 'Please wait…' : confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

export function useConfirm() {
    const [state, setState] = useState<{
        open: boolean;
        options: ConfirmOptions;
        loading: boolean;
    }>({ open: false, options: { title: '' }, loading: false });

    const resolverRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        setState({ open: true, options, loading: false });
        return new Promise<boolean>(resolve => {
            resolverRef.current = resolve;
        });
    }, []);

    const handleClose = useCallback(() => {
        setState(prev => ({ ...prev, open: false }));
        resolverRef.current?.(false);
        resolverRef.current = null;
    }, []);

    const handleConfirm = useCallback(() => {
        resolverRef.current?.(true);
        resolverRef.current = null;
        setState(prev => ({ ...prev, open: false, loading: false }));
    }, []);

    const ConfirmDialogComponent = (
        <ConfirmDialog
            open={state.open}
            onClose={handleClose}
            onConfirm={handleConfirm}
            loading={state.loading}
            {...state.options}
        />
    );

    return { confirm, ConfirmDialogComponent };
}
