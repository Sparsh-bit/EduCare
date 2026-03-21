"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";

const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 glass border-b border-white/20">
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform duration-300">
            <GraduationCap className="text-white" size={24} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-xl text-slate-900 tracking-tight">
              Edu<span className="text-indigo-600">Care</span>
            </span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">
              by Concilio
            </span>
          </div>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-10">
          {["Features", "Philosophy", "About"].map((item) => (
            <Link
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-600 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-all duration-300 shadow-md shadow-indigo-100 hover:shadow-lg active:scale-95"
          >
            Get Started
          </Link>
        </div>
      </motion.nav>
    </header>
  );
};

export default Navbar;
