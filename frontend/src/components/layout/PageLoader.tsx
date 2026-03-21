export default function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="flex flex-col items-center gap-5">
                <span className="text-2xl font-bold text-[#6c5ce7]">EduCare</span>
                <div className="flex gap-2">
                    {[0, 1, 2].map(i => (
                        <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-[#6c5ce7] animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
