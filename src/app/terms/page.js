'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function TermsOfServicePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [themeMode, setThemeMode] = useState('light');
  const [activeSection, setActiveSection] = useState('section-1');

  // Sync theme mode on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") || "light";
      setThemeMode(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  const toggleTheme = () => {
    const newTheme = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const sections = [
    { id: 'section-1', label: '1. Agreement to Terms' },
    { id: 'section-2', label: '2. User Accounts & Security' },
    { id: 'section-3', label: '3. Pricing & Billing Tiers' },
    { id: 'section-4', label: '4. Prompt Ownership & Privacy' },
    { id: 'section-5', label: '5. Acceptable Use Policy' },
    { id: 'section-6', label: '6. Limitation of Liability' },
    { id: 'section-7', label: '7. Term and Termination' },
  ];

  const handleScrollTo = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const offset = 100; // Account for sticky header
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-sans">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-surface/85 backdrop-blur-md border-b border-outline-variant/30 py-md px-lg">
        <div className="max-w-[1280px] mx-auto flex justify-between items-center h-12 w-full">
          <Link href="/" className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-primary text-[28px]">gavel</span>
            <span className="text-headline-sm font-black text-primary tracking-tight">Online Prompt Library</span>
          </Link>
          <div className="flex items-center gap-md">
            <Link href="/privacy" className="text-label-md font-bold text-on-surface-variant hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <span className="text-outline-variant">|</span>
            {currentUser ? (
              <Link href="/dashboard" className="px-md py-1.5 bg-primary/10 text-primary rounded-xl text-label-sm font-bold hover:bg-primary/20 transition-all">
                Dashboard
              </Link>
            ) : (
              <Link href="/login" className="px-md py-1.5 bg-primary text-on-primary rounded-xl text-label-sm font-bold hover:shadow-lg transition-all">
                Sign In
              </Link>
            )}
            <button 
              onClick={toggleTheme} 
              className="p-1.5 rounded-lg border border-outline-variant/40 hover:bg-surface-container-high text-on-surface-variant transition-all cursor-pointer"
              aria-label="Toggle visual theme"
            >
              <span className="material-symbols-outlined text-[20px] block">
                {themeMode === 'light' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 w-full max-w-[1280px] mx-auto px-lg py-xl grid grid-cols-1 lg:grid-cols-12 gap-xl relative">
        
        {/* Navigation Sidebar */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-28 self-start">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-md shadow-sm space-y-sm">
            <h2 className="text-title-sm font-bold text-on-surface uppercase tracking-wider pl-xs mb-sm">Table of Contents</h2>
            <nav className="flex flex-col space-y-xs">
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => handleScrollTo(sec.id)}
                  className={`w-full text-left px-sm py-xs rounded-lg text-label-md font-semibold transition-all cursor-pointer ${
                    activeSection === sec.id
                      ? 'bg-primary/10 text-primary pl-md border-l-4 border-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="lg:col-span-9 space-y-lg">
          
          {/* Header Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-lg relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary opacity-5 blur-[80px] rounded-full pointer-events-none"></div>
            <h1 className="text-headline-lg font-extrabold text-on-surface">Terms of Service</h1>
            <p className="text-body-md text-on-surface-variant mt-sm font-medium leading-relaxed">
              Effective Date: June 7, 2026. Please read these Terms of Service carefully before utilizing the Online Prompt Library platform.
            </p>
          </div>

          {/* Legal Document Sections */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-lg space-y-xl shadow-sm leading-relaxed text-body-md text-on-surface-variant/90">
            
            <section id="section-1" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">1. Agreement to Terms</h2>
              <p>
                By creating an account, subscribing to a plan, or accessing any parts of the Online Prompt Library website and SaaS services, you agree to be bound by these Terms of Service. If you do not accept these terms in their entirety, you must immediately cease all use of our services.
              </p>
              <p>
                We reserve the right to amend or update these terms at any time. We will alert users to major changes via email or system notification banners. Your continued use of the platform following updates constitutes approval of the modified agreement.
              </p>
            </section>

            <section id="section-2" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">2. User Accounts & Security</h2>
              <p>
                To utilize the Online Prompt Library dashboard, database sync, and variable editors, you must register a secure account using either email authentication or Google Workspace federated Single Sign-On (SSO).
              </p>
              <p>
                You are responsible for keeping your login credentials confidential and for all actions occurring under your account profile. You agree to notify us immediately at <span className="font-mono text-xs text-primary font-bold">admin@onlinepromptlibrary.com</span> of any suspected security breach or unauthorized access.
              </p>
            </section>

            <section id="section-3" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">3. Pricing, Payments & Billing Tiers</h2>
              <p>
                Online Prompt Library offers tiers of service with corresponding prompt limits, storage configurations, and developer API permissions:
              </p>
              <ul className="list-disc pl-lg space-y-xs">
                <li><strong>Free Tier</strong>: Limited storage capacity for standard prompts. Supports basic variables and public collection viewing.</li>
                <li><strong>Pro Tier</strong>: Enhanced prompt limits and templates. Designed for individual AI creators and professional writers.</li>
                <li><strong>Power User Tier</strong>: Expanded limits, full developer REST API integration, key management, and automatic Version History.</li>
              </ul>
              <p>
                Billing cycles are managed on a monthly recurring schedule via the Stripe checkout system. Downgrades, upgrades, and cancellations take effect immediately. We do not provide prorated refunds unless required by local consumer legislation.
              </p>
            </section>

            <section id="section-4" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">4. Prompt Ownership & Privacy</h2>
              <p>
                All custom templates, tags, versions, and variable structures you input remain your exclusive intellectual property. We do not inspect, parse, or train LLM models on your private prompts.
              </p>
              <p>
                Administrators may select options to share prompts publicly with the platform community. Once a prompt is explicitly marked public/shared, you grant Online Prompt Library a royalty-free license to render and distribute it to other registered users of the platform.
              </p>
            </section>

            <section id="section-5" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">5. Acceptable Use Policy</h2>
              <p>
                You agree not to use the services, API endpoints, or shared workspace for any activity that:
              </p>
              <ul className="list-disc pl-lg space-y-xs">
                <li>Violates local, state, federal, or international laws.</li>
                <li>Attempts to bypass or exceed system rate limits, standard developer request caps, or pricing plan storage boundaries.</li>
                <li>Distributes malicious software, scripts, or automated scraping crawlers targeted at our Firestore database structures.</li>
                <li>Stores or transmits content that is highly offensive, promotes hate speech, or facilitates phishing.</li>
              </ul>
            </section>

            <section id="section-6" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">6. Limitation of Liability</h2>
              <p>
                The services are provided on an "as-is" and "as-available" basis without warranties of any kind, whether express or implied. Online Prompt Library does not guarantee that the services will be free of interruptions, latency, database sync failures, or data loss.
              </p>
              <p>
                In no event shall Online Prompt Library, its owners, or developers be liable for direct, indirect, incidental, or consequential damages resulting from system downtime, api service suspension, or your integration of compiled prompt outputs into external LLM endpoints.
              </p>
            </section>

            <section id="section-7" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">7. Term and Termination</h2>
              <p>
                This agreement remains in full force while you maintain an active account on the platform. We reserve the right to suspend or terminate accounts that breach these terms, violate acceptable use limits, or fail recurring payments.
              </p>
              <p>
                Upon termination of your account, your right to access the dashboard, API key endpoints, and stored prompt library ceases immediately.
              </p>
            </section>

          </div>

        </main>

      </div>

      {/* Footer */}
      <footer className="w-full py-lg border-t border-outline-variant/30 text-center text-label-md text-on-surface-variant/85 bg-surface-container-lowest mt-xl shrink-0">
        <div className="max-w-[1280px] mx-auto px-lg flex flex-col md:flex-row justify-between items-center gap-md">
          <span>© 2026 Online Prompt Library. All rights reserved.</span>
          <div className="flex gap-md">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>&bull;</span>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
