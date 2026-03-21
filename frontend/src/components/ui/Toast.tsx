'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
    return (
        <Toaster
            position="bottom-right"
            gutter={8}
            toastOptions={{
                duration: 4000,
                style: {
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '500',
                    padding: '12px 16px',
                    background: '#ffffff',
                    color: '#111827',
                    border: '1px solid #f3f4f6',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    maxWidth: '360px',
                },
                success: {
                    iconTheme: { primary: '#10b981', secondary: '#ffffff' },
                },
                error: {
                    iconTheme: { primary: '#ef4444', secondary: '#ffffff' },
                },
            }}
        />
    );
}

export default ToastProvider;
