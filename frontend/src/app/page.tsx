'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useState } from 'react';

const features = [
  { icon: '🎓', title: 'Student Lifecycle', desc: 'Admission to alumni — complete student journey management' },
  { icon: '📋', title: 'Attendance System', desc: 'Daily tracking with 75% auto-eligibility enforcement' },
  { icon: '💰', title: 'Fee Management', desc: 'Installments, late fees, Razorpay & cash — all unified' },
  { icon: '📝', title: 'Examinations', desc: 'Marks entry, results, report cards with CBSE grading' },
  { icon: '👨‍🏫', title: 'Staff Management', desc: 'Leaves, salary processing, and HR essentials' },
  { icon: '👪', title: 'Parent Portal', desc: 'Real-time access to attendance, fees, and results' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Home() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="min-h-screen bg-[#f8f9fb] scroll-smooth">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 w-full z-50 bg-[#f8f9fb]/80 backdrop-blur-md border-b border-[#6c5ce7]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#6c5ce7] rounded-lg flex items-center justify-center">
              <span className="text-[#f8f9fb] font-bold text-sm">C</span>
            </div>
            <span className="text-[#6c5ce7] font-semibold text-lg tracking-tight">Concilio</span>
          </Link>
          {/* Main Navigation Links */}
          <div className="hidden lg:flex items-center gap-8 text-[13px] font-semibold text-[#6c5ce7]/70 tracking-wide">
            <Link href="/" className="hover:text-[#6c5ce7] transition-colors">Home</Link>

            <div className="relative group cursor-pointer inline-block py-2">
              <Link href="/features" className="hover:text-[#6c5ce7] transition-colors flex items-center gap-1.5">
                Features
                <svg className="w-3.5 h-3.5 text-[#6c5ce7]/40 group-hover:text-[#6c5ce7] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Link>
              {/* Dropdown menu */}
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#6c5ce7]/10 rounded-xl shadow-xl shadow-[#6c5ce7]/5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 p-2">
                <Link href="/features#academic" className="block px-4 py-2.5 text-xs text-[#6c5ce7]/70 hover:text-[#6c5ce7] hover:bg-[#f8f9fb] rounded-lg transition-colors">Academic Management</Link>
                <Link href="/features#finance" className="block px-4 py-2.5 text-xs text-[#6c5ce7]/70 hover:text-[#6c5ce7] hover:bg-[#f8f9fb] rounded-lg transition-colors">Fee & Finance</Link>
                <Link href="/features#hr" className="block px-4 py-2.5 text-xs text-[#6c5ce7]/70 hover:text-[#6c5ce7] hover:bg-[#f8f9fb] rounded-lg transition-colors">HR & Payroll</Link>
                <Link href="/features#portals" className="block px-4 py-2.5 text-xs text-[#6c5ce7]/70 hover:text-[#6c5ce7] hover:bg-[#f8f9fb] rounded-lg transition-colors">Student/Parent Portals</Link>
              </div>
            </div>

            <Link href="/#about" className="hover:text-[#6c5ce7] transition-colors">About Us</Link>
            <Link href="/register" className="hover:text-[#6c5ce7] transition-colors">Contact</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/register"
              className="px-5 py-2 text-sm font-medium text-[#6c5ce7] hover:text-[#6c5ce7]/70 transition-colors tracking-wide hidden sm:block"
            >
              REQUEST SETUP
            </Link>
            <Link
              href="/login"
              className="px-5 py-2 text-sm font-medium text-[#f8f9fb] bg-[#6c5ce7] rounded-full hover:bg-[#5b4bd5] transition-colors tracking-wide"
            >
              SIGN IN
            </Link>
            <button
              type="button"
              aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="lg:hidden h-9 w-9 rounded-lg border border-[#6c5ce7]/20 text-[#6c5ce7] flex items-center justify-center"
            >
              {mobileNavOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
        {mobileNavOpen && (
          <div className="lg:hidden border-t border-[#6c5ce7]/10 bg-[#f8f9fb] px-4 py-3">
            <div className="flex flex-col gap-1 text-sm font-medium text-[#6c5ce7]/80">
              <Link href="/" onClick={closeMobileNav} className="px-3 py-2 rounded-lg hover:bg-[#6c5ce7]/5">Home</Link>
              <Link href="/features" onClick={closeMobileNav} className="px-3 py-2 rounded-lg hover:bg-[#6c5ce7]/5">Features</Link>
              <Link href="/#about" onClick={closeMobileNav} className="px-3 py-2 rounded-lg hover:bg-[#6c5ce7]/5">About Us</Link>
              <Link href="/register" onClick={closeMobileNav} className="px-3 py-2 rounded-lg hover:bg-[#6c5ce7]/5">Contact</Link>
              <Link href="/register" onClick={closeMobileNav} className="px-3 py-2 rounded-lg hover:bg-[#6c5ce7]/5">Request Setup</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
        {/* Background Image */}
        <motion.div
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 z-0"
        >
          <img
            src="/hero-bg.png"
            alt="Scenic landscape"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#f8f9fb]/60 via-[#f8f9fb]/40 to-[#f8f9fb]/80" />
        </motion.div>

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-4xl">
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
            }}
            className="text-4xl sm:text-5xl md:text-7xl font-light text-[#6c5ce7] leading-tight tracking-tight"
            style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
          >
            The complete platform to
            <br />
            manage, track, and grow
            <br />
            your school
          </motion.h1>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { delay: 0.5, duration: 0.8 } }
            }}
            className="mt-10 flex flex-col items-center gap-4"
          >
            <p className="text-xs font-medium text-[#6c5ce7]/50 tracking-[0.2em] uppercase">
              EduCare ERP by Concilio
            </p>
            <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-8 text-[#6c5ce7]/60 text-sm font-semibold">
              <span>Next-Gen Features</span>
              <span>·</span>
              <span>CBSE Schools</span>
              <span>·</span>
              <span>K-12 Institutions</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-12"
          >
            <Link
              href="/register"
              className="px-8 py-4 text-base font-medium text-[#f8f9fb] bg-[#6c5ce7] rounded-full hover:bg-[#5b4bd5] transition-all hover:shadow-lg inline-block"
            >
              Apply for School Setup
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 px-6 bg-[#f8f9fb]">
        <div className="max-w-6xl mx-auto">
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-xs font-medium text-[#6c5ce7]/50 tracking-[0.2em] uppercase text-center mb-3"
          >
            What we provide
          </motion.p>
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-3xl md:text-5xl font-light text-[#6c5ce7] text-center mb-16 leading-tight"
            style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
          >
            Everything your school needs,
            <br />
            nothing it doesn&apos;t
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="group bg-white/60 border border-[#6c5ce7]/8 rounded-2xl p-8 shadow-sm hover:shadow-lg hover:shadow-[#6c5ce7]/5 transition-all duration-300"
              >
                <motion.span
                  whileHover={{ scale: 1.1 }}
                  className="text-3xl block mb-4 inline-block"
                >
                  {f.icon}
                </motion.span>
                <h3 className="text-lg font-semibold text-[#6c5ce7] mb-2 cursor-default">{f.title}</h3>
                <p className="text-sm text-[#6c5ce7]/60 leading-relaxed cursor-default">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── About ─── */}
      <section id="about" className="py-24 px-6 bg-white/40">
        <div className="max-w-4xl mx-auto text-center">
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-xs font-medium text-[#6c5ce7]/50 tracking-[0.2em] uppercase mb-3"
          >
            About Concilio
          </motion.p>
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-3xl md:text-4xl font-light text-[#6c5ce7] mb-8 leading-tight"
            style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
          >
            Built for Indian schools,
            <br />
            by people who understand them
          </motion.h2>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="text-[#6c5ce7]/60 text-lg leading-relaxed max-w-2xl mx-auto mb-10"
          >
            EduCare ERP by Concilio is designed specifically for CBSE and medium-sized Indian schools.
            From ₹-native fee management with Razorpay to 75% attendance auto-enforcement —
            every feature is built around real school workflows, not generic templates.
          </motion.p>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3 text-sm font-medium text-[#f8f9fb] bg-[#6c5ce7] rounded-full hover:bg-[#5b4bd5] transition-colors tracking-wide"
            >
              REQUEST EDUCARE SETUP →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-8 px-6 border-t border-[#6c5ce7]/10 bg-[#f8f9fb]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#6c5ce7] rounded-md flex items-center justify-center">
              <span className="text-[#f8f9fb] font-bold text-[10px]">C</span>
            </div>
            <span className="text-[#6c5ce7] font-semibold text-sm">Concilio</span>
          </div>
          <p className="text-xs text-[#6c5ce7]/40">
            The complete platform to manage, track, and grow your school.
          </p>
          <p className="text-xs text-[#6c5ce7]/40">
            © {new Date().getFullYear()} Concilio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
