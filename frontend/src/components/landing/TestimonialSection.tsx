'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Avatar } from '@/components/ui/Avatar';

const testimonials = [
    {
        quote: 'Finally an ERP that understands Indian schools. The CBSE report card generation alone saved us 3 days every term. The fee management is exactly what we needed — installments, late fees, everything.',
        name: 'Priya Sharma',
        role: 'Principal',
        school: 'Modern Senior Secondary School, Delhi',
    },
    {
        quote: 'Switching from paper registers to EduCare took one weekend. The bulk import for 1,200 students worked flawlessly. Our parents love receiving attendance alerts on WhatsApp.',
        name: 'Rajesh Kumar',
        role: 'Administrator',
        school: 'Sunrise Public School, Lucknow',
    },
    {
        quote: 'The multi-role system is perfect — teachers only see their classes, accountants see fees, and I get the full picture. Security and role separation is exactly right for a school.',
        name: 'Anjali Mehta',
        role: 'School Owner',
        school: 'Greenfield Academy, Pune',
    },
];

export default function TestimonialSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: '-80px' });

    return (
        <section className="bg-white py-24 px-6">
            <h2 className="text-3xl font-bold text-neutral-900 text-center">
                What school administrators say
            </h2>

            <motion.div
                ref={ref}
                initial="initial"
                animate={isInView ? 'animate' : 'initial'}
                variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
                className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
            >
                {testimonials.map((t) => (
                    <motion.div
                        key={t.name}
                        variants={{
                            initial: { opacity: 0, y: 20 },
                            animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
                        }}
                        className="bg-neutral-50 rounded-2xl p-6 border border-neutral-200 flex flex-col"
                    >
                        <div className="text-amber-400 text-lg tracking-wider">★★★★★</div>
                        <p className="text-base text-neutral-700 leading-relaxed mt-3 italic flex-1">
                            &ldquo;{t.quote}&rdquo;
                        </p>
                        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-neutral-200">
                            <Avatar name={t.name} size="sm" />
                            <div>
                                <p className="text-sm font-semibold text-neutral-900">{t.name}</p>
                                <p className="text-xs text-neutral-500">{t.role} · {t.school}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>
        </section>
    );
}
