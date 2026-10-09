import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Industries } from "@/components/landing/Industries";
import { ModuleShowcase } from "@/components/landing/ModuleShowcase";
import { Nav } from "@/components/landing/Nav";
import { Pricing } from "@/components/landing/Pricing";
import { Testimonials } from "@/components/landing/Testimonials";
import { LandingRedirect } from "@/components/landing/LandingRedirect";

export default function HomePage() {
  return (
    <div className="grain min-h-screen bg-bg">
      <LandingRedirect />
      <Nav />
      <main>
        <Hero />
        <DashboardPreview />
        <Industries />
        <Features />
        <HowItWorks />
        <ModuleShowcase />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
