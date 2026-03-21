"use client";

import React from "react";
import { motion } from "framer-motion";
import { Globe, Sparkles, ShieldCheck, Zap } from "lucide-react";

const Philosophy = () => {
  return (
    <section id="solutions" className="py-40 bg-gray-50/50 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#84cc16]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-24">
          <div className="lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#003d73]/5 text-[#003d73] text-[10px] font-black uppercase tracking-[0.3em] mb-8">
                <ShieldCheck size={14} className="text-[#84cc16]" />
                Architectural Integrity
              </div>
              <h2 className="text-5xl lg:text-7xl font-black text-[#003d73] mb-10 leading-[0.9] tracking-tighter">
                Scale your vision, <br /> <span className="text-gradient">not your friction.</span>
              </h2>
              <p className="text-xl text-gray-400 font-bold mb-12 leading-relaxed">
                EduCare by Concilio is engineered to expand with your institutional ambitions. Our cloud-native infrastructure ensures that whether you are managing a single campus or a global network of branches, the performance remains absolute.
              </p>

              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-4">
                  <div className="w-12 h-1.5 bg-[#84cc16] rounded-full" />
                  <h4 className="text-5xl font-black text-[#003d73] tracking-tighter leading-none">99.9%</h4>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Operational Uptime</p>
                </div>
                <div className="space-y-4">
                  <div className="w-12 h-1.5 bg-[#003d73] rounded-full" />
                  <h4 className="text-5xl font-black text-[#003d73] tracking-tighter leading-none">00:24</h4>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">Setup Latency (Hrs)</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="lg:w-1/2 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true }}
              className="premium-panel p-16 relative overflow-hidden ring-1 ring-[#003d73]/5 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50/50 to-white z-0" />

              <div className="relative z-10 text-center">
                <div className="w-32 h-32 bg-[#003d73] rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl relative group-hover:scale-110 transition-transform duration-700">
                  <div className="absolute inset-0 bg-[#84cc16]/20 rounded-[2.5rem] animate-ping opacity-20" />
                  <Sparkles size={48} className="text-[#84cc16] animate-pulse" />
                </div>
                <h4 className="text-3xl font-black text-[#003d73] mb-4 tracking-tighter uppercase italic">EduCare Enterprise</h4>
                <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.5em] mb-12">Available in 42 regions</p>

                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 3 ? 'bg-[#84cc16]' : 'bg-gray-200'} animate-pulse`} style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>

              {/* Decorative nodes */}
              <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-[#003d73]/10" />
              <div className="absolute bottom-10 right-10 w-2 h-2 rounded-full bg-[#003d73]/10" />
              <div className="absolute top-1/2 left-10 -translate-y-1/2 w-1 h-32 bg-gray-100 rounded-full" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Philosophy;
