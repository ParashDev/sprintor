import { Header } from "@/components/landing/Header"
import { Hero } from "@/components/landing/Hero"
import { Features } from "@/components/landing/Features"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { Footer } from "@/components/landing/Footer"
import { ScrollToTop } from "@/components/ScrollToTop"
import { ClientWrapper } from "@/components/ClientWrapper"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
      </main>
      <Footer />
      <ClientWrapper>
        <ScrollToTop />
      </ClientWrapper>
    </div>
  );
}
