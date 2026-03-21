"use client";

import { motion } from "framer-motion";
import {
  GraduationCap,
  CalendarCheck,
  CreditCard,
  ClipboardList,
  Users,
  MessageSquare,
  ShieldCheck,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: GraduationCap,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    title: "Student Intelligence",
    description:
      "Advanced student lifecycle management from registration to alumni network integration.",
  },
  {
    icon: CalendarCheck,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    title: "Eco-Attendance",
    description:
      "Biometric and AI-assisted attendance tracking with real-time anomaly detection.",
  },
  {
    icon: CreditCard,
    color: "text-blue-600",
    bg: "bg-blue-50",
    title: "Financial Hub",
    description:
      "Automated fee reconciliation, digital wallets, and transparent installment tracking.",
  },
  {
    icon: ClipboardList,
    color: "text-amber-600",
    bg: "bg-amber-50",
    title: "Academic Engine",
    description:
      "Next-gen examination modules with auto-grading and deep performance analytics.",
  },
  {
    icon: Users,
    color: "text-rose-600",
    bg: "bg-rose-50",
    title: "Talent Management",
    description:
      "Complete staff payroll, performance reviews, and professional development tracking.",
  },
  {
    icon: MessageSquare,
    color: "text-purple-600",
    bg: "bg-purple-50",
    title: "Unified Comm",
    description:
      "Multi-channel parent communication hub via SMS, email, and mobile push notifications.",
  },
];

const Features = () => {
  return (
    <section id="features" className="bg-white py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-widest mb-6"
            >
              <Zap size={14} className="text-amber-500" />
              Core Capabilities
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6"
            >
              Engineered for the <br /> 
              <span className="text-gradient-purple">Modern Institution</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-500 leading-relaxed font-medium"
            >
              EduCare isn&apos;t just a management system; it&apos;s a strategic asset for growth,
              efficiency, and student success.
            </motion.p>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="hidden md:flex flex-col items-center gap-2 text-center border-l border-slate-100 pl-12"
          >
            <ShieldCheck size={48} className="text-indigo-600 mb-2" />
            <p className="text-sm font-bold text-slate-900 uppercase">ISO 27001 Certified</p>
            <p className="text-xs font-bold text-slate-400">Enterprise Security Architecture</p>
          </motion.div>
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group p-8 rounded-[32px] bg-slate-50 border border-slate-100/50 hover:bg-white hover:border-indigo-100 hover:shadow-2xl hover:shadow-indigo-50 transition-all duration-500 hover:-translate-y-2"
              >
                <div className={`${feature.bg} ${feature.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                  <Icon size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-6">
                  {feature.description}
                </p>
                <div className="flex items-center gap-2 text-indigo-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Explore Module</span>
                  <Zap size={14} className="fill-current" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
