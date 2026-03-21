'use client';

import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import LogoStrip from '@/components/landing/LogoStrip';
import FeaturesSection from '@/components/landing/FeaturesSection';
import StatsSection from '@/components/landing/StatsSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import ModulesSection from '@/components/landing/ModulesSection';
import TestimonialSection from '@/components/landing/TestimonialSection';
import CTASection from '@/components/landing/CTASection';
import LandingFooter from '@/components/landing/LandingFooter';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-neutral-50">
            <LandingNav />
            <main>
                <HeroSection />
                <LogoStrip />
                <FeaturesSection />
                <StatsSection />
                <HowItWorksSection />
                <ModulesSection />
                <TestimonialSection />
                <CTASection />
            </main>
            <LandingFooter />
        </div>
    );
}
