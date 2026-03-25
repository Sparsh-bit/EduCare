'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center p-12">
                <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="text-8xl font-black text-slate-200 leading-none mb-6 select-none"
                >
                    404
                </motion.div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
                <p className="text-slate-500 mb-8">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
                <Link
                    href="/dashboard"
                    className="inline-flex items-center px-6 py-3 bg-[#6c5ce7] text-white rounded-xl font-medium hover:bg-[#5b4bd5] transition-colors"
                >
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}
