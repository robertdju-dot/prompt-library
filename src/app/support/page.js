'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// FAQs data categorized
const FAQ_CATEGORIES = [
  { id: 'all', name: 'All FAQs', icon: 'help' },
  { id: 'general', name: 'General & Account', icon: 'person' },
  { id: 'prompts', name: 'Prompts & Variables', icon: 'edit_note' },
  { id: 'billing', name: 'Billing & Pricing', icon: 'payments' },
  { id: 'developer', name: 'API & Developer Keys', icon: 'code' }
];

const getFaqItems = (config) => [
  {
    id: 'faq-1',
    category: 'general',
    question: 'What is Online Prompt Library?',
    answer: 'Online Prompt Library is a professional workspace designed for AI engineers, writers, and power users. It helps you build, organize, tag, and reuse your AI prompt templates. By using dynamic variables, you can test and compile prompts on the fly before copying or exporting them.'
  },
  {
    id: 'faq-2',
    category: 'general',
    question: 'Is my data secure?',
    answer: 'Yes, your prompts and user data are securely stored in Google Cloud Firestore. Standard custom prompts are private to your user ID unless you are an Admin and explicitly mark them as public/shared with all users.'
  },
  {
    id: 'faq-3',
    category: 'prompts',
    question: 'How do variables work in prompt templates?',
    answer: 'To define a variable, wrap its name in double hashtags (e.g. ##Topic## or ##Language##). When you open the prompt detail modal, the system automatically parses these tags and provides interactive text fields. Entering values dynamically updates the live highlighted preview box.'
  },
  {
    id: 'faq-4',
    category: 'prompts',
    question: 'What is Version History and how do I use it?',
    answer: 'Version History is an exclusive feature for Power Users and Admins. Every time you edit a prompt, a chronological snapshot is prepended to the versions array. In the detail modal, click the "Version History" tab to preview previous prompt configurations or restore them with a single click.'
  },
  {
    id: 'faq-5',
    category: 'billing',
    question: 'How do I upgrade my subscription plan limit?',
    answer: `Navigate to the "Billing" tab in your sidebar. We offer three tiers: Free (up to ${(config.freeLimit ?? 50).toLocaleString()} prompts limit), Pro (up to ${(config.proLimit ?? 1000).toLocaleString()} prompts), and Power User (up to ${(config.powerLimit ?? 3000).toLocaleString()} prompts and API/versions access). Clicking upgrade redirects you to a secure Stripe Checkout portal to complete your payment.`
  },
  {
    id: 'faq-6',
    category: 'billing',
    question: 'Can I cancel my subscription at any time?',
    answer: 'Yes, you can manage or cancel your subscription at any time. If you downgrade, your plan changes will take effect immediately, and your capacity limits will adjust accordingly based on your new plan.'
  },
  {
    id: 'faq-7',
    category: 'developer',
    question: 'How do I generate and use API Keys?',
    answer: 'If you are on the Power User or Admin tier, navigate to the "Settings" tab and look for "Developer Workspace API Keys". Enter a key name and click "Generate Key". You can then query our REST endpoint at /api/v1/prompts with the Bearer authorization token header to load your prompts programmatically.'
  },
  {
    id: 'faq-8',
    category: 'developer',
    question: 'Is there a query rate limit on the developer endpoints?',
    answer: 'Yes, standard developer keys have soft rate limits to protect Firestore resource limits. If your integration requires higher throughput or enterprise capabilities, please reach out to us using the contact form below.'
  }
];

export default function SupportCenterPage() {
  const router = useRouter();
  
  // Auth & UI state
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [themeMode, setThemeMode] = useState('light');
  const [tierConfig, setTierConfig] = useState({
    freeLimit: 50,
    proLimit: 1000,
    powerLimit: 3000
  });

  // Fetch pricing config from Firestore settings/config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDocRef = doc(db, 'settings', 'config');
        const configSnap = await getDoc(configDocRef);
        if (configSnap.exists()) {
          setTierConfig(configSnap.data());
        }
      } catch (err) {
        console.error('Error fetching dynamic pricing config for FAQ:', err);
      }
    };
    fetchConfig();
  }, []);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedFaqId, setExpandedFaqId] = useState(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formCategory, setFormCategory] = useState('General Support');
  const [formMessage, setFormMessage] = useState('');
  
  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Sync theme
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") || "light";
      setThemeMode(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  // Listen to auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setFormName(user.displayName || '');
        setFormEmail(user.email || '');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const toggleFaq = (id) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);
    setSubmitting(true);

    if (!formName.trim() || !formEmail.trim() || !formSubject.trim() || !formMessage.trim()) {
      setSubmitError('Please fill in all required fields.');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          subject: formSubject,
          category: formCategory,
          message: formMessage,
          userId: currentUser ? currentUser.uid : 'guest'
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubmitSuccess(true);
        setFormSubject('');
        setFormMessage('');
        triggerToast('Message sent! Our support team will get back to you shortly.');
      } else {
        setSubmitError(data.error || 'Failed to submit support request. Please try again.');
      }
    } catch (err) {
      console.error('Ticket submission error:', err);
      setSubmitError('Network error. Please check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const faqItems = getFaqItems(tierConfig);
  // Filter FAQs based on search input and active category selection
  const filteredFaqs = faqItems.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const renderSidebar = () => {
    if (!currentUser) return null;
    return (
      <aside className="hidden md:flex flex-col h-screen w-64 left-0 top-0 fixed bg-surface-container-lowest border-r border-outline-variant/30 py-lg space-y-sm z-40">
        <div className="px-lg mb-xl">
          <Link href="/dashboard" className="flex items-center gap-xs">
            <h1 className="text-headline-md font-bold text-primary tracking-tight">Online Prompt Library</h1>
          </Link>
          <p className="text-label-md font-medium text-on-surface-variant/70 mt-xs">Support Center Active</p>
        </div>
        <nav className="flex-1 space-y-xs">
          {[
            { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
            { name: 'Library', icon: 'folder_special', href: '/dashboard' },
            { name: 'Collections', icon: 'grid_view', href: '/dashboard' },
            { name: 'Billing', icon: 'payments', href: '/dashboard' },
            { name: 'Settings', icon: 'settings', href: '/dashboard' }
          ].map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className="w-full flex items-center gap-md px-md py-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all border-l-4 border-transparent font-semibold text-label-md"
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              <span>{tab.name}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-md">
          <div className="mt-xl space-y-xs">
            <Link className="w-full flex items-center gap-md px-md py-xs bg-primary-container/10 text-primary font-bold border-l-4 border-primary pl-2 rounded-lg text-left text-label-md" href="/support">
              <span className="material-symbols-outlined text-[18px]">help</span>
              Support Center
            </Link>
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center gap-md px-md py-xs transition-all font-semibold text-label-md cursor-pointer hover:bg-error-container/10 rounded-lg text-left text-error hover:text-error/80 border-l-4 border-transparent"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    );
  };

  const renderGuestHeader = () => {
    if (currentUser) return null;
    return (
      <header className="bg-surface-container-lowest border-b border-outline-variant/30 py-md px-lg relative z-30">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-12">
          <Link href="/" className="flex items-center gap-xs">
            <span className="text-headline-md font-black text-primary tracking-tight">Online Prompt Library</span>
          </Link>
          <div className="flex gap-md">
            <Link href="/login" className="px-lg py-sm text-label-md font-bold text-primary hover:bg-primary/5 rounded-xl transition-all">
              Sign In
            </Link>
            <Link href="/login" className="px-lg py-sm bg-primary text-on-primary rounded-xl text-label-md font-bold hover:shadow-lg transition-all">
              Register Free
            </Link>
          </div>
        </div>
      </header>
    );
  };

  const renderAuthTopbar = () => {
    if (!currentUser) return null;
    return (
      <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 shrink-0">
        <div className="flex justify-between items-center w-full px-lg py-md max-w-container-max mx-auto h-16">
          <div className="flex items-center gap-md flex-1">
            <h2 className="text-title-md font-bold text-on-surface flex items-center gap-xs">
              <span className="material-symbols-outlined text-primary text-[22px]">help</span>
              Help &amp; Support Workspace
            </h2>
          </div>
          <div className="flex items-center gap-md ml-lg">
            <Link 
              href="/dashboard"
              className="flex items-center gap-xs px-md py-1.5 border border-outline-variant/40 hover:border-primary hover:text-primary rounded-xl text-label-sm font-semibold transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>
    );
  };

  if (authLoading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center font-sans gap-md">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-body-md font-bold text-on-surface-variant/80 animate-pulse">Securing support workspace...</p>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-sans">
      
      {/* Sidebar (Auth Only) */}
      {renderSidebar()}

      {/* Main layout wrapper */}
      <div className={`flex flex-col flex-1 ${currentUser ? 'md:ml-64' : ''}`}>
        
        {/* Header selection depending on login state */}
        {renderGuestHeader()}
        {renderAuthTopbar()}

        {/* Support Portal Content */}
        <div className="p-lg lg:p-xl space-y-xl max-w-7xl mx-auto w-full flex-grow flex flex-col justify-between">
          
          {/* Support Banner Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-sm p-lg flex flex-col md:flex-row md:items-center justify-between gap-lg relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary opacity-5 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="space-y-sm relative z-10 max-w-2xl">
              <h2 className="text-headline-md font-extrabold text-on-surface">How can we assist you today?</h2>
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                Welcome to the Online Prompt Library Support Center. Explore our interactive FAQ directory to resolve general questions or submit a custom inquiry directly to our support staff.
              </p>
            </div>
            <div className="flex gap-sm relative z-10 shrink-0">
              <a href="#faq-section" className="px-lg py-md bg-surface border border-outline-variant/40 text-on-surface hover:bg-surface-container-high rounded-xl font-bold text-body-md transition-all flex items-center gap-xs cursor-pointer shadow-sm">
                <span className="material-symbols-outlined text-[20px]">find_in_page</span>
                Browse FAQs
              </a>
              <a href="#contact-section" className="px-lg py-md bg-primary text-on-primary hover:shadow-lg transition-all rounded-xl font-bold text-body-md flex items-center gap-xs cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">chat</span>
                Contact Support
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-stretch">
            
            {/* FAQ SECTION (7 Cols) */}
            <div id="faq-section" className="lg:col-span-7 space-y-lg flex flex-col">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md border-b border-outline-variant/20 pb-sm">
                <h3 className="text-title-lg font-bold text-on-surface flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary text-[24px]">question_answer</span>
                  Frequently Asked Questions
                </h3>
                
                {/* FAQ Search */}
                <div className="relative w-full sm:max-w-xs">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search questions..."
                    className="w-full bg-surface border border-outline-variant rounded-xl pl-9 pr-4 py-1.5 text-body-md outline-none focus:border-primary transition-all text-xs font-semibold"
                  />
                </div>
              </div>

              {/* FAQ Categorized Filter Tabs */}
              <div className="flex flex-wrap gap-xs shrink-0">
                {FAQ_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setExpandedFaqId(null);
                    }}
                    className={`px-sm py-1.5 rounded-lg border text-label-xs font-bold transition-all cursor-pointer flex items-center gap-xs ${
                      activeCategory === cat.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-outline-variant/40 hover:border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">{cat.icon}</span>
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* FAQs Accordion Listing */}
              <div className="space-y-md flex-grow">
                {filteredFaqs.length === 0 ? (
                  <div className="p-xl text-center bg-surface-container-lowest border border-outline-variant/30 rounded-xl text-on-surface-variant/70 italic text-body-md">
                    No FAQs found matching &quot;{searchTerm}&quot;. Try typing a different keyword or search query.
                  </div>
                ) : (
                  filteredFaqs.map(faq => {
                    const isExpanded = expandedFaqId === faq.id;
                    return (
                      <div 
                        key={faq.id} 
                        className={`bg-surface-container-lowest border rounded-xl overflow-hidden transition-all shadow-sm ${
                          isExpanded ? 'border-primary ring-1 ring-primary/10' : 'border-outline-variant/40 hover:border-outline-variant'
                        }`}
                      >
                        <button
                          onClick={() => toggleFaq(faq.id)}
                          className="w-full px-lg py-md text-left flex justify-between items-center gap-md cursor-pointer hover:bg-primary/5 transition-colors"
                        >
                          <span className="text-body-md font-bold text-on-surface leading-snug">
                            {faq.question}
                          </span>
                          <span className={`material-symbols-outlined text-outline transition-transform duration-250 ${
                            isExpanded ? 'rotate-180 text-primary' : ''
                          }`}>
                            expand_more
                          </span>
                        </button>
                        
                        {isExpanded && (
                          <div className="px-lg pb-md pt-xs border-t border-outline-variant/20 bg-surface-container-low/20 animate-in fade-in slide-in-from-top-1 duration-150">
                            <p className="text-body-md text-on-surface-variant/90 leading-relaxed font-medium">
                              {faq.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* CONTACT FORM SECTION (5 Cols) */}
            <div id="contact-section" className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-lg shadow-sm flex flex-col justify-between">
              
              <form onSubmit={handleSubmit} className="space-y-md flex flex-col justify-between h-full">
                
                <div>
                  <h3 className="text-title-lg font-bold text-on-surface flex items-center gap-xs border-b border-outline-variant/20 pb-sm mb-md">
                    <span className="material-symbols-outlined text-primary text-[24px]">chat_bubble</span>
                    Contact Support
                  </h3>

                  <p className="text-label-md text-on-surface-variant/80 font-medium mb-md leading-relaxed">
                    Have a specific question, billing inquiry, or custom feature suggestion? Fill in the secure form below. Messages will be routed directly to:
                    <strong className="block text-primary font-bold mt-1 font-mono text-xs">admin@onlinepromptlibrary.com</strong>
                  </p>

                  {/* Form Alerts */}
                  {submitError && (
                    <div className="bg-error-container/10 border border-error/20 rounded-xl p-md flex items-start gap-sm mb-md animate-in fade-in duration-200">
                      <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">error</span>
                      <span className="text-label-md font-medium text-error leading-relaxed">{submitError}</span>
                    </div>
                  )}

                  {submitSuccess && (
                    <div className="bg-success-container/10 border border-success/20 rounded-xl p-md flex items-start gap-sm mb-md animate-in fade-in duration-200">
                      <span className="material-symbols-outlined text-success text-[20px] shrink-0 mt-0.5">check_circle</span>
                      <span className="text-label-md font-semibold text-success leading-relaxed">
                        Message sent successfully! Our administrative team will review your query and email you back shortly.
                      </span>
                    </div>
                  )}

                  <div className="space-y-sm">
                    <div className="space-y-xs">
                      <label className="text-label-xs font-bold text-on-surface-variant uppercase tracking-wider block text-[10px]">Your Name</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Alex Rivera"
                        className="w-full bg-surface text-on-surface border border-outline-variant rounded-xl px-md py-sm text-body-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-semibold"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-xs">
                      <label className="text-label-xs font-bold text-on-surface-variant uppercase tracking-wider block text-[10px]">Email Address</label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-surface text-on-surface border border-outline-variant rounded-xl px-md py-sm text-body-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-semibold"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                      <div className="space-y-xs">
                        <label className="text-label-xs font-bold text-on-surface-variant uppercase tracking-wider block text-[10px]">Category</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm outline-none focus:border-primary cursor-pointer font-semibold"
                          disabled={submitting}
                        >
                          <option value="General Support">General Support</option>
                          <option value="Billing & Pricing">Billing &amp; Payments</option>
                          <option value="Feature Request">Feature Request</option>
                          <option value="Bug Report">Bug Report</option>
                          <option value="Enterprise / API">Enterprise API Plan</option>
                        </select>
                      </div>
                      
                      <div className="space-y-xs">
                        <label className="text-label-xs font-bold text-on-surface-variant uppercase tracking-wider block text-[10px]">Subject</label>
                        <input
                          type="text"
                          value={formSubject}
                          onChange={(e) => setFormSubject(e.target.value)}
                          placeholder="e.g. Stripe checkout limit"
                          className="w-full bg-surface text-on-surface border border-outline-variant rounded-xl px-md py-sm text-body-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-semibold"
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="space-y-xs">
                      <label className="text-label-xs font-bold text-on-surface-variant uppercase tracking-wider block text-[10px]">Message Details</label>
                      <textarea
                        value={formMessage}
                        onChange={(e) => setFormMessage(e.target.value)}
                        placeholder="Write your question, suggestion, or bug description here..."
                        rows="6"
                        className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-semibold min-h-[120px]"
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-lg w-full bg-primary text-on-primary py-md rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></span>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">send</span>
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </form>

            </div>

          </div>

          {/* Footer details */}
          <footer className="w-full py-lg border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center text-label-md text-on-surface-variant/80 font-medium shrink-0 bg-surface-container-lowest rounded-2xl px-lg shadow-sm">
            <span>© 2026 Online Prompt Library Support Hub. All tickets are encrypted and tracked for service quality.</span>
            <div className="flex gap-md mt-sm md:mt-0">
              <Link href="/dashboard" className="hover:text-primary transition-colors">Workspace</Link>
              <span>&bull;</span>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Statement</Link>
              <span>&bull;</span>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            </div>
          </footer>

        </div>

      </div>

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-inverse-surface text-inverse-on-surface px-lg py-md rounded-xl shadow-2xl z-50 flex items-center gap-sm animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span className="material-symbols-outlined text-primary-fixed-dim">info</span>
          <span className="text-body-md font-semibold">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
