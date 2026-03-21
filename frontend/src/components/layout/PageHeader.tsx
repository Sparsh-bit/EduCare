import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface Crumb {
    label: string;
    href?: string;
}

interface PageHeaderProps {
    title: string;
    description?: string;
    breadcrumb?: Crumb[];
    actions?: React.ReactNode;
}

export function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
    return (
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
                {breadcrumb && breadcrumb.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                        {breadcrumb.map((crumb, i) => (
                            <span key={i} className="flex items-center gap-1">
                                {i > 0 && <ChevronRight size={10} className="shrink-0" />}
                                {crumb.href
                                    ? <Link href={crumb.href} className="hover:text-slate-600 transition-colors">{crumb.label}</Link>
                                    : <span className="text-slate-600">{crumb.label}</span>
                                }
                            </span>
                        ))}
                    </div>
                )}
                <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
    );
}
