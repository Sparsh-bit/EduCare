"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Play, CheckCircle2 } from "lucide-react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
  },
};

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-mesh-light py-20">
      <div className="premium-noise" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-col items-start text-left"
          >
            {/* Badge */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 mb-8 backdrop-blur-sm"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?u=${i + 10}`} alt="User" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <span className="text-sm text-indigo-700 font-semibold">
                Join 200+ elite institutions
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-6xl md:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-8"
            >
              The Future of <br />
              <span className="text-gradient-purple">School Intelligence</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={itemVariants}
              className="text-xl text-slate-600 max-w-xl mb-10 leading-relaxed font-medium"
            >
              EduCare transforms institutional management into a seamless digital experience. 
              Powered by Concilio&apos;s advanced AI infrastructure.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center gap-5 mb-12"
            >
              <Link
                href="/signup"
                className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white text-base font-bold rounded-2xl hover:bg-indigo-600 transition-all duration-300 shadow-xl shadow-slate-200 hover:shadow-indigo-200 hover:-translate-y-1 active:scale-95"
              >
                Launch EduCare
                <ArrowRight size={20} />
              </Link>
              <button className="flex items-center gap-3 px-8 py-4 bg-white text-slate-700 text-base font-bold rounded-2xl border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 transition-all duration-300 shadow-sm active:scale-95">
                <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Play size={16} fill="currentColor" />
                </div>
                Watch Experience
              </button>
            </motion.div>

            {/* Features list */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                "AI-Driven Analytics",
                "Automated Payroll",
                "Instant Fee Recovery",
                "Smart Attendance",
              ].map((text) => (
                <div key={text} className="flex items-center gap-2 group">
                  <CheckCircle2 size={18} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-bold text-slate-500">{text}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Side: Interactive Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            className="relative"
          >
            {/* Decorative background elements */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-20 blur-3xl rounded-full animate-pulse" />
            
            <div className="relative glass p-4 rounded-[32px] border-white/40 shadow-2xl shadow-indigo-100 overflow-hidden">
              <div className="bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-inner">
                {/* Mockup Toolbar */}
                <div className="h-10 bg-slate-50 border-b border-slate-100 flex items-center px-4 gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                </div>

                {/* Mockup Content */}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Academic Overview</h3>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Spring Session 2026</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-indigo-50 rounded-2xl">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 mb-3" />
                      <p className="text-2xl font-bold text-indigo-900">98.4%</p>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase">Avg Attendance</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 mb-3" />
                      <p className="text-2xl font-bold text-emerald-900">₹12.4M</p>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase">Revenue Collected</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center px-4 gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-2 w-1/3 bg-slate-200 rounded" />
                          <div className="h-1.5 w-2/3 bg-slate-100 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating indicator */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="absolute -top-6 -right-6 glass-dark p-4 rounded-2xl shadow-xl border-white/10"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-sm font-bold text-white">Live System Status</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
