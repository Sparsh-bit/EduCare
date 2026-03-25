import FrontDeskNav from '@/components/front-desk/FrontDeskNav';

export default function FrontDeskLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Front Desk</h1>
                <p className="text-sm text-slate-500 mt-0.5">Manage enquiries, gate passes, visitors, postal, and lost & found</p>
            </div>
            <FrontDeskNav />
            <div>{children}</div>
        </div>
    );
}
