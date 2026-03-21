'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Shield, Users, Mail, Package } from 'lucide-react';

const NAV_ITEMS = [
    { href: '/front-desk/enquiry', label: 'Enquiry', icon: ClipboardList },
    { href: '/front-desk/gate-pass', label: 'Gate Pass', icon: Shield },
    { href: '/front-desk/visitors', label: 'Visitors', icon: Users },
    { href: '/front-desk/postal', label: 'Postal', icon: Mail },
    { href: '/front-desk/lost-found', label: 'Lost & Found', icon: Package },
];

export default function FrontDeskNav() {
    const pathname = usePathname();
    return (
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit overflow-x-auto scrollbar-hide">
            {NAV_ITEMS.map(item => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                            active
                                ? 'bg-white text-[#6c5ce7] shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <Icon size={14} />
                        {item.label}
                    </Link>
                );
            })}
        </div>
    );
}
