"use client";

import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "EduCare has completely revolutionized our administrative workflow. The AI-driven insights are a game-changer for student performance tracking.",
    author: "Dr. Priya Sharma",
    role: "Director, St. Xavier's International",
    avatar: "https://i.pravatar.cc/150?u=priya",
  },
  {
    quote:
      "The seamless integration of attendance and fee management has saved us hundreds of man-hours every month. Support from Concilio is exceptional.",
    author: "Mr. Rajesh Khanna",
    role: "Administrator, Global Public School",
    avatar: "https://i.pravatar.cc/150?u=rajesh",
  },
  {
    quote:
      "We've seen a 40% increase in fee recovery within just three months of implementation. EduCare is the most robust ERP we've ever used.",
    author: "Ms. Anita Desai",
    role: "Principal, Bright Future Academy",
    avatar: "https://i.pravatar.cc/150?u=anita",
  },
];

const Testimonials = () => {
  return (
    <section className="bg-slate-900 py-32 relative overflow-hidden">
      <div className="premium-noise opacity-5" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-extrabold text-white mb-6"
          >
            Trusted by Excellence
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-xl max-w-2xl mx-auto font-medium"
          >
            EduCare is the choice of India&apos;s leading educational institutions
            committed to digital transformation.
          </motion.p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.15 }}
              className="glass-dark p-8 rounded-[32px] border-white/5 flex flex-col gap-8 hover:border-indigo-500/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Quote size={24} fill="currentColor" />
              </div>
              
              <p className="text-lg text-slate-300 font-medium leading-relaxed flex-1">
                &ldquo;{t.quote}&rdquo;
              </p>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30 p-0.5 overflow-hidden">
                  <img src={t.avatar} alt={t.author} className="w-full h-full object-cover rounded-full shadow-lg" />
                </div>
                <div>
                  <p className="text-base font-bold text-white leading-tight">
                    {t.author}
                  </p>
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">
                    {t.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
