"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const trustItems = [
  "Free 30-day trial",
  "No credit card required",
  "Dedicated support",
];

const RequestAccess = () => {
  return (
    <section id="request" className="bg-indigo-600 py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-3xl font-bold text-white mb-4"
        >
          Ready to modernize your school?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="text-lg text-indigo-100 mb-10 max-w-xl mx-auto leading-relaxed"
        >
          Join 200+ schools already using Concilio. Get started in minutes, no
          technical knowledge required.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.16 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
        >
          <Link
            href="/signup"
            className="px-6 py-3 bg-white text-indigo-600 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-colors shadow-sm"
          >
            Create Free Account
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 bg-indigo-500/30 text-white text-sm font-semibold rounded-lg border border-indigo-400/40 hover:bg-indigo-500/50 transition-colors"
          >
            Talk to Us
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.24 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6"
        >
          {trustItems.map((item) => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-indigo-200 flex-shrink-0" />
              <span className="text-sm text-indigo-100">{item}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default RequestAccess;
