"use client";

import React from "react";
import { motion } from "framer-motion";
import { Globe, Shield, Zap, Cpu, Anchor, Activity, Radio, Command } from "lucide-react";

const LogoCloud = () => {
  const partners = [
    { name: "Google Cloud", icon: <Globe size={24} /> },
    { name: "Enterprise Guard", icon: <Shield size={24} /> },
    { name: "FastNode", icon: <Zap size={24} /> },
    { name: "Intel Core", icon: <Cpu size={24} /> },
    { name: "Docker", icon: <Anchor size={24} /> },
    { name: "RealTime", icon: <Activity size={24} /> },
    { name: "Broadcast", icon: <Radio size={24} /> },
    { name: "Command", icon: <Command size={24} /> }
  ];

  return (
    <div className="py-20 bg-white border-y border-gray-50 overflow-hidden">
      <div className="container mx-auto px-6 mb-12">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.4em] text-gray-300">
          Integrated with the Global Education Stack
        </p>
      </div>

      <div className="relative">
        {/* Gradients to fade out the sides */}
        <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-white to-transparent z-10" />

        <div className="flex animate-marquee whitespace-nowrap gap-12">
          {[...partners, ...partners, ...partners].map((p, idx) => (
            <div key={idx} className="flex items-center gap-4 group cursor-default">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-[#003d73] group-hover:text-white transition-all duration-500">
                {p.icon}
              </div>
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest group-hover:text-[#003d73] transition-colors">
                {p.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default LogoCloud;
