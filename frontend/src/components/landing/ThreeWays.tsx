"use client";

import React from "react";
import { motion } from "framer-motion";
import { Clock, TrendingUp, HandCoins, ArrowUpRight, ShieldCheck } from "lucide-react";

const ThreeWays = () => {
  return (
    <section className="py-40 bg-[#003d73] text-white relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#003d73] via-[#002b52] to-[#003d73]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] bg-blue-400/10 rounded-full blur-[160px] animate-pulse" />
        <div className="landing-grid-overlay opacity-10" />
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#84cc16] mb-8 block">Economic Advantage</span>
            <h2 className="text-5xl lg:text-8xl font-black mb-10 leading-[0.9] tracking-tighter">
                Measured Impact. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/40">Guaranteed Return.</span>
            </h2>
            <p className="text-xl text-blue-100/50 font-bold max-w-2xl leading-relaxed">
              We provide the framework for absolute institutional efficiency, reducing operational friction across every department.
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {[
            {
              icon: <Clock size={40} />,
              title: "Temporal Capture",
              desc: "Automate gradebooks, attendance, and record-keeping protocols. Save over 25 hours per week in human resource effort.",
              benefit: "25hr/wk Reclaimed"
            },
            {
              icon: <TrendingUp size={40} />,
              title: "Elastic Scaling",
              desc: "Expand to multi-campus architectures without infrastructure overhead. Zero-latency synchronization across nodes.",
              benefit: "Infinite Nodes"
            },
            {
              icon: <HandCoins size={40} />,
              title: "Fiscal Precision",
              desc: "Deploy automated billing cycles and instant digital receipts. Increase collection efficiency by an average of 12%.",
              benefit: "+12% Revenue Uplift"
            }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.8 }}
              viewport={{ once: true }}
              className="group p-12 rounded-[3rem] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#84cc16]/40 transition-all duration-700 flex flex-col justify-between overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                  <ShieldCheck size={80} className="text-white" />
              </div>

              <div className="relative z-10">
                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-[#84cc16] mb-12 group-hover:bg-[#84cc16] group-hover:text-white transition-all duration-500 shadow-2xl">
                  {item.icon}
                </div>
                <h3 className="text-3xl font-black mb-8 leading-none tracking-tighter">{item.title}</h3>
                <p className="text-blue-100/50 font-bold leading-relaxed mb-12">
                  {item.desc}
                </p>
              </div>
              
              <div className="flex items-center justify-between pt-10 border-t border-white/5 relative z-10">
                <span className="text-[10px] font-black text-[#84cc16] uppercase tracking-[0.2em]">{item.benefit}</span>
                <div className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-500">
                  <ArrowUpRight size={20} className="group-hover:text-[#003d73] transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ThreeWays;
