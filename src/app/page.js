'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [user, setUser] = useState(null);
  const [tierConfig, setTierConfig] = useState({
    freePrice: 0,
    freeLimit: 50,
    proPrice: 7,
    proLimit: 1000,
    powerPrice: 15,
    powerLimit: 3000
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDocRef = doc(db, 'settings', 'config');
        const configSnap = await getDoc(configDocRef);
        if (configSnap.exists()) {
          setTierConfig(configSnap.data());
        }
      } catch (err) {
        console.error('Error fetching dynamic pricing config:', err);
      }
    };
    fetchConfig();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handlePricingCheckout = async (planName, price) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    try {
      setCheckoutLoading(true);
      triggerToast(`Initiating secure checkout for the ${planName} Plan...`);
      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planName, price, userId: user.uid }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        triggerToast(`Checkout session creation failed: ${data.error || 'unknown error'}`);
        setCheckoutLoading(false);
      }
    } catch (err) {
      console.error('Failed to initiate stripe checkout on landing page:', err);
      triggerToast('Network error. Please try again.');
      setCheckoutLoading(false);
    }
  };

  const [productName, setProductName] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getCompiledPrompt = () => {
    const pName = productName.trim() || 'Quantum Headphones';
    const tAudience = targetAudience.trim() || 'Tech Enthusiasts';
    return `You are an expert copywriter. Write a compelling product description for ${pName} targeted at ${tAudience}.\n\nInclude these features:\n- ##Feature_1##\n- ##Feature_2##`;
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(getCompiledPrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const faqs = [
    { question: "Can I export my prompts?", answer: "Yes! You can export your entire library or specific collections in JSON, CSV, or Markdown formats at any time." },
    { question: "Is my data secure?", answer: "Absolutely. We use industry-standard encryption and secure cloud storage. We never share your prompts with third-party LLMs without your explicit action." },
    { question: "How do variables work?", answer: "Variables are defined using double hashtags (e.g., ##variable##). When you select a prompt, we automatically generate a form for you to fill in those values before copying the final result." }
  ];

  return (
    <div className="bg-background text-on-background selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen font-sans">
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md border-b border-outline-variant/30 ${scrolled ? 'py-sm shadow-sm bg-surface/90' : 'py-md bg-surface/80'}`}>
        <nav className="max-w-[1280px] mx-auto px-lg flex justify-between items-center h-16 w-full relative">
          <div className="flex-1 flex justify-start">
            <Link className="text-title-md font-headline-lg text-primary tracking-tight font-extrabold" href="/">Prompt Library</Link>
          </div>
          <div className="hidden md:flex items-center justify-center gap-lg flex-1">
            <Link className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors" href={user ? "/dashboard" : "/login"}>Collections</Link>
            <a className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors" href="#pricing">Pricing</a>
            <a className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors" href="#faq">Docs</a>
          </div>
          <div className="flex-1 flex justify-end items-center gap-md">
            {user ? (
              <>
                <Link href="/dashboard" className="text-label-md font-bold text-primary px-lg py-2 hover:bg-primary/5 transition-all border border-dashed border-primary/40 rounded-lg">Dashboard</Link>
                <button onClick={handleSignOut} className="bg-surface-container-low text-error border border-error/20 px-lg py-2 rounded-lg text-label-md font-bold hover:bg-error-container/10 transition-all cursor-pointer">Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-label-md font-bold text-primary px-lg py-2 hover:bg-primary/5 transition-all border border-dashed border-primary/40 rounded-lg">Log In</Link>
                <Link href="/login" className="bg-primary text-on-primary px-lg py-2 rounded-lg text-label-md font-bold hover:shadow-lg hover:shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">Get Started</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="pt-32 space-y-24">
        {/* Hero */}
        <section className="w-full max-w-[1280px] mx-auto px-lg md:px-xl py-12 lg:py-20">
          <div className="flex flex-col lg:flex-row gap-[64px] items-center w-full">
            <div className="w-full lg:w-[45%] lg:max-w-[45%] shrink-0 space-y-lg min-w-0 max-w-[600px]">
              <div className="inline-flex items-center gap-sm bg-primary/10 text-primary px-md py-xs rounded-full border border-primary/20">
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                <span className="text-label-md font-bold">New: Variable injection support</span>
              </div>
              <h1 className="text-[36px] md:text-[43px] lg:text-[58px] font-extrabold text-on-surface leading-[1.1] tracking-tight max-w-[600px]">
                Build, Organize <br className="hidden lg:inline" />
                &amp; Reuse Your <br className="hidden lg:inline" />
                <span className="text-primary font-extrabold">Best AI Prompts</span>
              </h1>
              <p className="text-[16px] md:text-[18px] font-medium text-on-surface-variant max-w-[520px] leading-[1.6]">
                Tired of hunting through docs for that one perfect prompt? Prompt Library gives you a professional workspace to store, tag, and iterate on prompts with dynamic variables.
              </p>
              <div className="flex flex-col sm:flex-row gap-[16px] w-full sm:w-auto">
                <Link href={user ? "/dashboard" : "/login"} className="bg-primary text-on-primary px-xl py-md rounded-lg text-lg font-bold hover:scale-[1.02] active:scale-[0.98] transition-all hover:shadow-lg hover:shadow-primary/20 text-center w-full sm:w-auto">Get Started Free</Link>
                <Link href={user ? "/dashboard" : "/login"} className="bg-surface-container-low text-primary border border-outline-variant px-xl py-md rounded-lg text-lg font-bold hover:bg-primary/5 hover:border-primary/40 transition-all text-center w-full sm:w-auto">View Prompt Collection</Link>
              </div>
            </div>
            <div className="w-full lg:w-[55%] lg:max-w-[55%] shrink-0 flex items-center justify-center lg:justify-end min-w-0">
              <div className="w-full max-w-[700px] relative">
                <div className="absolute -inset-4 bg-primary/5 blur-3xl rounded-full"></div>
                <div className="relative bg-white border border-outline-variant/50 rounded-xl shadow-2xl overflow-hidden flex flex-col justify-between">
                  <div className="bg-surface-container-low px-md py-sm flex justify-between items-center border-b border-outline-variant/30">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
                    </div>
                    <span className="text-label-md font-semibold text-on-surface-variant/60 font-mono text-xs">Product Description Generator.prompt</span>
                  </div>
                  <div className="p-lg space-y-md flex-1">
                    <div className="flex gap-sm">
                      <span className="bg-primary/10 text-primary px-sm py-xs rounded text-[10px] font-extrabold uppercase tracking-wider">Marketing</span>
                      <span className="bg-secondary-container/10 text-secondary px-sm py-xs rounded text-[10px] font-extrabold uppercase tracking-wider">E-Commerce</span>
                    </div>
                    <div className="font-code-sm text-code-sm p-md bg-surface-container-lowest border border-outline-variant/20 rounded-lg text-on-surface leading-relaxed min-h-[140px] whitespace-pre-wrap font-mono">
                      You are an expert copywriter. Write a compelling product description for{" "}
                      <span className={productName ? "bg-primary/10 text-primary font-bold px-1 rounded border border-primary/20" : "text-primary font-bold"}>{productName || "##ProductName##"}</span>{" "}
                      targeted at{" "}
                      <span className={targetAudience ? "bg-primary/10 text-primary font-bold px-1 rounded border border-primary/20" : "text-primary font-bold"}>{targetAudience || "##TargetAudience##"}</span>.
                      <br/><br/>
                      Include these features:<br/>
                      <span className="text-on-surface-variant/60 italic">- ##Feature_1##</span><br/>
                      <span className="text-on-surface-variant/60 italic">- ##Feature_2##</span>
                    </div>
                    <div className="grid grid-cols-2 gap-md">
                      <div className="space-y-xs">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">ProductName</label>
                        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full bg-surface text-body-md border border-outline-variant rounded-lg px-md py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="Quantum Headphones" />
                      </div>
                      <div className="space-y-xs">
                        <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">TargetAudience</label>
                        <input type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="w-full bg-surface text-body-md border border-outline-variant rounded-lg px-md py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="Tech Enthusiasts" />
                      </div>
                    </div>
                    <button onClick={handleCopyPrompt} className="w-full bg-inverse-surface text-inverse-on-surface hover:bg-on-surface-variant py-md rounded-lg flex items-center justify-center gap-sm transition-colors cursor-pointer font-bold shadow-md">
                      <span className="material-symbols-outlined text-[20px]">{copied ? 'check' : 'content_copy'}</span>
                      {copied ? 'Compiled Prompt Copied!' : 'Copy Compiled Prompt'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="w-full max-w-[1280px] mx-auto px-lg py-xl" id="pricing">
          <div className="text-center mb-xl">
            <h2 className="text-headline-lg font-extrabold text-on-surface mb-md">Flexible Pricing for Everyone</h2>
            <p className="text-lg font-medium text-on-surface-variant">Start for free, upgrade as you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg max-w-5xl mx-auto">
            <div className="bg-white p-xl rounded-xl border border-outline-variant/30 flex flex-col hover:border-outline-variant transition-all">
              <h3 className="text-title-md font-bold text-on-surface mb-xs">Free</h3>
              <div className="flex items-baseline gap-xs mb-lg">
                <span className="text-headline-lg font-extrabold text-on-surface">${tierConfig.freePrice}</span>
                <span className="text-label-md font-semibold text-on-surface-variant">/month</span>
              </div>
              <ul className="space-y-md mb-xl flex-1">
                <li className="flex items-center gap-sm text-body-md font-medium text-on-surface-variant"><span className="material-symbols-outlined text-primary text-[20px]">check</span>Up to {tierConfig.freeLimit} Prompts</li>
                <li className="flex items-center gap-sm text-body-md font-medium text-on-surface-variant"><span className="material-symbols-outlined text-primary text-[20px]">check</span>Basic Variables</li>
                <li className="flex items-center gap-sm text-body-md font-medium text-on-surface-variant"><span className="material-symbols-outlined text-primary text-[20px]">check</span>Public Collections</li>
              </ul>
              <Link href={user ? "/dashboard" : "/login"} className="w-full py-md border border-primary text-primary rounded-lg font-bold hover:bg-primary/5 transition-all text-center">Start Free</Link>
            </div>
            <div className="bg-primary text-on-primary p-xl rounded-xl shadow-2xl shadow-primary/20 flex flex-col scale-105 relative z-10 hover:-translate-y-1 transition-all">
              <div className="absolute top-4 right-4 bg-white/20 px-sm py-xs rounded text-[10px] font-bold uppercase tracking-wider">Most Popular</div>
              <h3 className="text-title-md font-bold mb-xs text-white">Pro</h3>
              <div className="flex items-baseline gap-xs mb-lg">
                <span className="text-headline-lg font-extrabold text-white">${tierConfig.proPrice}</span>
                <span className="text-label-md font-semibold text-white">/month</span>
              </div>
              <ul className="space-y-md mb-xl flex-1">
                <li className="flex items-center gap-sm text-body-md font-medium text-white"><span className="material-symbols-outlined text-[20px]">check</span>Up to {tierConfig.proLimit} Prompts</li>
                <li className="flex items-center gap-sm text-body-md font-medium text-white"><span className="material-symbols-outlined text-[20px]">check</span>Advanced Logic Variables</li>
                <li className="flex items-center gap-sm text-body-md font-medium text-white"><span className="material-symbols-outlined text-[20px]">check</span>Private Collections</li>
              </ul>
              <button onClick={() => handlePricingCheckout('Pro', tierConfig.proPrice)} disabled={checkoutLoading} className="w-full py-md bg-white text-primary rounded-lg font-bold hover:bg-white/90 transition-colors text-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed border-none">Go Pro</button>
            </div>
            <div className="bg-white p-xl rounded-xl border border-outline-variant/30 flex flex-col hover:border-outline-variant transition-all">
              <h3 className="text-title-md font-bold text-on-surface mb-xs">Power User</h3>
              <div className="flex items-baseline gap-xs mb-lg">
                <span className="text-headline-lg font-extrabold text-on-surface">${tierConfig.powerPrice}</span>
                <span className="text-label-md font-semibold text-on-surface-variant">/month</span>
              </div>
              <ul className="space-y-md mb-xl flex-1">
                <li className="flex items-center gap-sm text-body-md font-medium text-on-surface-variant"><span className="material-symbols-outlined text-primary text-[20px]">check</span>Up to {tierConfig.powerLimit} Prompts</li>
                <li className="flex items-center gap-sm text-body-md font-medium text-on-surface-variant"><span className="material-symbols-outlined text-primary text-[20px]">check</span>Version History</li>
                <li className="flex items-center gap-sm text-body-md font-medium text-on-surface-variant"><span className="material-symbols-outlined text-primary text-[20px]">check</span>API Access</li>
                <li className="flex items-center gap-sm text-body-md font-medium text-on-surface-variant"><span className="material-symbols-outlined text-primary text-[20px]">check</span>Priority Support</li>
              </ul>
              <button onClick={() => handlePricingCheckout('Power User', tierConfig.powerPrice)} disabled={checkoutLoading} className="w-full py-md border border-primary text-primary rounded-lg font-bold hover:bg-primary/5 transition-colors text-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">Upgrade Now</button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="w-full max-w-[768px] mx-auto px-lg py-xl" id="faq">
          <h2 className="text-headline-md font-bold text-on-surface mb-xl text-center">Frequently Asked Questions</h2>
          <div className="space-y-md">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-white rounded-lg border border-outline-variant/30 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full text-left p-md cursor-pointer flex justify-between items-center font-bold text-on-surface hover:bg-surface-container-low transition-colors outline-none border-none">
                  {faq.question}
                  <span className={`material-symbols-outlined transition-transform duration-300 ${openFaq === idx ? 'rotate-180 text-primary' : 'text-on-surface-variant'}`}>expand_more</span>
                </button>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${openFaq === idx ? 'max-h-[200px] border-t border-outline-variant/30 p-md' : 'max-h-0'} text-body-md font-medium text-on-surface-variant bg-white`}>{faq.answer}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="w-full max-w-[1280px] mx-auto px-lg mb-xl">
          <div className="rounded-2xl p-xl text-center relative overflow-hidden" style={{ backgroundColor: '#141b2b' }}>
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary opacity-20 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-secondary-container opacity-20 blur-[100px] rounded-full"></div>
            <h2 className="text-headline-lg font-bold text-white mb-md">Ready to organize your AI workflow?</h2>
            <p className="font-semibold text-white/70 mb-xl mx-auto text-lg" style={{ maxWidth: '576px' }}>Join 10,000+ creators and engineers building the next generation of AI prompts.</p>
            <Link href={user ? "/dashboard" : "/login"} className="bg-primary text-on-primary px-xl py-md rounded-lg font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/30 inline-block text-base">Start For Free Today</Link>
          </div>
        </section>
      </main>

      <footer className="bg-surface-container-lowest border-t border-outline-variant/30">
        <div className="w-full max-w-[1280px] mx-auto px-lg py-xl flex flex-col md:flex-row justify-between items-center gap-xl">
          <div className="space-y-sm text-center md:text-left">
            <span className="text-title-md font-bold text-on-surface">Prompt Library</span>
            <p className="text-body-md text-on-surface-variant/80 font-medium">&copy; 2026 Prompt Library. Built for high-utility SaaS.</p>
          </div>
          <div className="flex gap-lg">
            <a className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors" href="#">Terms</a>
            <a className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy</a>
            <a className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors" href="#">Twitter</a>
            <a className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors" href="https://github.com/robertdju-dot/prompt-library">GitHub</a>
          </div>
        </div>
      </footer>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#0b0f19] border border-[#2d3448] text-white px-lg py-md rounded-xl shadow-2xl z-50 flex items-center gap-sm animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span className="material-symbols-outlined text-primary">info</span>
          <span className="text-body-md font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
