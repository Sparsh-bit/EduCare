const schools = [
    "St. Xavier's High School",
    "Delhi Public School",
    "Kendriya Vidyalaya",
    "Ryan International",
    "Modern Senior Secondary",
    "Guru Nanak Public School",
    "Holy Cross Convent",
    "Carmel Convent School",
    "Army Public School",
    "DAV School",
];

function SchoolTile({ name }: { name: string }) {
    return (
        <div className="rounded-lg border border-neutral-200 px-5 py-2.5 text-sm font-medium text-neutral-500 whitespace-nowrap bg-neutral-50 shrink-0">
            {name}
        </div>
    );
}

export default function LogoStrip() {
    return (
        <section className="bg-white py-12 border-y border-neutral-100 overflow-hidden">
            <p className="text-center text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-8">
                Trusted by schools across India
            </p>
            <div
                className="flex gap-4 w-max group"
                style={{
                    animation: 'marquee 25s linear infinite',
                }}
                onMouseEnter={e => (e.currentTarget.style.animationPlayState = 'paused')}
                onMouseLeave={e => (e.currentTarget.style.animationPlayState = 'running')}
            >
                {[...schools, ...schools].map((name, i) => (
                    <SchoolTile key={i} name={name} />
                ))}
            </div>
            <style>{`
                @keyframes marquee {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
            `}</style>
        </section>
    );
}
