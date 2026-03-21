"use client";

import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Heart, Zap, Globe, Users } from "lucide-react";

const MoreTime = () => {
  const categories = [
    { title: "Family", icon: <Heart className="text-red-400" />, desc: "Spend more quality time with loved ones.", image: "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=400&q=80" },
    { title: "Mentoring", icon: <Users className="text-blue-400" />, desc: "Focus on individual student growth.", image: "https://images.unsplash.com/photo-1524178232363-1fb28f74b0cd?auto=format&fit=crop&w=400&q=80" },
    { title: "Innovation", icon: <Zap className="text-amber-400" />, desc: "Lead your school towards new tech.", image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=400&q=80" },
    { title: "Leadership", icon: <Globe className="text-emerald-400" />, desc: "Execute global expansion strategies.", image: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=400&q=80" },
    { title: "Wellbeing", icon: <Sparkles className="text-purple-400" />, desc: "Prioritize staff mental health.", image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80" }
  ];

  return (
    <section className="py-40 bg-white overflow-hidden relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gray-50 rounded-full blur-[140px] pointer-events-none opacity-50" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-24">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#003d73]/5 text-[#003d73] text-[10px] font-black uppercase tracking-[0.3em] mb-8"
            >
                Purpose Driven
            </motion.div>
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-5xl md:text-7xl font-black text-[#003d73] mb-8 leading-[0.9] tracking-tighter"
            >
                What would <br /> <span className="text-gradient">you do with more time?</span>
            </motion.h2>
            <p className="text-xl text-gray-400 font-bold leading-relaxed">
                EduCare automates the mundane protocols, allowing institutional leaders to focus on the meaningful impact of education.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {categories.map((cat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.8 }}
              viewport={{ once: true }}
              className={`relative rounded-[2.5rem] overflow-hidden group h-[500px] bg-gray-50 border border-gray-100 p-8 flex flex-col justify-end ${idx % 2 === 0 ? 'md:-translate-y-8' : 'md:translate-y-8'}`}
            >
              <img 
                src={cat.image} 
                alt={cat.title} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 grayscale group-hover:grayscale-0 brightness-[0.3] group-hover:brightness-[0.5]" 
              />
              <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white group-hover:text-[#003d73] transition-all duration-500 text-white">
                      {cat.icon}
                  </div>
                  <h4 className="text-2xl font-black text-white mb-2 leading-none">{cat.title}</h4>
                  <p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors leading-relaxed">
                      {cat.desc}
                  </p>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                   <span className="text-6xl font-black text-white">0{idx + 1}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MoreTime;
