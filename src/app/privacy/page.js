'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function PrivacyPolicyPage() {
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
    { id: 'section-1', label: '1. Information We Collect' },
    { id: 'section-2', label: '2. How We Use Information' },
    { id: 'section-3', label: '3. Data Security & Storage' },
    { id: 'section-4', label: '4. Third-Party Integrations' },
    { id: 'section-5', label: '5. Cookies & Local Storage' },
    { id: 'section-6', label: '6. Your Privacy Rights' },
    { id: 'section-7', label: '7. Contact & Support' },
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
            <span className="material-symbols-outlined text-primary text-[28px]">security</span>
            <span className="text-headline-sm font-black text-primary tracking-tight">Online Prompt Library</span>
          </Link>
          <div className="flex items-center gap-md">
            <Link href="/terms" className="text-label-md font-bold text-on-surface-variant hover:text-primary transition-colors">
              Terms of Service
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
            <h1 className="text-headline-lg font-extrabold text-on-surface">Privacy Policy</h1>
            <p className="text-body-md text-on-surface-variant mt-sm font-medium leading-relaxed">
              Effective Date: June 7, 2026. This Privacy Policy details how we compile, secure, and share your personal profile data.
            </p>
          </div>

          {/* Legal Document Sections */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-lg space-y-xl shadow-sm leading-relaxed text-body-md text-on-surface-variant/90">
            
            <section id="section-1" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">1. Information We Collect</h2>
              <p>
                We only gather data necessary to offer you a functional workspace. The categories of information we collect include:
              </p>
              <ul className="list-disc pl-lg space-y-xs">
                <li><strong>Account Credentials</strong>: Email address, display name, and unique user identifiers provided by Firebase Authentication or Google SSO.</li>
                <li><strong>Prompt Templates & Variables</strong>: AI prompt structures, system instruction strings, dynamic tags, and revision histories that you write and save in your library.</li>
                <li><strong>Billing Details</strong>: Transaction tokens and tier subscription records provided by Stripe. (We do not store credit card numbers on our servers).</li>
              </ul>
            </section>

            <section id="section-2" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">2. How We Use Information</h2>
              <p>
                Your data is exclusively deployed to power your Online Prompt Library account:
              </p>
              <ul className="list-disc pl-lg space-y-xs">
                <li>To render, filter, and organize your prompt structures in your browser.</li>
                <li>To evaluate dynamic hashtags (e.g. <code>##Topic##</code>) and render real-time text input compilation fields.</li>
                <li>To process payments and sync pricing configurations (e.g. Free, Pro, and Power User prompt capacities).</li>
                <li>To validate developer REST API keys when querying the library endpoints.</li>
              </ul>
            </section>

            <section id="section-3" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">3. Data Security & Storage</h2>
              <p>
                All account profiles, prompt templates, and user logs are securely stored in Google Cloud Firestore and authentication nodes. Communication between your browser and our servers is fully encrypted using SSL/TLS protocols.
              </p>
              <p>
                We do not sell, rent, or trade your prompts or private profile details to broker networks, marketers, or third-party organizations. Your templates remain fully private to your account ID unless you explicitly toggle them to "Public".
              </p>
            </section>

            <section id="section-4" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">4. Third-Party Integrations</h2>
              <p>
                Our application integrates specific third-party components to handle standard operations:
              </p>
              <ul className="list-disc pl-lg space-y-xs">
                <li><strong>Stripe Checkout</strong>: Secure subscription management, invoicing, and credit card processing.</li>
                <li><strong>Google Cloud/Firebase</strong>: Account authentication, global database hosting, and app hosting infrastructure.</li>
              </ul>
              <p>
                These services access your data solely to execute their targeted operations and are bound by their respective privacy regulations. We do not automatically feed your prompt library data into external LLM endpoints (like OpenAI or Anthropic) without your direct command copy or custom API call.
              </p>
            </section>

            <section id="section-5" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">5. Cookies & Local Storage</h2>
              <p>
                We minimize the use of persistent tracking cookies. We utilize standard local storage structures to keep you authenticated across browser visits and to store your visual theme preference (Light or Dark Mode).
              </p>
              <p>
                We do not employ third-party advertising cookie networks to track your behavior across other sites.
              </p>
            </section>

            <section id="section-6" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">6. Your Privacy Rights</h2>
              <p>
                Depending on your location, you have the right to request access to your personal data, ask for modifications, or demand complete erasure of your account.
              </p>
              <p>
                Since all prompt library records are directly visible on your dashboard under "Library" and "Collections", you can modify or delete your prompt cards directly. To request complete profile purging, contact us at <span className="font-mono text-xs text-primary font-bold">admin@onlinepromptlibrary.com</span>.
              </p>
            </section>

            <section id="section-7" className="space-y-sm">
              <h2 className="text-title-lg font-bold text-on-surface">7. Contact & Support</h2>
              <p>
                If you have inquiries regarding our privacy policy, secure Firestore configurations, or billing tokens, please write to us at:
              </p>
              <p className="bg-surface-container-low p-md rounded-xl text-xs font-semibold font-mono border border-outline-variant/30 text-primary w-fit">
                admin@onlinepromptlibrary.com
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
            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
