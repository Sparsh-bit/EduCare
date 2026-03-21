"use client";

import Link from "next/link";
import { GraduationCap, Mail, Phone, MapPin, Twitter, Linkedin, Facebook } from "lucide-react";

const productLinks = [
  { label: "Features", href: "#features" },
  { label: "Philosophy", href: "#philosophy" },
  { label: "Sign In", href: "/login" },
  { label: "Get Started", href: "/signup" },
];

const companyLinks = [
  { label: "About Us", href: "#about" },
  { label: "Contact", href: "#contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-100 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-20">
          {/* Brand Column */}
          <div className="flex flex-col gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:rotate-6 transition-transform">
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
            <p className="text-slate-500 font-medium leading-relaxed">
              Empowering educational excellence through intelligent digital infrastructure. 
              The next generation of institutional management is here.
            </p>
            <div className="flex items-center gap-4">
              {[Twitter, Linkedin, Facebook].map((Icon, idx) => (
                <a key={idx} href="#" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">Product</h4>
            <ul className="space-y-4">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-slate-500 hover:text-indigo-600 font-medium transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">Company</h4>
            <ul className="space-y-4">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-slate-500 hover:text-indigo-600 font-medium transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Column */}
          <div className="flex flex-col gap-6">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">Connect</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-indigo-600 shrink-0 mt-1" />
                <p className="text-slate-500 font-medium leading-relaxed">
                  Cyber Hub, DLF Phase 3,<br />Gurugram, Haryana 122002
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={20} className="text-indigo-600 shrink-0" />
                <p className="text-slate-500 font-medium">solutions@concilio.in</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={20} className="text-indigo-600 shrink-0" />
                <p className="text-slate-500 font-medium">+91 (124) 456-7890</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-slate-400 font-medium text-sm">
            © 2026 Concilio Technologies. All rights reserved.
          </p>
          <div className="flex items-center gap-8">
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Designed for Elite institutions</p>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
