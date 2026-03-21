import Link from 'next/link';
import { Phone, Mail, Clock, Twitter, Linkedin, Youtube } from 'lucide-react';

const productLinks = ['Features', 'Modules', 'Pricing', 'Changelog', 'Roadmap'];
const companyLinks = ['About', 'Blog', 'Careers', 'Press', 'Contact'];
const legalLinks = ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security', 'GDPR'];

const contacts = [
    { icon: Phone, text: '+91 88402 68280' },
    { icon: Mail, text: 'official.concilio@gmail.com' },
    { icon: Clock, text: 'Within 12 Hours' },
];

export default function LandingFooter() {
    return (
        <footer className="pt-16 pb-8 px-6" style={{ backgroundColor: '#111827' }}>
            <div className="max-w-6xl mx-auto">
                {/* Top grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
                    {/* Logo column */}
                    <div className="col-span-2">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand-700)' }}>
                                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="white" strokeWidth="2">
                                    <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C16.5 22.15 20 17.25 20 12V6l-8-4z" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span className="font-bold text-lg text-white">EduCare</span>
                        </div>
                        <p className="text-sm text-neutral-400 max-w-xs leading-relaxed">
                            The complete school management platform for modern Indian schools.
                        </p>
                        <div className="mt-6 flex gap-3">
                            {[Twitter, Linkedin, Youtube].map((Icon, i) => (
                                <button
                                    key={i}
                                    className="w-9 h-9 rounded-lg border border-neutral-700 hover:border-neutral-500 flex items-center justify-center text-neutral-400 hover:text-neutral-300 transition-colors"
                                >
                                    <Icon className="w-4 h-4" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product */}
                    <div>
                        <p className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-4">Product</p>
                        <ul className="space-y-2.5">
                            {productLinks.map((l) => (
                                <li key={l}>
                                    <Link href="#" className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
                                        {l}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <p className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-4">Company</p>
                        <ul className="space-y-2.5">
                            {companyLinks.map((l) => (
                                <li key={l}>
                                    <Link href="#" className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
                                        {l}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <p className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-4">Legal</p>
                        <ul className="space-y-2.5 mb-6">
                            {legalLinks.map((l) => (
                                <li key={l}>
                                    <Link href="#" className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
                                        {l}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <p className="text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-3">Contact</p>
                        <ul className="space-y-2">
                            {contacts.map(({ icon: Icon, text }) => (
                                <li key={text} className="flex items-center gap-2 text-sm text-neutral-400">
                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                    {text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Divider */}
                <div className="mt-12 border-t" style={{ borderColor: '#1f2937' }} />

                {/* Bottom bar */}
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500">
                    <span>&copy; {new Date().getFullYear()} EduCare by Concilio. All rights reserved.</span>
                    <span>
                        Made with <span className="text-red-500">♥</span> in India 🇮🇳
                    </span>
                </div>
            </div>
        </footer>
    );
}
