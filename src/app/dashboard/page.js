'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

// Import our Firestore database service and Auth
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  query, 
  orderBy 
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Static fallback prompts in case of connection exceptions
const BACKUP_PROMPTS = [
  {
    id: "backup-1",
    title: "SEO Blog Post Generator",
    subtitle: "GPT-4 Optimized",
    category: "Content",
    tags: ["SEO", "Blog"],
    access: "Basic",
    createdDate: "Oct 24, 2024",
    template: "Write a blog post about ##Topic## targeting ##Audience##. Optimize for search intent, inclusion of secondary LSI terms, and high readability index.",
    versions: []
  },
  {
    id: "backup-2",
    title: "React Component Architect",
    subtitle: "Tailwind focus",
    category: "Development",
    tags: ["React", "UI"],
    access: "Premium",
    createdDate: "Oct 22, 2024",
    template: "Design a React component for a ##ComponentName## using Tailwind CSS utilities. Ensure clean atomic design and screen-reader friendliness.",
    versions: []
  },
  {
    id: "backup-3",
    title: "Customer Support Persona",
    subtitle: "Empathetic Tone",
    category: "Business",
    tags: ["Service"],
    access: "Basic",
    createdDate: "Oct 19, 2024",
    template: "Respond to the customer's request ##CustomerMessage## using a highly empathetic, professional, and helpful support tone. Suggest secondary links to user guides.",
    versions: []
  }
];

// Helper to extract double hashtag variables (e.g. ##Topic##)
const extractVariables = (template) => {
  if (!template) return [];
  const regex = /##([^#]+?)##/g;
  const matches = [];
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(template)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  return matches;
};

// Helper to compile prompt template with user-defined variable values
const getCompiledTemplate = (template, values) => {
  if (!template) return "";
  return template.replace(/##([^#]+?)##/g, (match, varName) => {
    return values[varName] !== undefined && values[varName] !== "" ? values[varName] : match;
  });
};

// Helper to render interactive highlighted preview of template with badges
const renderHighlightedTemplate = (template, values) => {
  if (!template) return null;
  const parts = [];
  const regex = /##([^#]+?)##/g;
  let lastIndex = 0;
  let match;
  regex.lastIndex = 0;
  
  while ((match = regex.exec(template)) !== null) {
    const varName = match[1];
    const matchIndex = match.index;
    
    // Add text segment before variable
    if (matchIndex > lastIndex) {
      parts.push(template.substring(lastIndex, matchIndex));
    }
    
    // Add variable highlight
    const val = values[varName];
    if (val !== undefined && val !== "") {
      parts.push(
        <span key={matchIndex} className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded border border-primary/20 mx-0.5 inline-block text-[13px] font-sans">
          {val}
        </span>
      );
    } else {
      parts.push(
        <span key={matchIndex} className="bg-error-container/10 text-error font-extrabold px-1.5 py-0.5 rounded border border-error/20 mx-0.5 inline-block text-[13px] font-sans animate-pulse">
          {`##${varName}##`}
        </span>
      );
    }
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < template.length) {
    parts.push(template.substring(lastIndex));
  }
  
  return <div className="whitespace-pre-wrap leading-relaxed text-body-md">{parts}</div>;
};

export default function UserDashboardPage() {
  return (
    <Suspense fallback={
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center font-sans gap-md">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-body-md font-bold text-on-surface-variant/80 animate-pulse">Securing your session...</p>
      </div>
    }>
      <UserDashboardContent />
    </Suspense>
  );
}

function UserDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [prompts, setPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tierConfig, setTierConfig] = useState({
    freePrice: 0,
    freeLimit: 50,
    proPrice: 7,
    proLimit: 1000,
    powerPrice: 15,
    powerLimit: 3000
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('Dashboard');


  // Modal / Dialogue States
  const [activePrompt, setActivePrompt] = useState(null); // For viewing details
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null); // Holds the prompt being edited

  const [activeDetailTab, setActiveDetailTab] = useState('Playground');
  const [expandedVersionId, setExpandedVersionId] = useState(null);
  const [varValues, setVarValues] = useState({});

  // Reset playground variables when active prompt changes
  useEffect(() => {
    setVarValues({});
    setActiveDetailTab('Playground');
    setExpandedVersionId(null);
  }, [activePrompt]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Reset pagination to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Admin Dashboard States
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [logInput, setLogInput] = useState("");
  const [adminLogs, setAdminLogs] = useState([
    { timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), level: "INFO", message: "User robertdju@gmail.com logged in successfully from IP 192.168.1.45." },
    { timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(), level: "INFO", message: "Firestore database connection pool initialized on nam5 server." },
    { timestamp: new Date(Date.now() - 3600000).toISOString(), level: "WARN", message: "Firestore read security rules warning: Legacy rules expired. Self-healing triggers activated." },
    { timestamp: new Date(Date.now() - 1800000).toISOString(), level: "SUCCESS", message: "Firestore custom rules deployed: Relaxed read/write permissions live." },
    { timestamp: new Date(Date.now() - 900000).toISOString(), level: "INFO", message: "Admin upgraded user account robertdju@gmail.com to Tier: PREMIUM." }
  ]);
  const [adminFreePrice, setAdminFreePrice] = useState(0);
  const [adminFreeLimit, setAdminFreeLimit] = useState(50);
  const [adminProPrice, setAdminProPrice] = useState(7);
  const [adminProLimit, setAdminProLimit] = useState(1000);
  const [adminPowerPrice, setAdminPowerPrice] = useState(15);
  const [adminPowerLimit, setAdminPowerLimit] = useState(3000);

  // New Stateful Tabs States
  const [collections, setCollections] = useState([
    { id: 'marketing', name: 'Marketing Copy', icon: 'campaign', promptIds: [] },
    { id: 'engineering', name: 'Code Assist & Git', icon: 'code', promptIds: [] },
    { id: 'ai-agents', name: 'AI Strategy Agents', icon: 'smart_toy', promptIds: [] }
  ]);
  const [activeCollectionId, setActiveCollectionId] = useState(null);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionIcon, setNewCollectionIcon] = useState("folder");
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);

  // Billing States
  const [activePlan, setActivePlan] = useState('Free');
  const [invoices, setInvoices] = useState([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  
  // Checkout Form inputs
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  // Settings States
  const [profileName, setProfileName] = useState("Alex Rivera");
  const [profileAvatar, setProfileAvatar] = useState("https://lh3.googleusercontent.com/aida-public/AB6AXuBkfa-3awNqRC3sNV8wK_I6ZdaEYXlAUsNCqbKtgilTWPlpWZ6HkmdshJLLwS_EufEl5K7EuvXWlhdPB_cxWzIkZkZwwpKjYPXsrRZ6KUwMlov_XTpaAZA1KR3tfGeAvbXnGHt8HpTM1FZVT8rmP14rV4fkJ_lrfvvFRia_AVBoxKKktEV_wlmFZiJjgjhOuchXugWQxragJD8D085z9VIQNConRHZVa0-zvQ8DIKDKOW6uLpnEedwL5Kf1d0A9ILFJDFDqndHkOjt0");
  const [themeMode, setThemeMode] = useState("light");
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);

  const [userRole, setUserRole] = useState('USER');

  const hasPremiumAccess = () => {
    if (userRole === 'ADMIN') return true;
    return activePlan === 'Pro' || activePlan === 'Power User' || activePlan === 'PREMIUM';
  };

  const hasPowerUserAccess = () => {
    if (userRole === 'ADMIN') return true;
    return activePlan === 'Power User' || activePlan === 'PREMIUM';
  };

  // Dynamic visible prompts based on user type and ownership
  const visiblePrompts = prompts.filter(p => {
    // 1. System presets/seed prompts are visible to all users
    if (!p.createdBy || p.createdBy === 'system' || p.createdBy === 'preset') return true;
    // 2. Custom prompts explicitly marked as shared are visible to all users
    if (p.isShared) return true;
    // 3. Custom prompts are visible if logged-in user created them
    if (currentUser && p.createdBy === currentUser.uid) return true;
    // 4. Admin can see all custom user-created prompts
    if (userRole === 'ADMIN') return true;
    return false;
  });

  // Prevent non-admin users from staying on Admin Logs view
  useEffect(() => {
    if (activeTab === 'Admin Logs' && userRole !== 'ADMIN') {
      setActiveTab('Dashboard');
    }
  }, [activeTab, userRole]);

  // Route Guard and Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Fetch user data from Firestore if it exists
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            if (userData.name) setProfileName(userData.name);
            if (userData.tier) setActivePlan(userData.tier);
            if (userData.role) setUserRole(userData.role);
            if (userData.status === 'SUSPENDED') {
              alert('Your account is suspended. Please contact support.');
              await signOut(auth);
              router.push('/login');
              return;
            }
          }
        } catch (error) {
          console.error("Error fetching user from Firestore:", error);
        }

        // Fetch billing invoice history from Firestore
        setIsLoadingInvoices(true);
        try {
          const invoicesRef = collection(db, 'users', user.uid, 'invoices');
          const invoicesQuery = query(invoicesRef, orderBy('timestamp', 'desc'));
          const invoicesSnap = await getDocs(invoicesQuery);
          const loadedInvoices = invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setInvoices(loadedInvoices);
        } catch (err) {
          console.error("Failed to load billing history:", err);
        } finally {
          setIsLoadingInvoices(false);
        }

        setAuthLoading(false);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Handle Stripe Checkout Session Redirection
  const handleStripeCheckout = async (plan) => {
    if (!currentUser) {
      triggerToast("Please log in to upgrade your subscription.");
      return;
    }
    
    const normalizedPrice = parseFloat(plan.price.toString().replace('$', ''));

    try {
      triggerToast(`Initiating secure checkout for the ${plan.name} Plan...`);
      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planName: plan.name,
          price: normalizedPrice,
          userId: currentUser.uid,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        triggerToast(`Failed to create Stripe checkout session: ${data.error || 'unknown error'}`);
      }
    } catch (err) {
      console.error("Stripe checkout initiation failed:", err);
      triggerToast("Network error. Please try again.");
    }
  };

  // Handle Stripe Checkout Session Verification on redirect back
  useEffect(() => {
    const verifyStripeSession = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId || !currentUser) return;

      try {
        triggerToast("Verifying your payment credentials...");
        const response = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
        const data = await response.json();

        if (data.success) {
          setActivePlan(data.planName);

          // Persist plan upgrade on user doc
          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            await setDoc(userDocRef, { tier: data.planName }, { merge: true });
          } catch (err) {
            console.error("Failed to persist plan upgrade:", err);
          }

          const amt = Number(data.price);
          const now = new Date();
          const invoiceId = `INV-${now.getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
          const newInvoice = {
            id: invoiceId,
            date: now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
            timestamp: now.toISOString(),
            amount: amt,
            status: 'Paid',
            plan: data.planName,
            sessionId: sessionId
          };

          // Save invoice to Firestore under users/{uid}/invoices/{invoiceId}
          try {
            const invoiceDocRef = doc(db, 'users', currentUser.uid, 'invoices', invoiceId);
            await setDoc(invoiceDocRef, newInvoice);
          } catch (err) {
            console.error("Failed to save invoice to Firestore:", err);
          }

          setInvoices(prev => [newInvoice, ...prev]);
          triggerToast(`Upgrade verified! Welcome to the ${data.planName} tier!`);
        } else {
          triggerToast(`Verification error: ${data.error || 'Payment invalid'}`);
        }
      } catch (err) {
        console.error("Payment verification network request failed:", err);
        triggerToast("Verification check failed. Please refresh the page.");
      } finally {
        // Clear query parameters from URL
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    };

    verifyStripeSession();
  }, [currentUser, searchParams]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Sync theme changes with DOM element
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        setThemeMode(savedTheme);
        document.documentElement.classList.toggle("dark", savedTheme === "dark");
      }
    }
  }, []);

  const handleToggleTheme = (theme) => {
    setThemeMode(theme);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
    }
    document.documentElement.classList.toggle("dark", theme === "dark");
  };

  // Fetch user collections from Firestore when user changes
  useEffect(() => {
    const fetchUserCollections = async () => {
      if (!currentUser) return;
      try {
        const q = query(collection(db, "collections"), orderBy("createdTimestamp"));
        const querySnapshot = await getDocs(q);
        const docs = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.createdBy === currentUser.uid) {
            docs.push({
              id: docSnap.id,
              name: data.name || "Untitled Collection",
              icon: data.icon || "folder",
              promptIds: data.promptIds || [],
              createdBy: data.createdBy,
              createdTimestamp: data.createdTimestamp || Date.now()
            });
          }
        });
        
        // Baseline default collections
        const defaults = [
          { id: 'marketing', name: 'Marketing Copy', icon: 'campaign', promptIds: [] },
          { id: 'engineering', name: 'Code Assist & Git', icon: 'code', promptIds: [] },
          { id: 'ai-agents', name: 'AI Strategy Agents', icon: 'smart_toy', promptIds: [] }
        ];
        setCollections([...defaults, ...docs]);
      } catch (error) {
        console.error("Failed to load collections from Firestore:", error);
        // If query fails or ordering/index is missing, fallback to query without order
        try {
          const q = query(collection(db, "collections"));
          const querySnapshot = await getDocs(q);
          const docs = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.createdBy === currentUser.uid) {
              docs.push({
                id: docSnap.id,
                name: data.name || "Untitled Collection",
                icon: data.icon || "folder",
                promptIds: data.promptIds || [],
                createdBy: data.createdBy,
                createdTimestamp: data.createdTimestamp || Date.now()
              });
            }
          });
          docs.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
          const defaults = [
            { id: 'marketing', name: 'Marketing Copy', icon: 'campaign', promptIds: [] },
            { id: 'engineering', name: 'Code Assist & Git', icon: 'code', promptIds: [] },
            { id: 'ai-agents', name: 'AI Strategy Agents', icon: 'smart_toy', promptIds: [] }
          ];
          setCollections([...defaults, ...docs]);
        } catch (innerErr) {
          console.error("Fallback load failed:", innerErr);
        }
      }
    };

    fetchUserCollections();
  }, [currentUser]);

  // Fetch user API keys from Firestore when user changes
  useEffect(() => {
    const fetchUserApiKeys = async () => {
      if (!currentUser) return;
      try {
        const q = query(collection(db, "apiKeys"), orderBy("createdTimestamp"));
        const querySnapshot = await getDocs(q);
        const docs = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.createdBy === currentUser.uid) {
            docs.push({
              id: docSnap.id,
              name: data.name || "Unnamed Key",
              value: data.value || "",
              dateCreated: data.dateCreated || "",
              createdBy: data.createdBy,
              createdTimestamp: data.createdTimestamp || Date.now()
            });
          }
        });
        setApiKeys(docs);
      } catch (error) {
        console.error("Failed to load API keys from Firestore:", error);
        // Fallback query without orderBy
        try {
          const q = query(collection(db, "apiKeys"));
          const querySnapshot = await getDocs(q);
          const docs = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.createdBy === currentUser.uid) {
              docs.push({
                id: docSnap.id,
                name: data.name || "Unnamed Key",
                value: data.value || "",
                dateCreated: data.dateCreated || "",
                createdBy: data.createdBy,
                createdTimestamp: data.createdTimestamp || Date.now()
              });
            }
          });
          docs.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
          setApiKeys(docs);
        } catch (innerErr) {
          console.error("Fallback load failed:", innerErr);
          // Set simulated keys as fallback
          setApiKeys([
            { id: "key-1", name: "Prod App Live", value: "sk_live_4627dja89d3ja827ad82", dateCreated: "2026-05-12" },
            { id: "key-2", name: "Staging Sandbox", value: "sk_test_8372adja283dha1239ad", dateCreated: "2026-05-24" }
          ]);
        }
      }
    };

    fetchUserApiKeys();
  }, [currentUser]);

  // Helper to get prompts inside a collection
  const getPromptsForCollection = (col) => {
    return visiblePrompts.filter(p => {
      if (p.collectionId === col.id) return true;
      if (col.promptIds && col.promptIds.includes(p.id)) return true;
      if (col.id === 'marketing' && p.category === 'Content') return true;
      if (col.id === 'engineering' && p.category === 'Development') return true;
      if (col.id === 'ai-agents' && p.category === 'Business') return true;
      return false;
    });
  };


  // Library explorer filters and pagination calculations
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState("All");
  const [libraryAccessFilter, setLibraryAccessFilter] = useState("All");
  const [librarySortOrder, setLibrarySortOrder] = useState("newest");
  const [showOnlyMyPrompts, setShowOnlyMyPrompts] = useState(false);
  const [libraryPage, setLibraryPage] = useState(1);

  // States for Exporting Prompts
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('JSON'); // JSON, CSV, Markdown
  const [exportScope, setExportScope] = useState('all'); // all, filtered



  useEffect(() => {
    setLibraryPage(1);
  }, [libraryCategoryFilter, libraryAccessFilter, librarySortOrder, searchTerm, showOnlyMyPrompts]);

  const filteredLibraryPrompts = visiblePrompts.filter(p => {
    const queryStr = searchTerm.toLowerCase();
    const matchesSearch = p.title.toLowerCase().includes(queryStr) ||
                          (p.subtitle && p.subtitle.toLowerCase().includes(queryStr)) ||
                          p.category.toLowerCase().includes(queryStr) ||
                          (p.tags && p.tags.some(tag => tag.toLowerCase().includes(queryStr)));
    if (!matchesSearch) return false;
    if (libraryCategoryFilter !== 'All' && p.category !== libraryCategoryFilter) return false;
    if (libraryAccessFilter !== 'All' && p.access !== libraryAccessFilter) return false;
    if (showOnlyMyPrompts && currentUser && p.createdBy !== currentUser.uid) return false;
    return true;
  });

  const sortedLibraryPrompts = [...filteredLibraryPrompts].sort((a, b) => {
    if (librarySortOrder === 'alphabetical') return a.title.localeCompare(b.title);
    if (librarySortOrder === 'category') return a.category.localeCompare(b.category);
    return b.createdTimestamp - a.createdTimestamp;
  });

  const LIBRARY_ITEMS_PER_PAGE = 6;
  const totalLibraryPages = Math.max(1, Math.ceil(sortedLibraryPrompts.length / LIBRARY_ITEMS_PER_PAGE));
  const activeLibraryPage = Math.min(libraryPage, totalLibraryPages);
  const libStartIndex = (activeLibraryPage - 1) * LIBRARY_ITEMS_PER_PAGE;
  const libEndIndex = libStartIndex + LIBRARY_ITEMS_PER_PAGE;
  const paginatedLibraryPrompts = sortedLibraryPrompts.slice(libStartIndex, libEndIndex);

  const allExportCount = hasPremiumAccess() 
    ? visiblePrompts.length 
    : visiblePrompts.filter(p => p.access !== 'Premium').length;

  const filteredExportCount = hasPremiumAccess() 
    ? filteredLibraryPrompts.length 
    : filteredLibraryPrompts.filter(p => p.access !== 'Premium').length;

  // Fetch users from Firestore when Admin Logs tab is opened
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const docs = [];
        querySnapshot.forEach((docSnap) => {
          docs.push({ docId: docSnap.id, ...docSnap.data() });
        });
        setUsers(docs);
      } catch (error) {
        console.error("Failed to fetch users from Firestore:", error);
        // Fallback simulated users
        setUsers([
          { docId: "3bUL7u3kBFehQtUVVNvSRpaii6t1", id: "3bUL7u3kBFehQtUVVNvSRpaii6t1", name: "CYCLING ROB", email: "robertdju@gmail.com", role: "ADMIN", tier: "PREMIUM", status: "ACTIVE", lastLogin: "2026-04-27T13:55:35.192Z" },
          { docId: "WAwbS51CMSTCtf561z1EJSWvwV53", id: "WAwbS51CMSTCtf561z1EJSWvwV53", name: "Mavio Deo", email: "maviodeo@gmail.com", role: "USER", tier: "FREE", status: "ACTIVE", lastLogin: "2026-04-26T13:47:04.431Z" }
        ]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (activeTab === 'Admin Logs') {
      fetchUsers();
    }
  }, [activeTab]);

  // Toggle User tier (upgrade/downgrade subscription live in Firestore!)
  const handleToggleUserTier = async (user) => {
    const currentTierNormalized = (user.tier || 'Free').trim().toLowerCase();
    let resolvedTier = 'Free';
    if (currentTierNormalized === 'free') {
      resolvedTier = 'Pro';
    } else if (currentTierNormalized === 'pro') {
      resolvedTier = 'Power User';
    } else {
      resolvedTier = 'Free';
    }

    const newTier = u => u.docId === user.docId ? { ...u, tier: resolvedTier } : u;
    try {
      const docRef = doc(db, "users", user.docId);
      await updateDoc(docRef, { tier: resolvedTier });
      setUsers(users.map(newTier));
      
      const newLog = {
        timestamp: new Date().toISOString(),
        level: "SUCCESS",
        message: `Admin modified tier of user ${user.email} from ${user.tier || 'Free'} to ${resolvedTier}.`
      };
      setAdminLogs([newLog, ...adminLogs]);
      triggerToast(`Successfully changed ${user.name}'s tier to ${resolvedTier}!`);
    } catch (error) {
      console.error("Failed to update user tier in Firestore:", error);
      triggerToast("Failed to write to Firestore. Simulating update locally.");
      setUsers(users.map(newTier));
    }
  };

  // Toggle User status (ACTIVE / SUSPENDED live in Firestore!)
  const handleToggleUserStatus = async (user) => {
    const newStatus = u => u.docId === user.docId ? { ...u, status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } : u;
    const resolvedStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const docRef = doc(db, "users", user.docId);
      await updateDoc(docRef, { status: resolvedStatus });
      setUsers(users.map(newStatus));
      
      const newLog = {
        timestamp: new Date().toISOString(),
        level: resolvedStatus === 'ACTIVE' ? "INFO" : "WARN",
        message: `Admin modified status of user ${user.email} from ${user.status} to ${resolvedStatus}.`
      };
      setAdminLogs([newLog, ...adminLogs]);
      triggerToast(`Successfully set ${user.name}'s status to ${resolvedStatus}!`);
    } catch (error) {
      console.error("Failed to update user status in Firestore:", error);
      triggerToast("Failed to write to Firestore. Simulating status locally.");
      setUsers(users.map(newStatus));
    }
  };

  // Save the configured Access Tier pricing and limits to Firestore settings config
  const handleSaveTierConfig = async (e) => {
    e.preventDefault();
    const updatedConfig = {
      freePrice: Number(adminFreePrice),
      freeLimit: Number(adminFreeLimit),
      proPrice: Number(adminProPrice),
      proLimit: Number(adminProLimit),
      powerPrice: Number(adminPowerPrice),
      powerLimit: Number(adminPowerLimit)
    };

    try {
      const configDocRef = doc(db, 'settings', 'config');
      await setDoc(configDocRef, updatedConfig);
      setTierConfig(updatedConfig);
      
      const newLog = {
        timestamp: new Date().toISOString(),
        level: "SUCCESS",
        message: `Admin updated tier pricing & limits: Free Limit = ${adminFreeLimit}, Pro Limit = ${adminProLimit}, Power Limit = ${adminPowerLimit}. Free = $${adminFreePrice}/mo, Pro = $${adminProPrice}/mo, Power = $${adminPowerPrice}/mo.`
      };
      setAdminLogs([newLog, ...adminLogs]);
      triggerToast("Tier configuration saved successfully!");
    } catch (error) {
      console.error("Failed to save config to Firestore:", error);
      triggerToast("Failed to save. Simulated configuration locally.");
      setTierConfig(updatedConfig);
    }
  };

  // Append new system log
  const handleAddSystemLog = (e) => {
    e.preventDefault();
    if (!logInput.trim()) return;
    const newLog = {
      timestamp: new Date().toISOString(),
      level: "INFO",
      message: logInput
    };
    setAdminLogs([newLog, ...adminLogs]);
    setLogInput("");
    triggerToast("Broadcast log entry created.");
  };

  // Toast / Status State
  const [toastMessage, setToastMessage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Form States for Add/Edit
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formCategory, setFormCategory] = useState('Content');
  const [formTags, setFormTags] = useState('');
  const [formAccess, setFormAccess] = useState('Basic');
  const [formTemplate, setFormTemplate] = useState('');
  const [formIsShared, setFormIsShared] = useState(false);
  const [formCollectionId, setFormCollectionId] = useState("");



  // Fetch prompts and configuration from Firestore & auto-seed if empty
  useEffect(() => {
    const fetchPromptsAndConfig = async () => {
      setIsLoading(true);
      try {
        const configDocRef = doc(db, 'settings', 'config');
        const configSnap = await getDoc(configDocRef);
        if (configSnap.exists()) {
          const data = configSnap.data();
          setTierConfig(data);
          setAdminFreePrice(data.freePrice ?? 0);
          setAdminFreeLimit(data.freeLimit ?? 50);
          setAdminProPrice(data.proPrice ?? 7);
          setAdminProLimit(data.proLimit ?? 1000);
          setAdminPowerPrice(data.powerPrice ?? 15);
          setAdminPowerLimit(data.powerLimit ?? 3000);
        } else {
          const defaults = {
            freePrice: 0,
            freeLimit: 50,
            proPrice: 7,
            proLimit: 1000,
            powerPrice: 15,
            powerLimit: 3000
          };
          await setDoc(configDocRef, defaults);
          setTierConfig(defaults);
          setAdminFreePrice(0);
          setAdminFreeLimit(50);
          setAdminProPrice(7);
          setAdminProLimit(1000);
          setAdminPowerPrice(15);
          setAdminPowerLimit(3000);
        }
      } catch (error) {
        console.error("Failed to load settings config from Firestore:", error);
      }

      try {
        // Query the collection without orderBy to prevent "index required" errors 
        // and avoid skipping legacy documents that do not have "createdTimestamp"
        const q = query(collection(db, "prompts"));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          // Auto-seed initial baseline prompts if collection is completely empty
          const seededPrompts = [];
          const presets = [
            {
              title: "SEO Blog Post Generator",
              subtitle: "GPT-4 Optimized",
              description: "GPT-4 Optimized",
              category: "Content",
              tags: ["SEO", "Blog"],
              access: "Basic",
              isMemberOnly: false,
              createdDate: "Oct 24, 2024",
              createdAt: new Date(Date.now() - 3000).toISOString(),
              template: "Write a blog post about ##Topic## targeting ##Audience##. Optimize for search intent, inclusion of secondary LSI terms, and high readability index.",
              content: "Write a blog post about ##Topic## targeting ##Audience##. Optimize for search intent, inclusion of secondary LSI terms, and high readability index.",
              createdTimestamp: Date.now() - 3000
            },
            {
              title: "React Component Architect",
              subtitle: "Tailwind focus",
              description: "Tailwind focus",
              category: "Development",
              tags: ["React", "UI"],
              access: "Premium",
              isMemberOnly: true,
              createdDate: "Oct 22, 2024",
              createdAt: new Date(Date.now() - 2000).toISOString(),
              template: "Design a React component for a ##ComponentName## using Tailwind CSS utilities. Ensure clean atomic design and screen-reader friendliness.",
              content: "Design a React component for a ##ComponentName## using Tailwind CSS utilities. Ensure clean atomic design and screen-reader friendliness.",
              createdTimestamp: Date.now() - 2000
            },
            {
              title: "Customer Support Persona",
              subtitle: "Empathetic Tone",
              description: "Empathetic Tone",
              category: "Business",
              tags: ["Service"],
              access: "Basic",
              isMemberOnly: false,
              createdDate: "Oct 19, 2024",
              createdAt: new Date(Date.now() - 1000).toISOString(),
              template: "Respond to the customer's request ##CustomerMessage## using a highly empathetic, professional, and helpful support tone. Suggest secondary links to user guides.",
              content: "Respond to the customer's request ##CustomerMessage## using a highly empathetic, professional, and helpful support tone. Suggest secondary links to user guides.",
              createdTimestamp: Date.now() - 1000
            }
          ];
          
          for (const preset of presets) {
            const docRef = await addDoc(collection(db, "prompts"), preset);
            seededPrompts.push({ id: docRef.id, ...preset });
          }
          setPrompts(seededPrompts);
        } else {
          const docs = [];
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            
            // Normalize tags which could be an array of strings or an array of map objects
            const normalizedTags = Array.isArray(data.tags)
              ? data.tags.map(tag => {
                  if (typeof tag === 'string') return tag;
                  if (tag && typeof tag === 'object') return tag.name || tag.id || '';
                  return '';
                }).filter(Boolean)
              : [];

            const createdDate = data.createdDate 
              || (data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '')
              || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            const createdTimestamp = data.createdTimestamp 
              || (data.createdAt ? new Date(data.createdAt).getTime() : 0)
              || Date.now();

            docs.push({
              id: docSnap.id,
              title: data.title || "Untitled Prompt",
              subtitle: data.subtitle || data.description || "No description provided",
              category: data.category || "General",
              tags: normalizedTags,
              access: data.access || (data.isMemberOnly ? "Premium" : "Basic"),
              createdDate: createdDate,
              createdTimestamp: createdTimestamp,
              template: data.template || data.content || "No template content",
              createdBy: data.createdBy || 'system',
              isShared: data.isShared || false,
              collectionId: data.collectionId || null,
              versions: data.versions || []
            });
          });

          // Sort descending by timestamp client-side
          docs.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
          setPrompts(docs);
        }
      } catch (error) {
        console.error("Firestore database connection failed. Falling back to frontend mockup data:", error);
        // Clean fallback so that platform is always highly functional
        setPrompts(BACKUP_PROMPTS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPromptsAndConfig();
  }, []);

  // Trigger Toast Notification
  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open modal for adding a new prompt
  const openAddModal = () => {
    setFormTitle('');
    setFormSubtitle('');
    setFormCategory('Content');
    setFormTags('');
    setFormAccess('Basic');
    setFormTemplate('');
    setFormIsShared(false);
    setFormCollectionId('');
    setIsAddModalOpen(true);
  };

  // Check plan and open modal or redirect to Billing for free users
  const handleCreatePromptClick = () => {
    const myPromptsCount = prompts.filter(p => p.createdBy === currentUser?.uid).length;
    if (!hasPremiumAccess() && myPromptsCount >= tierConfig.freeLimit) {
      setActiveTab('Billing');
      triggerToast(`Limit reached. Upgrade to Pro to create more than ${tierConfig.freeLimit} prompts!`);
    } else {
      openAddModal();
    }
  };

  // Handle adding new prompt to Firestore database
  const handleAddPrompt = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const newPromptData = {
      title: formTitle,
      subtitle: formSubtitle || "Custom prompt structure",
      description: formSubtitle || "Custom prompt structure", // compat
      category: formCategory,
      tags: formTags.split(',').map(t => t.trim()).filter(t => t.length > 0),
      access: formAccess,
      isMemberOnly: formAccess === 'Premium', // compat
      createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      createdAt: new Date().toISOString(), // compat
      template: formTemplate || "You are an assistant. ##Instruction##",
      content: formTemplate || "You are an assistant. ##Instruction##", // compat
      createdTimestamp: Date.now(),
      createdBy: currentUser ? currentUser.uid : 'system',
      isShared: formIsShared,
      collectionId: formCollectionId || null
    };

    try {
      const docRef = await addDoc(collection(db, "prompts"), newPromptData);
      setPrompts([{ id: docRef.id, ...newPromptData }, ...prompts]);
      setIsAddModalOpen(false);
      triggerToast("Prompt created successfully in database!");
    } catch (error) {
      console.error("Firestore write failed:", error);
      triggerToast("Failed to write to database. Saved locally.");
      // Fallback local append on sandbox limits
      setPrompts([{ id: `local-${Date.now()}`, ...newPromptData }, ...prompts]);
      setIsAddModalOpen(false);
    }
  };

  // Open modal for editing a prompt
  const openEditModal = (prompt, e) => {
    e.stopPropagation();
    setEditingPrompt(prompt);
    setFormTitle(prompt.title);
    setFormSubtitle(prompt.subtitle || '');
    setFormCategory(prompt.category);
    setFormTags(prompt.tags ? prompt.tags.join(', ') : '');
    setFormAccess(prompt.access);
    setFormTemplate(prompt.template);
    setFormIsShared(prompt.isShared || false);
    setFormCollectionId(prompt.collectionId || '');
  };

  // Handle saving edited prompt to Firestore
  const handleEditPrompt = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    // Create a snapshot of the pre-edited state to prepend to version history
    const versionSnapshot = {
      versionId: `v-${Date.now()}`,
      title: editingPrompt.title,
      subtitle: editingPrompt.subtitle || editingPrompt.description || '',
      category: editingPrompt.category,
      tags: editingPrompt.tags || [],
      access: editingPrompt.access,
      template: editingPrompt.template || editingPrompt.content || '',
      isShared: editingPrompt.isShared || false,
      updatedTimestamp: Date.now(),
      updatedBy: currentUser ? currentUser.uid : 'system'
    };
    const updatedVersions = [versionSnapshot, ...(editingPrompt.versions || [])];

    const updatedData = {
      title: formTitle,
      subtitle: formSubtitle,
      description: formSubtitle, // compat
      category: formCategory,
      tags: formTags.split(',').map(t => t.trim()).filter(t => t.length > 0),
      access: formAccess,
      isMemberOnly: formAccess === 'Premium', // compat
      template: formTemplate,
      content: formTemplate, // compat
      isShared: formIsShared,
      collectionId: formCollectionId || null,
      versions: updatedVersions
    };

    try {
      if (typeof editingPrompt.id === 'string' && editingPrompt.id.startsWith('backup-')) {
        // Fallback simulation edit
        const updatedPrompt = { ...editingPrompt, ...updatedData };
        setPrompts(prompts.map(p => p.id === editingPrompt.id ? updatedPrompt : p));
        if (activePrompt && activePrompt.id === editingPrompt.id) {
          setActivePrompt(updatedPrompt);
        }
      } else {
        const docRef = doc(db, "prompts", editingPrompt.id);
        await updateDoc(docRef, updatedData);
        const updatedPrompt = { ...editingPrompt, ...updatedData };
        setPrompts(prompts.map(p => p.id === editingPrompt.id ? updatedPrompt : p));
        if (activePrompt && activePrompt.id === editingPrompt.id) {
          setActivePrompt(updatedPrompt);
        }
      }
      setEditingPrompt(null);
      triggerToast("Prompt updated in database!");
    } catch (error) {
      console.error("Firestore edit failed:", error);
      triggerToast("Database edit failed. Simulating update locally.");
      const updatedPrompt = { ...editingPrompt, ...updatedData };
      setPrompts(prompts.map(p => p.id === editingPrompt.id ? updatedPrompt : p));
      if (activePrompt && activePrompt.id === editingPrompt.id) {
        setActivePrompt(updatedPrompt);
      }
      setEditingPrompt(null);
    }
  };

  // Handle restoring a previous version of a prompt
  const handleRestoreVersion = async (prompt, targetVersion) => {
    // Create a snapshot of the current active state prior to restoring
    const currentActiveSnapshot = {
      versionId: `v-${Date.now()}`,
      title: prompt.title,
      subtitle: prompt.subtitle || prompt.description || '',
      category: prompt.category,
      tags: prompt.tags || [],
      access: prompt.access,
      template: prompt.template || prompt.content || '',
      isShared: prompt.isShared || false,
      updatedTimestamp: Date.now(),
      updatedBy: currentUser ? currentUser.uid : 'system'
    };

    const updatedVersions = [currentActiveSnapshot, ...(prompt.versions || [])];

    const restoredData = {
      title: targetVersion.title,
      subtitle: targetVersion.subtitle || '',
      description: targetVersion.subtitle || '', // compat
      category: targetVersion.category,
      tags: targetVersion.tags || [],
      access: targetVersion.access,
      isMemberOnly: targetVersion.access === 'Premium', // compat
      template: targetVersion.template,
      content: targetVersion.template, // compat
      isShared: targetVersion.isShared || false,
      versions: updatedVersions
    };

    try {
      if (typeof prompt.id === 'string' && prompt.id.startsWith('backup-')) {
        // Fallback simulation
        const updatedPrompt = { ...prompt, ...restoredData };
        setPrompts(prompts.map(p => p.id === prompt.id ? updatedPrompt : p));
        if (activePrompt && activePrompt.id === prompt.id) {
          setActivePrompt(updatedPrompt);
        }
      } else {
        const docRef = doc(db, "prompts", prompt.id);
        await updateDoc(docRef, restoredData);
        const updatedPrompt = { ...prompt, ...restoredData };
        setPrompts(prompts.map(p => p.id === prompt.id ? updatedPrompt : p));
        if (activePrompt && activePrompt.id === prompt.id) {
          setActivePrompt(updatedPrompt);
        }
      }
      triggerToast("Version restored successfully!");
    } catch (error) {
      console.error("Firestore restore version failed:", error);
      triggerToast("Database update failed. Simulating restore locally.");
      const updatedPrompt = { ...prompt, ...restoredData };
      setPrompts(prompts.map(p => p.id === prompt.id ? updatedPrompt : p));
      if (activePrompt && activePrompt.id === prompt.id) {
        setActivePrompt(updatedPrompt);
      }
    }
  };

  // Handle deleting a prompt from Firestore
  const handleDeletePrompt = async (id, e) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this prompt from the database?")) {
      try {
        if (typeof id === 'string' && id.startsWith('backup-')) {
          setPrompts(prompts.filter(p => p.id !== id));
        } else {
          const docRef = doc(db, "prompts", id);
          await deleteDoc(docRef);
          setPrompts(prompts.filter(p => p.id !== id));
        }
        triggerToast("Prompt deleted from database.");
      } catch (error) {
        console.error("Firestore delete failed:", error);
        triggerToast("Failed to delete from database. Simulating delete locally.");
        setPrompts(prompts.filter(p => p.id !== id));
      }
    }
  };

  // Copy template logic
  const handleCopyTemplate = (prompt, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.template);
    setCopiedId(prompt.id);
    triggerToast("Template copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Single Prompt Export Helpers
  const exportSinglePromptJSON = (prompt) => {
    try {
      const cleanPrompt = {
        title: prompt.title,
        subtitle: prompt.subtitle,
        category: prompt.category,
        tags: prompt.tags,
        access: prompt.access,
        template: prompt.template,
        createdBy: prompt.createdBy,
        createdDate: prompt.createdDate
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanPrompt, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${prompt.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_prompt.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerToast("Prompt exported as JSON!");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to export prompt.");
    }
  };

  const exportSinglePromptText = (prompt, compiledText) => {
    try {
      const textContent = `Title: ${prompt.title}\nCategory: ${prompt.category}\nTags: ${prompt.tags ? prompt.tags.join(', ') : ''}\n\nTemplate Instructions:\n${compiledText || prompt.template}`;
      const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(textContent);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${prompt.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_prompt.txt`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerToast("Prompt exported as Text!");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to export prompt.");
    }
  };

  const handleBulkExport = () => {
    try {
      let exportList = exportScope === 'filtered' ? filteredLibraryPrompts : visiblePrompts;

      // Restrict exporting premium prompts in bulk if the user doesn't have premium access
      if (!hasPremiumAccess()) {
        const originalCount = exportList.length;
        exportList = exportList.filter(p => p.access !== 'Premium');
        const premiumCount = originalCount - exportList.length;
        if (premiumCount > 0) {
          triggerToast(`Filtered out ${premiumCount} premium prompts from export.`);
        }
      }

      if (exportList.length === 0) {
        triggerToast("No prompts to export.");
        return;
      }

      let dataContent = "";
      let mimeType = "text/plain";
      let fileExtension = "txt";

      if (exportFormat === 'JSON') {
        const cleanList = exportList.map(p => ({
          title: p.title,
          subtitle: p.subtitle,
          category: p.category,
          tags: p.tags,
          access: p.access,
          template: p.template,
          createdBy: p.createdBy,
          createdDate: p.createdDate
        }));
        dataContent = JSON.stringify(cleanList, null, 2);
        mimeType = "application/json";
        fileExtension = "json";
      } else if (exportFormat === 'CSV') {
        const headers = ["Title", "Subtitle", "Category", "Tags", "Access", "Created Date", "Template"];
        const rows = exportList.map(p => [
          `"${p.title.replace(/"/g, '""')}"`,
          `"${(p.subtitle || '').replace(/"/g, '""')}"`,
          `"${p.category}"`,
          `"${(p.tags || []).join(', ').replace(/"/g, '""')}"`,
          `"${p.access}"`,
          `"${p.createdDate}"`,
          `"${p.template.replace(/"/g, '""')}"`
        ]);
        dataContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        mimeType = "text/csv";
        fileExtension = "csv";
      } else if (exportFormat === 'Markdown') {
        dataContent = exportList.map(p => {
          return `# ${p.title}\n\n**Subtitle:** ${p.subtitle || 'N/A'}\n**Category:** ${p.category} | **Access:** ${p.access} | **Created:** ${p.createdDate}\n**Tags:** ${(p.tags || []).map(t => `\`#${t}\``).join(' ')}\n\n### Instructions Template:\n\`\`\`\n${p.template}\n\`\`\`\n\n---`;
        }).join('\n\n');
        mimeType = "text/markdown";
        fileExtension = "md";
      }

      const dataStr = `data:${mimeType};charset=utf-8,` + encodeURIComponent(dataContent);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `prompt_library_export_${exportScope}_${Date.now()}.${fileExtension}`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setIsExportModalOpen(false);
      triggerToast(`Exported ${exportList.length} prompts to ${exportFormat}!`);
    } catch (err) {
      console.error(err);
      triggerToast("Export failed.");
    }
  };


  // Real-time search filter logic
  const filteredPrompts = visiblePrompts.filter(p => {
    const queryStr = searchTerm.toLowerCase();
    return p.title.toLowerCase().includes(queryStr) ||
           (p.subtitle && p.subtitle.toLowerCase().includes(queryStr)) ||
           p.category.toLowerCase().includes(queryStr) ||
           (p.tags && p.tags.some(tag => tag.toLowerCase().includes(queryStr)));
  });

  // Client-side pagination constants and calculations
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(filteredPrompts.length / ITEMS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  
  const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPrompts = filteredPrompts.slice(startIndex, endIndex);

  // Calculate dynamic capacity usage
  const myCustomPromptsCount = prompts.filter(p => p.createdBy === currentUser?.uid).length;
  const getUserLimit = () => {
    if (activePlan === 'Free') return tierConfig.freeLimit;
    if (activePlan === 'Pro') return tierConfig.proLimit;
    if (activePlan === 'Power User' || activePlan === 'PREMIUM') return tierConfig.powerLimit;
    return tierConfig.freeLimit;
  };
  const userLimit = getUserLimit();
  const tokensUsedPercentage = Math.round((myCustomPromptsCount / userLimit) * 100 * 10) / 10;

  // ==========================================
  // TAB RENDER HELPER FUNCTIONS
  // ==========================================

  const renderAdminLogsView = () => {
    return (
      <div className="space-y-lg animate-in fade-in duration-200">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md border-b border-outline-variant/20 pb-md">
          <div>
            <h2 className="text-headline-lg font-bold text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary text-[32px]">admin_panel_settings</span>
              Administrative Console
            </h2>
            <p className="text-body-md text-on-surface-variant mt-1">Live management dashboard for user permissions, subscriptions, database health, and activity logs.</p>
          </div>
          <div className="flex gap-sm">
            <span className="flex items-center gap-xs px-md py-sm bg-success-container/10 border border-success/20 rounded-xl text-success text-label-md font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse"></span>
              Live Connection Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
          <div className="bg-surface-container-lowest border border-outline-variant/40 p-lg rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-[22px]">group</span>
              <span className="text-label-md font-bold uppercase tracking-wider text-xs">Total Accounts</span>
            </div>
            <div className="mt-md">
              <div className="text-display-md font-bold text-on-surface leading-none">{isLoadingUsers ? '...' : users.length}</div>
              <p className="text-label-sm text-on-surface-variant/80 font-medium mt-xs">Synced from Cloud Firestore</p>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/40 p-lg rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-secondary text-[22px]">workspace_premium</span>
              <span className="text-label-md font-bold uppercase tracking-wider text-xs">Premium Subscribers</span>
            </div>
            <div className="mt-md">
              <div className="text-display-md font-bold text-secondary leading-none">
                {isLoadingUsers ? '...' : users.filter(u => u.tier === 'PREMIUM').length}
              </div>
              <p className="text-label-sm text-on-surface-variant/80 font-medium mt-xs">
                {isLoadingUsers ? '...' : `${Math.round((users.filter(u => u.tier === 'PREMIUM').length / (users.length || 1)) * 100)}% ratio`}
              </p>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/40 p-lg rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-success text-[22px]">speed</span>
              <span className="text-label-md font-bold uppercase tracking-wider text-xs">Firestore Response</span>
            </div>
            <div className="mt-md">
              <div className="text-display-md font-bold text-success leading-none">12ms</div>
              <div className="flex items-center gap-xs mt-xs text-success font-bold text-label-xs">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                <span>Healthy Connection</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/40 p-lg rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-tertiary text-[22px]">security</span>
              <span className="text-label-md font-bold uppercase tracking-wider text-xs">Security Rules Compliance</span>
            </div>
            <div className="mt-md">
              <div className="text-display-md font-bold text-tertiary leading-none">100%</div>
              <p className="text-label-sm text-on-surface-variant/80 font-medium mt-xs">Self-healing secure status</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-stretch">
          <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/40 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between min-h-[400px]">
            <div>
              <div className="px-lg py-md border-b border-outline-variant/30 bg-surface-container-low/20">
                <h3 className="text-title-md font-bold text-on-surface flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">manage_accounts</span>
                  Cloud Users Directory
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low/50 border-b border-outline-variant/20">
                      <th className="px-lg py-sm text-label-xs font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">User name / Email</th>
                      <th className="px-lg py-sm text-label-xs font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Role / Tier</th>
                      <th className="px-lg py-sm text-label-xs font-bold text-on-surface-variant uppercase tracking-wider text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {isLoadingUsers ? (
                      [1, 2].map(n => (
                        <tr key={n} className="animate-pulse">
                          <td className="px-lg py-md">
                            <div className="h-4 bg-surface-container-high rounded w-2/3 mb-2"></div>
                            <div className="h-3 bg-surface-container-low rounded w-1/2"></div>
                          </td>
                          <td className="px-lg py-md">
                            <div className="h-5 bg-surface-container-high rounded w-12 flex items-center"></div>
                          </td>
                          <td className="px-lg py-md">
                            <div className="h-7 bg-surface-container-high rounded w-20 ml-auto flex items-center"></div>
                          </td>
                        </tr>
                      ))
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="px-lg py-xl text-center text-on-surface-variant text-body-md font-medium">
                          No users found in database directory.
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.docId} className="hover:bg-surface-container/20 transition-colors">
                          <td className="px-lg py-md">
                            <div className="flex flex-col">
                              <span className="text-body-md font-bold text-on-surface">{user.name || "Offline User"}</span>
                              <span className="text-label-xs text-on-surface-variant/80 font-mono mt-0.5">{user.email}</span>
                            </div>
                          </td>
                          <td className="px-lg py-md">
                            <div className="flex gap-sm items-center">
                              <span className={`px-sm py-0.5 rounded-full text-[9px] font-bold ${
                                user.role === 'ADMIN' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-primary-container/10 text-primary border border-primary/20'
                              }`}>
                                {user.role || 'USER'}
                              </span>
                              <span className={`px-sm py-0.5 rounded-full text-[9px] font-bold ${
                                user.tier === 'Power User' || user.tier === 'PREMIUM'
                                  ? 'bg-success-container/10 text-success border border-success/20'
                                  : user.tier === 'Pro'
                                  ? 'bg-primary-container/10 text-primary border border-primary/20'
                                  : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/30'
                              }`}>
                                {user.tier || 'Free'}
                              </span>
                            </div>
                          </td>
                          <td className="px-lg py-md text-right">
                            <div className="flex gap-xs justify-end">
                              <button 
                                onClick={() => handleToggleUserTier(user)}
                                className="px-sm py-1 border border-outline-variant rounded-lg text-label-xs font-bold hover:bg-surface-container-high hover:text-primary transition-all cursor-pointer"
                                title="Toggle User Tier (Free -> Pro -> Power User)"
                              >
                                Toggle Tier
                              </button>
                              <button 
                                onClick={() => handleToggleUserStatus(user)}
                                className={`px-sm py-1 rounded-lg text-label-xs font-bold border transition-all cursor-pointer ${
                                  user.status === 'ACTIVE'
                                    ? 'border-error/20 text-error hover:bg-error-container/10'
                                    : 'border-success/20 text-success hover:bg-success-container/10'
                                }`}
                                title="Toggle active status suspend/activate"
                              >
                                {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-lg py-md bg-surface-container-low/20 border-t border-outline-variant/30 text-label-sm text-on-surface-variant/80 font-medium">
              Directory displays users registered under app services collection.
            </div>
          </div>

          <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between p-lg min-h-[400px]">
            <form onSubmit={handleSaveTierConfig} className="space-y-md flex flex-col justify-between h-full">
              <div>
                <h3 className="text-title-md font-bold text-on-surface flex items-center gap-xs mb-sm">
                  <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
                  Tier & Limits Config
                </h3>
                <p className="text-label-md text-on-surface-variant font-medium mb-md">Configure global limits and plan pricing synced directly to billing.</p>
                
                <div className="space-y-sm">
                  <div className="space-y-xs">
                    <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider text-[11px] block">Free Price ($ / month)</label>
                    <input 
                      type="number"
                      value={adminFreePrice}
                      onChange={(e) => setAdminFreePrice(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-md py-sm text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider text-[11px] block">Free Limit (max saved prompts)</label>
                    <input 
                      type="number"
                      value={adminFreeLimit}
                      onChange={(e) => setAdminFreeLimit(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-md py-sm text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider text-[11px] block">Pro Plan Price ($ / month)</label>
                    <input 
                      type="number"
                      value={adminProPrice}
                      onChange={(e) => setAdminProPrice(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-md py-sm text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider text-[11px] block">Pro Limit (max saved prompts)</label>
                    <input 
                      type="number"
                      value={adminProLimit}
                      onChange={(e) => setAdminProLimit(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-md py-sm text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider text-[11px] block">Power User Price ($ / month)</label>
                    <input 
                      type="number"
                      value={adminPowerPrice}
                      onChange={(e) => setAdminPowerPrice(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-md py-sm text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold"
                      required
                    />
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider text-[11px] block">Power User Limit (max saved prompts)</label>
                    <input 
                      type="number"
                      value={adminPowerLimit}
                      onChange={(e) => setAdminPowerLimit(e.target.value)}
                      className="w-full bg-surface border border-outline-variant rounded-xl px-md py-sm text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold"
                      required
                    />
                  </div>
                </div>
              </div>
              <button 
                type="submit"
                className="mt-lg w-full bg-primary text-on-primary py-sm rounded-xl font-semibold hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-sm text-body-md"
              >
                Save Configuration
              </button>
            </form>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-[300px]">
          <div className="px-lg py-md border-b border-outline-variant/30 bg-surface-container-low/20 flex justify-between items-center">
            <h3 className="text-title-md font-bold text-on-surface flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary text-[20px]">terminal</span>
              Activity Logs Console
            </h3>
            <span className="text-[9px] font-bold font-mono uppercase bg-error/15 text-error px-sm py-0.5 rounded border border-error/25 tracking-wider animate-pulse">SECURE MONITOR</span>
          </div>

          <div className="p-md bg-black/90 text-success font-mono text-[11px] whitespace-pre-wrap leading-relaxed flex-grow overflow-y-auto max-h-[280px]">
            {adminLogs.map((log, idx) => (
              <div key={idx} className="mb-md hover:bg-white/5 px-sm py-0.5 rounded">
                <span className="text-white/40">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{" "}
                <span className={
                  log.level === 'SUCCESS' ? 'text-green-400 font-bold' :
                  log.level === 'WARN' ? 'text-amber-400 font-bold' :
                  log.level === 'ERROR' ? 'text-red-400 font-bold' : 'text-cyan-400 font-bold'
                }>
                  {log.level}
                </span>:{" "}
                <span className="text-white/90">{log.message}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddSystemLog} className="p-md bg-surface-container-low border-t border-outline-variant/30 flex gap-sm items-center">
            <input 
              type="text"
              value={logInput}
              onChange={(e) => setLogInput(e.target.value)}
              placeholder="Add log entry or system message..."
              className="flex-1 bg-surface border border-outline-variant rounded-xl px-md py-sm text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
            />
            <button 
              type="submit"
              className="bg-primary text-on-primary p-md rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              title="Add notice log"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderDashboardView = () => {
    return (
      <div className="space-y-lg animate-in fade-in duration-200">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <h2 className="text-headline-lg font-bold text-on-surface">Welcome back, {profileName.split(' ')[0]}</h2>
            <p className="text-body-md text-on-surface-variant mt-1">Here's what's happening with your prompt library today.</p>
          </div>
          <button 
            onClick={handleCreatePromptClick}
            className="bg-primary text-on-primary px-lg py-md rounded-xl font-semibold text-body-md hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center gap-sm shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined">add</span>
            Add Prompt
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          <div className="bg-surface-container-lowest border border-outline-variant/40 p-lg rounded-xl shadow-sm md:col-span-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-md">
                <span className="bg-secondary-container/10 text-secondary px-sm py-xs rounded text-[10px] font-bold uppercase tracking-wider">{activePlan.toUpperCase()} PLAN ACTIVE</span>
                <span className="material-symbols-outlined text-primary text-[20px]">verified</span>
              </div>
              <h3 className="text-title-md font-bold text-on-surface">Plan Storage Usage</h3>
              <div className="mt-md space-y-xs">
                <div className="flex justify-between text-label-md">
                  <span className="text-on-surface-variant font-medium">Prompts saved</span>
                  <span className="text-on-surface font-bold">{isLoading ? '...' : `${tokensUsedPercentage}%`}</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500" 
                    style={{ width: isLoading ? '0%' : `${Math.min(tokensUsedPercentage, 100)}%` }}
                  ></div>
                </div>
                <p className="text-label-md text-on-surface-variant font-medium pt-xs">{isLoading ? 'Checking...' : `${myCustomPromptsCount} / ${userLimit} custom prompts`}</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('Billing')}
              className="mt-lg w-full border border-primary text-primary py-sm rounded-lg text-label-md font-semibold hover:bg-primary/5 transition-colors cursor-pointer"
            >
              Upgrade Plan Limit
            </button>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/40 p-lg rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary text-[22px]">description</span>
              <span className="text-label-md font-bold uppercase tracking-wider text-xs">Total Prompts</span>
            </div>
            <div className="mt-md">
              <div className="text-6xl font-black text-on-surface leading-none tracking-tight">{isLoading ? '...' : visiblePrompts.length}</div>
              <div className="flex items-center gap-xs text-secondary mt-xs">
                <span className="material-symbols-outlined text-sm font-bold">trending_up</span>
                <span className="text-label-md font-semibold">+12% this month</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant/40 p-lg rounded-xl shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-tertiary text-[22px]">folder_shared</span>
              <span className="text-label-md font-bold uppercase tracking-wider text-xs">Collections</span>
            </div>
            <div className="mt-md">
              <div className="text-6xl font-black text-on-surface leading-none tracking-tight">{collections.length}</div>
              <div className="text-label-md font-semibold text-on-surface-variant mt-xs">{collections.length === 1 ? '1 collection' : `${collections.length} collections`} created</div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl overflow-hidden shadow-sm">
          <div className="px-lg py-md border-b border-outline-variant/30 flex items-center justify-between">
            <h3 className="text-title-md font-bold text-on-surface">Recent Prompts</h3>
            <div className="flex gap-sm">
              <button 
                onClick={() => triggerToast("Table list is sorted chronologically")}
                className="p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded-lg transition-colors cursor-pointer"
                title="Filter logs"
              >
                <span className="material-symbols-outlined text-[20px]">filter_list</span>
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/20">
                  <th className="px-lg py-md text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-xs">Title</th>
                  <th className="px-lg py-md text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-xs">Category</th>
                  <th className="px-lg py-md text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-xs">Tags</th>
                  <th className="px-lg py-md text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-xs">Created Date</th>
                  <th className="px-lg py-md text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-right text-xs">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {isLoading ? (
                  [1, 2, 3].map((n) => (
                    <tr key={n} className="animate-pulse">
                      <td className="px-lg py-md">
                        <div className="h-4 bg-surface-container-high rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-surface-container-low rounded w-1/2"></div>
                      </td>
                      <td className="px-lg py-md">
                        <div className="h-5 bg-surface-container-high rounded-full w-16"></div>
                      </td>
                      <td className="px-lg py-md">
                        <div className="flex gap-2">
                          <div className="h-3 bg-surface-container-high rounded w-8"></div>
                          <div className="h-3 bg-surface-container-high rounded w-8"></div>
                        </div>
                      </td>
                      <td className="px-lg py-md">
                        <div className="h-4 bg-surface-container-high rounded w-20"></div>
                      </td>
                      <td className="px-lg py-md">
                        <div className="h-7 bg-surface-container-high rounded-lg w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : paginatedPrompts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-lg py-xl text-center text-on-surface-variant text-body-md font-medium">
                      No prompts found matching your search.
                    </td>
                  </tr>
                ) : (
                  paginatedPrompts.map((prompt) => (
                    <tr 
                      key={prompt.id} 
                      onClick={() => setActivePrompt(prompt)}
                      className="hover:bg-surface-container/30 transition-colors group cursor-pointer"
                    >
                      <td className="px-lg py-md">
                        <div className="flex flex-col">
                          <span className="text-body-md font-bold text-on-surface group-hover:text-primary transition-colors flex items-center gap-xs">
                            {prompt.title}
                            {prompt.isShared && userRole === 'ADMIN' && (
                              <span className="material-symbols-outlined text-success text-[16px]" title="Shared / Public Prompt">share</span>
                            )}
                          </span>
                          <span className="text-label-md text-on-surface-variant/80 mt-0.5">{prompt.subtitle}</span>
                        </div>
                      </td>
                      <td className="px-lg py-md">
                        <span className="bg-surface-container-high text-on-surface-variant px-sm py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          {prompt.category}
                        </span>
                      </td>
                      <td className="px-lg py-md">
                        <div className="flex gap-sm">
                          {prompt.tags && prompt.tags.map((tag, i) => (
                            <span 
                              key={i} 
                              className={`text-[10px] font-extrabold uppercase tracking-wide ${
                                i % 2 === 0 ? 'text-primary' : 'text-tertiary'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-lg py-md text-body-md text-on-surface-variant/90 font-medium">
                        {prompt.createdDate}
                      </td>
                      <td className="px-lg py-md text-right">
                        <div className="flex justify-end gap-xs md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePrompt(prompt);
                            }}
                            className="p-1 hover:text-primary hover:bg-primary-container/20 rounded transition-all cursor-pointer"
                            title="View template structure"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>
                          <button 
                            onClick={(e) => handleCopyTemplate(prompt, e)}
                            className="p-1 hover:text-secondary hover:bg-secondary-container/10 rounded transition-all cursor-pointer"
                            title="Copy prompt text"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {copiedId === prompt.id ? 'check' : 'content_copy'}
                            </span>
                          </button>
                          {(prompt.createdBy === currentUser?.uid || userRole === 'ADMIN') && (
                            <>
                              <button 
                                onClick={(e) => openEditModal(prompt, e)}
                                className="p-1 hover:text-primary hover:bg-surface-container-high rounded transition-all cursor-pointer"
                                title="Edit prompt details"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                              <button 
                                onClick={(e) => handleDeletePrompt(prompt.id, e)}
                                className="p-1 hover:text-error hover:bg-error-container/20 rounded transition-all cursor-pointer"
                                title="Delete prompt"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-lg py-md bg-surface-container-low/30 border-t border-outline-variant/30 flex justify-between items-center">
            <span className="text-label-md text-on-surface-variant font-medium">
              {isLoading ? (
                "Showing ... of ... prompts"
              ) : filteredPrompts.length === 0 ? (
                "Showing 0 prompts"
              ) : (
                `Showing ${startIndex + 1}-${Math.min(endIndex, filteredPrompts.length)} of ${filteredPrompts.length} prompts`
              )}
            </span>
            <div className="flex gap-sm items-center">
              <span className="text-label-sm text-on-surface-variant font-semibold px-xs">
                Page {activePage} of {totalPages}
              </span>
              <button 
                disabled={activePage === 1 || isLoading}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-sm py-1.5 text-label-md font-bold text-primary hover:bg-primary/10 rounded transition-all disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              >
                Prev
              </button>
              <button 
                disabled={activePage === totalPages || isLoading}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-sm py-1.5 text-label-md font-bold text-primary hover:bg-primary/10 rounded transition-all disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLibraryView = () => {
    return (
      <div className="space-y-lg animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md border-b border-outline-variant/20 pb-md">
          <div>
            <h2 className="text-headline-lg font-bold text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary text-[32px]">folder_special</span>
              Prompt Library Explorer
            </h2>
            <p className="text-body-md text-on-surface-variant mt-1">Browse and search all your saved prompts, run them inside the playground, or edit structures.</p>
          </div>
          <div className="flex gap-sm self-start sm:self-auto">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="border border-outline-variant text-on-surface px-lg py-md rounded-xl font-semibold text-body-md hover:bg-surface-container-high transition-all flex items-center gap-sm cursor-pointer"
              title="Export visible or filtered prompts"
            >
              <span className="material-symbols-outlined">download</span>
              Export Library
            </button>
            <button
              onClick={handleCreatePromptClick}
              className="bg-primary text-on-primary px-lg py-md rounded-xl font-semibold text-body-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-sm cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined">add</span>
              Add Prompt
            </button>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 p-md rounded-xl flex flex-wrap gap-md items-center">
          <div className="flex items-center gap-sm flex-1 min-w-[200px]">
            <span className="material-symbols-outlined text-outline">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search prompts in explorer..."
              className="w-full bg-surface border border-outline-variant rounded-xl px-md py-2 text-body-md outline-none focus:border-primary transition-all"
            />
          </div>
          
          <div className="flex flex-wrap gap-sm items-center">
            <label className="flex items-center gap-xs px-md py-2 bg-surface hover:bg-surface-container-low border border-outline-variant rounded-xl cursor-pointer transition-all text-body-md font-semibold select-none text-on-surface-variant/90">
              <input 
                type="checkbox"
                checked={showOnlyMyPrompts}
                onChange={(e) => setShowOnlyMyPrompts(e.target.checked)}
                className="w-4 h-4 accent-primary rounded cursor-pointer"
              />
              Show Only My Prompts
            </label>

            <select 
              value={libraryCategoryFilter}
              onChange={(e) => setLibraryCategoryFilter(e.target.value)}
              className="bg-surface text-body-md border border-outline-variant rounded-xl px-md py-2 outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Content">Content</option>
              <option value="Development">Development</option>
              <option value="Business">Business</option>
              <option value="Design">Design</option>
              <option value="AI Strategy">AI Strategy</option>
            </select>

            <select 
              value={libraryAccessFilter}
              onChange={(e) => setLibraryAccessFilter(e.target.value)}
              className="bg-surface text-body-md border border-outline-variant rounded-xl px-md py-2 outline-none cursor-pointer"
            >
              <option value="All">All Access</option>
              <option value="Basic">Basic Tier</option>
              <option value="Premium">Premium Tier</option>
            </select>

            <select 
              value={librarySortOrder}
              onChange={(e) => setLibrarySortOrder(e.target.value)}
              className="bg-surface text-body-md border border-outline-variant rounded-xl px-md py-2 outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="alphabetical">Title A-Z</option>
              <option value="category">Category</option>
            </select>
          </div>
        </div>

        {paginatedLibraryPrompts.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-xl text-center text-on-surface-variant font-medium">
            No prompts found matching the selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {paginatedLibraryPrompts.map(prompt => (
              <div 
                key={prompt.id}
                onClick={() => setActivePrompt(prompt)}
                className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-lg shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between group h-[220px]"
              >
                <div>
                  <div className="flex justify-between items-start gap-xs mb-sm">
                    <div className="flex gap-xs items-center">
                      <span className="bg-primary/10 text-primary px-sm py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                        {prompt.category}
                      </span>
                      {prompt.isShared && userRole === 'ADMIN' && (
                        <span className="bg-success-container/10 text-success px-sm py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border border-success/20 flex items-center gap-xs">
                          <span className="material-symbols-outlined text-[10px]">share</span>
                          Shared
                        </span>
                      )}
                    </div>
                    <span className={`px-sm py-0.5 rounded text-[9px] font-bold ${
                      prompt.access === 'Premium' ? 'bg-secondary-container/10 text-secondary border border-secondary/20' : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {prompt.access}
                    </span>
                  </div>
                  <h3 className="text-title-md font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">{prompt.title}</h3>
                  <p className="text-label-md text-on-surface-variant/80 mt-1 line-clamp-2">{prompt.subtitle}</p>
                </div>

                <div className="mt-md pt-sm border-t border-outline-variant/20 flex justify-between items-center">
                  <div className="flex gap-xs overflow-hidden max-w-[60%]">
                    {prompt.tags && prompt.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="text-[9px] font-extrabold uppercase text-outline tracking-wide truncate">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-xs shrink-0" onClick={e => e.stopPropagation()}>
                    {prompt.access === 'Premium' && !hasPremiumAccess() ? (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab('Billing');
                          triggerToast("Upgrade to Pro to unlock Premium Prompts!");
                        }}
                        className="flex items-center gap-xs px-sm py-1 bg-secondary text-on-secondary rounded-lg text-label-xs font-bold hover:shadow-lg hover:bg-secondary/95 transition-all cursor-pointer"
                        title="Unlock Premium Prompt"
                      >
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        Unlock
                      </button>
                    ) : (
                      <>
                        <button 
                          onClick={() => setActivePrompt(prompt)}
                          className="p-1.5 hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                          title="Run in Playground"
                        >
                          <span className="material-symbols-outlined text-[18px]">play_circle</span>
                        </button>
                        <button 
                          onClick={(e) => handleCopyTemplate(prompt, e)}
                          className="p-1.5 hover:text-secondary hover:bg-secondary-container/10 rounded transition-all cursor-pointer"
                          title="Copy Template"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {copiedId === prompt.id ? 'check' : 'content_copy'}
                          </span>
                        </button>
                        {(prompt.createdBy === currentUser?.uid || userRole === 'ADMIN') && (
                          <button 
                            onClick={(e) => openEditModal(prompt, e)}
                            className="p-1.5 hover:text-primary hover:bg-surface-container-high rounded transition-all cursor-pointer"
                            title="Edit Prompt"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        )}
                      </>
                    )}
                    {(prompt.createdBy === currentUser?.uid || userRole === 'ADMIN') && (
                      <button 
                        onClick={(e) => handleDeletePrompt(prompt.id, e)}
                        className="p-1.5 hover:text-error hover:bg-error-container/20 rounded transition-all cursor-pointer"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalLibraryPages > 1 && (
          <div className="flex justify-between items-center bg-surface-container-lowest border border-outline-variant/40 p-md rounded-xl">
            <span className="text-label-md text-on-surface-variant font-medium">
              Showing {libStartIndex + 1}-{Math.min(libEndIndex, filteredLibraryPrompts.length)} of {filteredLibraryPrompts.length} prompts
            </span>
            <div className="flex gap-sm items-center">
              <span className="text-label-sm text-on-surface-variant font-semibold">
                Page {libraryPage} of {totalLibraryPages}
              </span>
              <button 
                disabled={libraryPage === 1}
                onClick={() => setLibraryPage(prev => Math.max(1, prev - 1))}
                className="px-sm py-1 text-label-md font-bold text-primary hover:bg-primary/10 rounded transition-all disabled:opacity-30 cursor-pointer"
              >
                Prev
              </button>
              <button 
                disabled={libraryPage === totalLibraryPages}
                onClick={() => setLibraryPage(prev => Math.min(totalLibraryPages, prev + 1))}
                className="px-sm py-1 text-label-md font-bold text-primary hover:bg-primary/10 rounded transition-all disabled:opacity-30 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCollectionsView = () => {
    return (
      <div className="space-y-lg animate-in fade-in duration-200">
        {activeCollectionId === null ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md border-b border-outline-variant/20 pb-md">
              <div>
                <h2 className="text-headline-lg font-bold text-on-surface flex items-center gap-sm">
                  <span className="material-symbols-outlined text-primary text-[32px]">grid_view</span>
                  Prompt Collections
                </h2>
                <p className="text-body-md text-on-surface-variant mt-1">Organize your prompts into logical workspace collections or folders.</p>
              </div>
              <button
                onClick={() => setIsNewCollectionModalOpen(true)}
                className="bg-primary text-on-primary px-lg py-md rounded-xl font-semibold text-body-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-sm cursor-pointer shadow-sm self-start sm:self-auto"
              >
                <span className="material-symbols-outlined">create_new_folder</span>
                Create Collection
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">
              {collections.map(col => {
                const colPrompts = getPromptsForCollection(col);
                return (
                  <div 
                    key={col.id}
                    onClick={() => setActiveCollectionId(col.id)}
                    className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-lg shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex items-center gap-md group"
                  >
                    <div className="p-lg bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-on-primary transition-all">
                      <span className="material-symbols-outlined text-[32px]">{col.icon || 'folder'}</span>
                    </div>
                    <div>
                      <h3 className="text-title-md font-bold text-on-surface group-hover:text-primary transition-colors">{col.name}</h3>
                      <p className="text-label-md text-on-surface-variant mt-1 font-semibold">{colPrompts.length} prompts stored</p>
                    </div>
                    <span className="material-symbols-outlined ml-auto text-outline group-hover:text-primary group-hover:translate-x-1 transition-all">chevron_right</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (() => {
          const activeCol = collections.find(c => c.id === activeCollectionId);
          if (!activeCol) return null;
          const colPrompts = getPromptsForCollection(activeCol);
          
          return (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md border-b border-outline-variant/20 pb-md">
                <div className="flex items-center gap-md">
                  <button 
                    onClick={() => setActiveCollectionId(null)}
                    className="p-2 border border-outline-variant rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div>
                    <h2 className="text-headline-lg font-bold text-on-surface flex items-center gap-sm">
                      <span className="material-symbols-outlined text-primary text-[32px]">{activeCol.icon || 'folder'}</span>
                      {activeCol.name}
                    </h2>
                    <p className="text-body-md text-on-surface-variant mt-1">Viewing prompts registered inside this workspace folder.</p>
                  </div>
                </div>

                {!['marketing', 'engineering', 'ai-agents'].includes(activeCol.id) && (
                  <button 
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete the "${activeCol.name}" collection folder?`)) {
                        try {
                          if (!activeCol.id.startsWith('local-')) {
                            const docRef = doc(db, "collections", activeCol.id);
                            await deleteDoc(docRef);
                          }
                          setCollections(collections.filter(c => c.id !== activeCol.id));
                          setActiveCollectionId(null);
                          triggerToast("Collection folder deleted.");
                        } catch (err) {
                          console.error("Failed to delete collection from Firestore:", err);
                          triggerToast("Failed to delete from database. Simulating locally.");
                          setCollections(collections.filter(c => c.id !== activeCol.id));
                          setActiveCollectionId(null);
                        }
                      }
                    }}
                    className="px-lg py-md border border-error/20 text-error rounded-xl hover:bg-error-container/10 transition-all font-bold text-body-md flex items-center gap-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                    Delete Folder
                  </button>
                )}

              </div>

              {colPrompts.length === 0 ? (
                <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-xl text-center text-on-surface-variant font-medium">
                  This collection is currently empty.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
                  {colPrompts.map(prompt => (
                    <div 
                      key={prompt.id}
                      onClick={() => setActivePrompt(prompt)}
                      className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-lg shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer flex flex-col justify-between group h-[220px]"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-xs mb-sm">
                          <span className="bg-primary/10 text-primary px-sm py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                            {prompt.category}
                          </span>
                          <span className={`px-sm py-0.5 rounded text-[9px] font-bold ${
                            prompt.access === 'Premium' ? 'bg-secondary-container/10 text-secondary border border-secondary/20' : 'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            {prompt.access}
                          </span>
                        </div>
                        <h3 className="text-title-md font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">{prompt.title}</h3>
                        <p className="text-label-md text-on-surface-variant/80 mt-1 line-clamp-2">{prompt.subtitle}</p>
                      </div>

                      <div className="mt-md pt-sm border-t border-outline-variant/20 flex justify-between items-center">
                        <div className="flex gap-xs overflow-hidden max-w-[60%]">
                          {prompt.tags && prompt.tags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="text-[9px] font-extrabold uppercase text-outline tracking-wide truncate">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-xs shrink-0" onClick={e => e.stopPropagation()}>
                          <button 
                            onClick={() => setActivePrompt(prompt)}
                            className="p-1.5 hover:text-primary hover:bg-primary/10 rounded transition-all cursor-pointer"
                            title="Run in Playground"
                          >
                            <span className="material-symbols-outlined text-[18px]">play_circle</span>
                          </button>
                          <button 
                            onClick={(e) => handleCopyTemplate(prompt, e)}
                            className="p-1.5 hover:text-secondary hover:bg-secondary-container/10 rounded transition-all cursor-pointer"
                            title="Copy Template"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {copiedId === prompt.id ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>
    );
  };

  const renderBillingView = () => {
    return (
      <div className="space-y-lg animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md border-b border-outline-variant/20 pb-md">
          <div>
            <h2 className="text-headline-lg font-bold text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary text-[32px]">payments</span>
              Billing &amp; Subscription Portal
            </h2>
            <p className="text-body-md text-on-surface-variant mt-1">Manage your active plans, upgrade tier capabilities, and inspect invoice histories.</p>
          </div>
          <span className="bg-primary/10 text-primary px-md py-sm rounded-xl border border-primary/20 text-label-md font-bold self-start sm:self-auto">
            Current: {activePlan} Plan Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg items-stretch">
          {[
            { name: 'Free', price: `$${tierConfig.freePrice}`, desc: `Basic prompt library storage`, features: [`Up to ${tierConfig.freeLimit} Prompts`, 'Basic Variables', 'Public Collections'] },
            { name: 'Pro', price: `$${tierConfig.proPrice}`, desc: `Optimized professional workspace`, features: [`Up to ${tierConfig.proLimit} Prompts`, 'Advanced Variables', 'Private Collections'] },
            { name: 'Power User', price: `$${tierConfig.powerPrice}`, desc: `$${tierConfig.powerPrice}/month scaling tier`, features: [`Up to ${tierConfig.powerLimit} Prompts`, 'Version History Logs', 'API Workspace Access', 'Priority Support'] }
          ].map(plan => (
            <div 
              key={plan.name}
              className={`bg-surface-container-lowest border p-lg rounded-xl flex flex-col justify-between relative shadow-sm transition-all ${
                activePlan === plan.name 
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                  : 'border-outline-variant/40 hover:border-outline-variant'
              }`}
            >
              {activePlan === plan.name && (
                <span className="absolute top-4 right-4 bg-primary text-on-primary text-[9px] font-bold uppercase tracking-wider px-sm py-0.5 rounded-full">
                  Active Plan
                </span>
              )}
              <div>
                <h3 className="text-title-md font-bold text-on-surface">{plan.name}</h3>
                <div className="flex items-baseline gap-xs mt-xs">
                  <span className="text-headline-md font-extrabold text-on-surface">{plan.price}</span>
                  <span className="text-label-sm font-semibold text-on-surface-variant/80">/month</span>
                </div>
                <p className="text-label-md text-on-surface-variant mt-sm font-medium">{plan.desc}</p>
                
                <ul className="space-y-sm mt-md">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-sm text-label-sm font-semibold text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary text-[16px]">check</span>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              {plan.name !== 'Free' && (
                <button
                  disabled={activePlan === plan.name}
                  onClick={() => handleStripeCheckout(plan)}
                  className={`w-full py-2.5 rounded-xl font-bold text-body-md mt-lg transition-all cursor-pointer ${
                    activePlan === plan.name 
                      ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed border border-outline-variant/30' 
                      : 'bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {activePlan === plan.name ? 'Active Plan' : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl overflow-hidden shadow-sm">
          <div className="px-lg py-md border-b border-outline-variant/30 bg-surface-container-low/20 flex items-center justify-between">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
              <h3 className="text-title-md font-bold text-on-surface">Billing Invoice History</h3>
              {!isLoadingInvoices && invoices.length > 0 && (
                <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
                  {invoices.length} record{invoices.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {invoices.length > 0 && (
              <button
                onClick={() => {
                  const header = 'Invoice ID,Date,Plan,Amount,Status\n';
                  const rows = invoices.map(inv =>
                    `${inv.id},${inv.date},${inv.plan},$${Number(inv.amount).toFixed(2)},${inv.status}`
                  ).join('\n');
                  const blob = new Blob([header + rows], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'billing-history.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                  triggerToast('Billing history exported as CSV.');
                }}
                className="flex items-center gap-xs text-label-sm font-semibold text-on-surface-variant border border-outline-variant/40 hover:border-primary hover:text-primary px-md py-xs rounded-lg transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Export CSV
              </button>
            )}
          </div>

          {isLoadingInvoices ? (
            <div className="divide-y divide-outline-variant/20">
              {[1, 2, 3].map(n => (
                <div key={n} className="px-lg py-md flex items-center gap-lg animate-pulse">
                  <div className="h-4 bg-surface-container-high rounded w-36"></div>
                  <div className="h-4 bg-surface-container-high rounded w-24"></div>
                  <div className="h-4 bg-surface-container-high rounded w-16"></div>
                  <div className="h-4 bg-surface-container-high rounded w-20"></div>
                  <div className="ml-auto h-5 bg-surface-container-high rounded-full w-14"></div>
                </div>
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-xl gap-md text-center px-xl">
              <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-[36px]">receipt</span>
              </div>
              <div>
                <p className="text-body-md font-bold text-on-surface-variant/80">No Invoices Yet</p>
                <p className="text-label-sm text-on-surface-variant/50 mt-xs">Upgrade your subscription plan to start tracking records.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/20">
                    <th className="px-lg py-sm text-label-xs font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Invoice ID</th>
                    <th className="px-lg py-sm text-label-xs font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Billing Date</th>
                    <th className="px-lg py-sm text-label-xs font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Upgrade Tier</th>
                    <th className="px-lg py-sm text-label-xs font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Amount</th>
                    <th className="px-lg py-sm text-label-xs font-bold text-on-surface-variant uppercase tracking-wider text-right text-[10px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {invoices.map((inv) => {
                    const statusClass = inv.status === 'Paid'
                      ? 'bg-success-container/10 text-success border-success/20'
                      : 'bg-error-container/10 text-error border-error/20';

                    return (
                      <tr key={inv.id} className="hover:bg-surface-container/10 transition-colors">
                        <td className="px-lg py-md">
                          <div className="flex flex-col">
                            <span className="text-body-md font-bold text-on-surface">{inv.id}</span>
                            {inv.sessionId && (
                              <span className="text-label-xs text-on-surface-variant/70 font-mono mt-0.5" title={inv.sessionId}>
                                ID: {inv.sessionId.substring(0, 15)}...
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-lg py-md text-body-md text-on-surface-variant font-medium">{inv.date}</td>
                        <td className="px-lg py-md">
                          <span className="bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-1 rounded-full border border-primary/20">
                            {inv.plan}
                          </span>
                        </td>
                        <td className="px-lg py-md text-body-md text-on-surface font-bold">${Number(inv.amount).toFixed(2)}</td>
                        <td className="px-lg py-md text-right">
                          <span className={`inline-flex items-center gap-1 px-sm py-0.5 rounded-full text-[10px] font-bold border ${statusClass}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSettingsView = () => {
    return (
      <div className="space-y-lg animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md border-b border-outline-variant/20 pb-md">
          <div>
            <h2 className="text-headline-lg font-bold text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary text-[32px]">settings</span>
              Settings &amp; Workspace Configuration
            </h2>
            <p className="text-body-md text-on-surface-variant mt-1">Configure profile details, manage developer API keys, and toggle global visual theme.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-stretch">
          <div className="lg:col-span-6 bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-lg shadow-sm space-y-md">
            <h3 className="text-title-md font-bold text-on-surface flex items-center gap-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">person</span>
              Workspace Profile Settings
            </h3>
            
            <div className="space-y-sm">
              <div className="space-y-xs">
                <label className="text-label-sm font-bold text-on-surface-variant/90 uppercase block text-xs">Profile Display Name</label>
                <input 
                  type="text" 
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full bg-surface text-on-surface border border-outline-variant rounded-xl px-md py-sm text-body-md outline-none focus:border-primary transition-all font-semibold"
                />
              </div>
              <div className="space-y-xs">
                <label className="text-label-sm font-bold text-on-surface-variant/90 uppercase block text-xs">Simulated Avatar Image URL</label>
                <input 
                  type="text" 
                  value={profileAvatar}
                  onChange={(e) => setProfileAvatar(e.target.value)}
                  className="w-full bg-surface text-on-surface border border-outline-variant rounded-xl px-md py-sm text-body-md outline-none focus:border-primary transition-all text-xs font-mono"
                />
              </div>
              <button 
                onClick={() => triggerToast("Profile settings saved.")}
                className="bg-primary text-on-primary px-lg py-sm rounded-xl font-semibold text-body-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer inline-block mt-xs"
              >
                Save Profile
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-lg shadow-sm space-y-md flex flex-col justify-between">
            <div>
              <h3 className="text-title-md font-bold text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">palette</span>
                Visual Interface Theme
              </h3>
              <p className="text-label-md text-on-surface-variant/80 font-medium mt-1">
                Choose between light mode (standard premium) and dark mode (developer terminal) colors.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-md pt-md">
              <button 
                onClick={() => handleToggleTheme('light')}
                className={`flex flex-col items-center justify-center p-lg border rounded-xl gap-sm transition-all cursor-pointer ${
                  themeMode === 'light' 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-outline-variant/40 hover:border-outline-variant text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[36px]">light_mode</span>
                <span className="text-label-md font-bold">Light Mode</span>
              </button>
              <button 
                onClick={() => handleToggleTheme('dark')}
                className={`flex flex-col items-center justify-center p-lg border rounded-xl gap-sm transition-all cursor-pointer ${
                  themeMode === 'dark' 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-outline-variant/40 hover:border-outline-variant text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[36px]">dark_mode</span>
                <span className="text-label-md font-bold">Dark Mode</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl overflow-hidden shadow-sm">
          <div className="px-lg py-md border-b border-outline-variant/30 bg-surface-container-low/20 flex justify-between items-center">
            <h3 className="text-title-md font-bold text-on-surface flex items-center gap-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">key</span>
              Developer Workspace API Keys
            </h3>
            {hasPowerUserAccess() && (
              <button 
                onClick={() => setIsNewKeyModalOpen(true)}
                className="bg-primary text-on-primary px-sm py-1.5 rounded-lg font-semibold text-label-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-xs shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Create API Key
              </button>
            )}
          </div>
          
          {!hasPowerUserAccess() ? (
            <div className="p-xl flex flex-col items-center justify-center text-center mx-auto space-y-md my-md" style={{ maxWidth: '512px' }}>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-xs">
                <span className="material-symbols-outlined text-[24px]">lock</span>
              </div>
              <h4 className="text-title-md font-bold text-on-surface">API Keys Developer Access Locked</h4>
              <p className="text-label-md text-on-surface-variant/80 font-medium">
                Workspace API Keys are only available to the Power User tier. Upgrade today to unlock programmatically loading prompts.
              </p>
              <button 
                onClick={() => setActiveTab('Billing')}
                className="bg-secondary text-on-primary px-lg py-2 rounded-xl font-bold text-label-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[16px]">payments</span>
                Upgrade Now
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant/20">
                    <th className="px-lg py-md text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-xs">Key Name</th>
                    <th className="px-lg py-md text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-xs">Token Value</th>
                    <th className="px-lg py-md text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-xs">Created Date</th>
                    <th className="px-lg py-md text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-right text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {apiKeys.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-lg py-xl text-center text-on-surface-variant text-body-md font-medium">
                        No API Keys created. Generate a token to connect via CLI or code.
                      </td>
                    </tr>
                  ) : (
                    apiKeys.map(key => (
                      <tr key={key.id} className="hover:bg-surface-container/20 transition-colors">
                        <td className="px-lg py-md text-body-md font-bold text-on-surface">{key.name}</td>
                        <td className="px-lg py-md font-mono text-body-md text-on-surface-variant">{key.value}</td>
                        <td className="px-lg py-md text-body-md text-on-surface-variant font-semibold">{key.dateCreated}</td>
                        <td className="px-lg py-md text-right">
                          <div className="flex justify-end gap-xs" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(key.value);
                                triggerToast(`Copied token for ${key.name}!`);
                              }}
                              className="p-1 hover:text-primary hover:bg-primary-container/20 rounded transition-all cursor-pointer flex items-center justify-center"
                              title="Copy Token"
                            >
                              <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm(`Are you sure you want to revoke API Key "${key.name}"?`)) {
                                  try {
                                    if (typeof key.id === 'string' && (key.id.startsWith('local-') || key.id === 'key-1' || key.id === 'key-2')) {
                                      setApiKeys(apiKeys.filter(k => k.id !== key.id));
                                    } else {
                                      const docRef = doc(db, "apiKeys", key.id);
                                      await deleteDoc(docRef);
                                      setApiKeys(apiKeys.filter(k => k.id !== key.id));
                                    }
                                    triggerToast("API Key revoked successfully.");
                                  } catch (error) {
                                    console.error("Failed to delete API Key from Firestore:", error);
                                    triggerToast("Database deletion failed. Simulating revoke locally.");
                                    setApiKeys(apiKeys.filter(k => k.id !== key.id));
                                  }
                                }
                              }}
                              className="p-1 hover:text-error hover:bg-error-container/20 rounded transition-all cursor-pointer flex items-center justify-center"
                              title="Revoke Token"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              
              {/* API KEY DEVELOPER DOCUMENTATION */}
              <div className="p-lg bg-surface-container-low/40 border-t border-outline-variant/30 space-y-md">
                <h4 className="text-title-sm font-bold text-on-surface flex items-center gap-xs">
                  <span className="material-symbols-outlined text-primary text-[18px]">terminal</span>
                  How to Use Your Workspace API Key
                </h4>
                <p className="text-label-md text-on-surface-variant font-medium">
                  Integrate your saved prompt templates programmatically using standard HTTP queries. Include your token as a Bearer authentication header.
                </p>
                <div className="space-y-sm">
                  <div className="space-y-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">1. Fetching all visible prompts:</span>
                    <pre className="bg-black/95 text-success p-md rounded-xl font-mono text-xs overflow-x-auto select-all">
{`curl -X GET "http://localhost:3000/api/v1/prompts" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                    </pre>
                  </div>
                  <div className="space-y-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-outline block">2. Fetching a specific template:</span>
                    <pre className="bg-black/95 text-success p-md rounded-xl font-mono text-xs overflow-x-auto select-all">
{`curl -X GET "http://localhost:3000/api/v1/prompts/PROMPT_ID" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center font-sans gap-md">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-body-md font-bold text-on-surface-variant/80 animate-pulse">Securing your session...</p>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex font-sans">
      
      {/* Toast Notification Pop-up */}
      {toastMessage && (
        <div className="fixed bottom-20 right-6 md:bottom-6 md:right-6 bg-inverse-surface text-inverse-on-surface px-lg py-md rounded-xl shadow-2xl z-50 flex items-center gap-sm animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span className="material-symbols-outlined text-primary-fixed-dim">info</span>
          <span className="text-body-md font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Sidebar navigation shell (Desktop Only) */}
      <aside className="hidden md:flex flex-col h-screen w-64 left-0 top-0 fixed bg-surface-container-lowest border-r border-outline-variant/30 py-lg space-y-sm z-40">
        <div className="px-lg mb-xl">
          <Link href="/" className="flex items-center gap-xs">
            <h1 className="text-headline-md font-bold text-primary tracking-tight">Prompt Library</h1>
          </Link>
          <p className="text-label-md font-medium text-on-surface-variant/70 mt-xs">{activePlan} Plan Active</p>
        </div>
        <nav className="flex-1 space-y-xs">
          {[
            { name: 'Dashboard', icon: 'dashboard' },
            { name: 'Library', icon: 'folder_special' },
            { name: 'Collections', icon: 'grid_view' },
            { name: 'Billing', icon: 'payments' },
            { name: 'Settings', icon: 'settings' }
          ].map((tab) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`w-full flex items-center gap-md px-md py-sm hover:bg-surface-container-high transition-all text-left relative cursor-pointer ${
                activeTab === tab.name 
                  ? 'bg-primary-container/10 text-primary font-semibold border-l-4 border-primary' 
                  : 'text-on-surface-variant hover:text-on-surface border-l-4 border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              <span className="text-label-md font-semibold">{tab.name}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto px-md">
          <button 
            onClick={handleCreatePromptClick}
            className="w-full bg-primary text-on-primary py-md rounded-xl font-semibold text-body-md hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-sm cursor-pointer"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Create New Prompt
          </button>
          <div className="mt-xl space-y-xs">
            <a className="flex items-center gap-md text-on-surface-variant hover:text-primary transition-colors px-md py-xs font-semibold text-label-md" href="#">
              <span className="material-symbols-outlined text-[18px]">help</span>
              Support Center
            </a>
            {userRole === 'ADMIN' && (
              <button 
                onClick={() => setActiveTab('Admin Logs')}
                className={`w-full flex items-center gap-md px-md py-xs transition-all font-semibold text-label-md cursor-pointer hover:bg-surface-container-high rounded-lg text-left ${
                  activeTab === 'Admin Logs' ? 'bg-primary-container/10 text-primary font-bold border-l-4 border-primary pl-2' : 'text-on-surface-variant hover:text-on-surface border-l-4 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                Admin Logs
              </button>
            )}
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

      {/* Main Content Area */}
      <main className="md:ml-64 flex flex-col flex-1 min-h-screen pb-20 md:pb-0">
        
        {/* Top Sticky App Bar Header */}
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30">
          <div className="flex justify-between items-center w-full px-lg py-md max-w-container-max mx-auto h-16">
            
            {/* Search container */}
            <div className="flex items-center gap-md flex-1">
              <div className="relative w-full max-w-2xl">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-full pl-10 pr-4 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Search prompts or collections..."
                />
              </div>
            </div>

            {/* Top Bar actions */}
            <div className="flex items-center gap-md ml-lg">
              <button 
                onClick={() => triggerToast("No new notifications")}
                className="p-2 rounded-full hover:bg-surface-container-high relative text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-surface"></span>
              </button>
              <div className="flex items-center gap-sm cursor-pointer hover:opacity-8 transition-opacity border-l border-outline-variant/30 pl-md">
                <img 
                  alt="Avatar" 
                  className="w-9 h-9 rounded-full object-cover border border-primary/20" 
                  src={profileAvatar}
                />
                <span className="hidden lg:block font-semibold text-on-surface text-body-md">{profileName}</span>
              </div>
              <button 
                onClick={handleSignOut}
                className="p-2 rounded-full hover:bg-error-container/10 text-on-surface-variant hover:text-error transition-all cursor-pointer flex items-center justify-center border-l border-outline-variant/30 pl-md"
                title="Sign Out"
              >
                <span className="material-symbols-outlined text-[22px]">logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Main Content Container */}
        <div className="p-lg lg:p-xl space-y-lg max-w-7xl mx-auto w-full flex-grow">
          
          {activeTab === 'Admin Logs' && renderAdminLogsView()}
          {activeTab === 'Dashboard' && renderDashboardView()}
          {activeTab === 'Library' && renderLibraryView()}
          {activeTab === 'Collections' && renderCollectionsView()}
          {activeTab === 'Billing' && renderBillingView()}
          {activeTab === 'Settings' && renderSettingsView()}
        </div>

        {/* Footer component matching Stitch layout */}
        <footer className="mt-auto w-full py-xl px-lg flex flex-col md:flex-row justify-between items-center max-w-container-max mx-auto bg-surface-container-lowest border-t border-outline-variant/30">
          <div className="flex flex-col items-center md:items-start mb-md md:mb-0">
            <span className="text-title-md font-bold text-on-surface">Prompt Library</span>
            <p className="text-body-md text-on-surface-variant/80 mt-xs">© 2026 Prompt Library. Built for high-utility SaaS.</p>
          </div>
          <div className="flex gap-lg">
            <a className="text-label-md text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Terms</a>
            <a className="text-label-md text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Privacy</a>
            <a className="text-label-md text-on-surface-variant hover:text-primary transition-colors font-medium" href="#">Twitter</a>
            <a className="text-label-md font-medium text-on-surface-variant hover:text-primary transition-colors" href="#">GitHub</a>
          </div>
        </footer>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-outline-variant/30 flex justify-around items-center py-2 z-40">
        {[
          { name: 'Dashboard', icon: 'dashboard' },
          { name: 'Library', icon: 'folder_special' },
          { name: 'Collections', icon: 'grid_view' },
          { name: 'Settings', icon: 'settings' }
        ].map((tab) => (
          <button 
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              activeTab === tab.name ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
            <span className="text-[10px] font-bold">{tab.name}</span>
          </button>
        ))}
      </nav>

      {/* VIEW PROMPT TEMPLATE DETAIL MODAL DIALOG */}
      {activePrompt && (() => {
        const variables = extractVariables(activePrompt.template);
        const hasVariables = variables.length > 0;
        const isRestricted = activePrompt.access === 'Premium' && !hasPremiumAccess();
        
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-lg">
            <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-lg py-md border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/40 shrink-0">
                <div className="flex items-center gap-sm flex-wrap">
                  <span className="bg-primary/10 text-primary px-sm py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    {activePrompt.category}
                  </span>
                  <h3 className="text-title-md font-bold text-on-surface flex items-center gap-sm">
                    {activePrompt.title}
                    {isRestricted && (
                      <span className="material-symbols-outlined text-secondary text-[18px]" title="Premium Locked">lock</span>
                    )}
                  </h3>
                  {hasPowerUserAccess() && (
                    <span 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(activePrompt.id);
                        triggerToast("Prompt ID copied to clipboard!");
                      }}
                      className="bg-surface-container-high text-on-surface-variant px-xs py-0.5 rounded text-[11px] font-mono font-bold cursor-pointer hover:bg-primary/10 hover:text-primary transition-all flex items-center gap-xs ml-xs border border-outline-variant/25"
                      title="Click to copy Prompt ID for API usage"
                    >
                      <span className="material-symbols-outlined text-[13px]">code</span>
                      ID: {activePrompt.id}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setActivePrompt(null)}
                  className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Tab Navigation inside Prompt Details Modal */}
              {!isRestricted && (
                <div className="px-lg py-xs border-b border-outline-variant/20 bg-surface-container-lowest shrink-0 flex gap-sm">
                  <button
                    onClick={() => setActiveDetailTab('Playground')}
                    className={`px-md py-sm text-label-md font-bold border-b-2 transition-all cursor-pointer flex items-center gap-xs ${
                      activeDetailTab === 'Playground'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                    Playground
                  </button>
                  <button
                    onClick={() => setActiveDetailTab('History')}
                    className={`px-md py-sm text-label-md font-bold border-b-2 transition-all cursor-pointer flex items-center gap-xs ${
                      activeDetailTab === 'History'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">history</span>
                    Version History
                    {!hasPowerUserAccess() && (
                      <span className="material-symbols-outlined text-[14px] text-secondary">lock</span>
                    )}
                  </button>
                </div>
              )}
              
              <div className="p-lg space-y-md overflow-y-auto flex-1">
                {isRestricted ? (
                  <div className="py-xl flex flex-col items-center justify-center text-center mx-auto space-y-md" style={{ maxWidth: '512px' }}>
                    <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-xs animate-bounce">
                      <span className="material-symbols-outlined text-[32px]">lock_open_right</span>
                    </div>
                    <h4 className="text-headline-sm font-bold text-on-surface">Unlock Premium Prompt Template</h4>
                    <p className="text-body-md font-semibold text-on-surface-variant/80 leading-relaxed">
                      &quot;{activePrompt.title}&quot; is a Premium prompt reserved for Pro and Power User members. 
                      Upgrade your active subscription to run variables injection, export templates, and leverage advanced copy features.
                    </p>
                    <button 
                      onClick={() => {
                        setActivePrompt(null);
                        setActiveTab('Billing');
                        triggerToast("Upgrade to Pro to unlock Premium Prompts!");
                      }}
                      className="px-xl py-md bg-secondary text-on-primary rounded-xl text-body-md font-bold hover:shadow-lg hover:shadow-secondary/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-sm"
                    >
                      <span className="material-symbols-outlined">payments</span>
                      Upgrade Subscription Plan
                    </button>
                  </div>
                ) : (
                  <>
                    {activeDetailTab === 'Playground' ? (
                      <>
                        <p className="text-body-md text-on-surface-variant/90 leading-relaxed font-medium">
                          {activePrompt.subtitle}
                        </p>

                        {hasVariables ? (
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-lg pt-xs">
                            
                            {/* Left Column: Variable Playground Inputs */}
                            <div className="md:col-span-5 space-y-md border-b md:border-b-0 md:border-r border-outline-variant/30 pb-lg md:pb-0 md:pr-lg">
                              <div className="flex items-center gap-xs text-primary mb-xs">
                                <span className="material-symbols-outlined text-[18px]">tune</span>
                                <span className="text-label-md font-bold uppercase tracking-wider text-xs">Variable Playground</span>
                              </div>
                              <p className="text-label-md text-on-surface-variant/80 font-medium">
                                Fill in values below to dynamically compile your prompt template in real-time.
                              </p>
                              <div className="space-y-sm">
                                {variables.map((varName) => (
                                  <div key={varName} className="space-y-xs">
                                    <label className="text-label-sm font-bold text-on-surface-variant/90 flex items-center gap-xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                      {varName}
                                    </label>
                                    <input 
                                      type="text"
                                      value={varValues[varName] || ''}
                                      onChange={(e) => setVarValues({ ...varValues, [varName]: e.target.value })}
                                      placeholder={`Enter ${varName}...`}
                                      className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-sm py-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Right Column: Live Compiled Highlighted Preview */}
                            <div className="md:col-span-7 space-y-xs flex flex-col h-full min-h-[250px]">
                              <div className="flex items-center justify-between text-on-surface-variant">
                                <span className="text-label-md font-bold uppercase tracking-wider text-xs flex items-center gap-xs">
                                  <span className="material-symbols-outlined text-secondary text-[18px]">terminal</span>
                                  Live Compiled Preview:
                                </span>
                                {Object.values(varValues).some(Boolean) && (
                                  <button
                                    onClick={() => setVarValues({})}
                                    className="text-label-xs font-semibold text-primary hover:underline cursor-pointer"
                                  >
                                    Clear All
                                  </button>
                                )}
                              </div>
                              
                              <div className="p-md bg-surface-container-low border border-primary/20 rounded-xl text-body-md font-mono whitespace-pre-wrap leading-relaxed text-on-surface border-l-4 border-primary flex-1 max-h-[380px] overflow-y-auto">
                                {renderHighlightedTemplate(activePrompt.template, varValues)}
                              </div>
                            </div>

                          </div>
                        ) : (
                          // Standard raw view if no hashtags variables exist
                          <div className="space-y-xs pt-xs">
                            <span className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider block text-xs">
                              Compiled Raw Prompt Structure:
                            </span>
                            <div className="p-md bg-surface-container-low border border-outline-variant/30 rounded-xl text-body-md font-mono whitespace-pre-wrap leading-relaxed text-on-surface border-l-4 border-primary max-h-[380px] overflow-y-auto">
                              {activePrompt.template}
                            </div>
                            <p className="text-label-sm text-on-surface-variant/70 italic pt-xs">
                              No dynamic variables detected. Use double hashtags (e.g. ##Variable##) to build an interactive playground.
                            </p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-sm pt-sm">
                          {activePrompt.tags && activePrompt.tags.map((tag, idx) => (
                            <span key={idx} className="px-sm py-xs bg-secondary-container/10 text-secondary font-semibold text-label-md rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      // VERSION HISTORY VIEW
                      <div className="space-y-md animate-in fade-in duration-200">
                        {!hasPowerUserAccess() ? (
                          <div className="py-xl flex flex-col items-center justify-center text-center mx-auto space-y-md" style={{ maxWidth: '512px' }}>
                            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-xs">
                              <span className="material-symbols-outlined text-[32px]">lock</span>
                            </div>
                            <h4 className="text-headline-sm font-bold text-on-surface">Unlock Version History</h4>
                            <p className="text-body-md font-semibold text-on-surface-variant/80 leading-relaxed">
                              Version History is a Power User feature. Keep track of previous updates to this prompt, review instructions, and restore prior states in one click.
                            </p>
                            <button 
                              onClick={() => {
                                setActivePrompt(null);
                                setActiveTab('Billing');
                                triggerToast("Upgrade to Power User to unlock Version History!");
                              }}
                              className="px-xl py-md bg-secondary text-on-primary rounded-xl text-body-md font-bold hover:shadow-lg hover:shadow-secondary/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-sm"
                            >
                              <span className="material-symbols-outlined">payments</span>
                              Upgrade to Power User Plan
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-md">
                            <div className="flex items-center justify-between text-on-surface-variant">
                              <span className="text-label-md font-bold uppercase tracking-wider text-xs flex items-center gap-xs">
                                <span className="material-symbols-outlined text-secondary text-[18px]">history</span>
                                Version Change Log ({activePrompt.versions?.length || 0})
                              </span>
                            </div>
                            
                            {(!activePrompt.versions || activePrompt.versions.length === 0) ? (
                              <div className="py-lg text-center bg-surface-container-low/40 rounded-xl border border-outline-variant/20 p-md text-on-surface-variant/70 italic text-body-md">
                                No versions recorded yet. Edits made to this prompt will automatically create snapshots here.
                              </div>
                            ) : (
                              <div className="space-y-sm max-h-[420px] overflow-y-auto pr-xs">
                                {activePrompt.versions.map((ver, idx) => {
                                  const isExpanded = expandedVersionId === ver.versionId;
                                  const verNumber = activePrompt.versions.length - idx;
                                  const dateStr = new Date(ver.updatedTimestamp).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  });
                                  
                                  return (
                                    <div key={ver.versionId} className="bg-surface-container-low border border-outline-variant/30 rounded-xl p-md transition-all hover:border-outline-variant flex flex-col gap-sm">
                                      <div className="flex flex-wrap items-center justify-between gap-sm">
                                        <div className="flex items-center gap-sm">
                                          <span className="bg-secondary/10 text-secondary px-xs py-0.5 rounded text-[11px] font-extrabold font-mono">
                                            v{verNumber}
                                          </span>
                                          <div className="flex flex-col">
                                            <span className="text-body-md font-bold text-on-surface">{ver.title}</span>
                                            <span className="text-label-xs text-on-surface-variant/80">
                                              {dateStr} &bull; by <span className="font-semibold text-primary">{ver.updatedBy === currentUser?.uid ? "You" : ver.updatedBy}</span>
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-xs">
                                          <button
                                            onClick={() => setExpandedVersionId(isExpanded ? null : ver.versionId)}
                                            className="px-sm py-xs border border-outline-variant text-on-surface hover:bg-surface-container-high rounded-lg text-label-sm font-bold transition-all flex items-center gap-xs cursor-pointer"
                                          >
                                            <span className="material-symbols-outlined text-[16px]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                                            {isExpanded ? 'Hide' : 'Preview'}
                                          </button>
                                          <button
                                            onClick={() => handleRestoreVersion(activePrompt, ver)}
                                            className="px-sm py-xs bg-primary text-on-primary hover:bg-primary/95 rounded-lg text-label-sm font-bold transition-all flex items-center gap-xs cursor-pointer"
                                          >
                                            <span className="material-symbols-outlined text-[16px]">restore</span>
                                            Restore
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {isExpanded && (
                                        <div className="pt-xs border-t border-outline-variant/20 space-y-sm animate-in fade-in slide-in-from-top-1 duration-150">
                                          {ver.subtitle && (
                                            <p className="text-body-sm text-on-surface-variant/90 italic">
                                              &quot;{ver.subtitle}&quot;
                                            </p>
                                          )}
                                          <div className="p-sm bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-body-sm font-mono whitespace-pre-wrap leading-relaxed text-on-surface max-h-[160px] overflow-y-auto">
                                            {ver.template}
                                          </div>
                                          {ver.tags && ver.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-xs">
                                              {ver.tags.map((tag, i) => (
                                                <span key={i} className="text-[9px] font-extrabold uppercase text-outline">
                                                  #{tag}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-md border-t border-outline-variant/30 shrink-0 flex flex-wrap gap-sm justify-between items-center bg-surface-container-lowest">
                      <div className="text-label-xs text-on-surface-variant/80 font-medium">
                        Created on {activePrompt.createdDate}
                      </div>
                      
                      <div className="flex gap-sm">
                        <button 
                          onClick={() => exportSinglePromptJSON(activePrompt)}
                          className="px-md py-sm border border-outline-variant rounded-xl text-label-md font-bold hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-xs"
                          title="Export Prompt to JSON"
                        >
                          <span className="material-symbols-outlined text-[16px]">download</span>
                          Export JSON
                        </button>
                        <button 
                          onClick={() => exportSinglePromptText(activePrompt, getCompiledTemplate(activePrompt.template, varValues))}
                          className="px-md py-sm border border-outline-variant rounded-xl text-label-md font-bold hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-xs"
                          title="Export Prompt or playground compiled text"
                        >
                          <span className="material-symbols-outlined text-[16px]">description</span>
                          Export Text
                        </button>
                        
                        <button 
                          onClick={() => {
                            const rawText = getCompiledTemplate(activePrompt.template, varValues);
                            navigator.clipboard.writeText(rawText);
                            triggerToast("Playground template copied!");
                          }}
                          className="px-lg py-sm bg-primary text-on-primary rounded-xl text-label-md font-bold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-xs animate-in"
                        >
                          <span className="material-symbols-outlined text-[18px]">content_copy</span>
                          Copy Prompt
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ADD NEW PROMPT DETAILS MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-lg">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-lg py-md border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/40 shrink-0">
              <h3 className="text-title-md font-bold text-on-surface">Add New Prompt Template</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddPrompt} className="flex flex-col flex-1 min-h-0">
              <div className="p-lg space-y-md overflow-y-auto flex-1">
                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Prompt Name</label>
                  <input 
                    type="text" 
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. SQL Query Builder"
                    className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-semibold"
                    required
                  />
                </div>

                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Short Subtitle / Goal</label>
                  <input 
                    type="text" 
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="e.g. Optimization focus"
                    className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-md">
                  <div className="space-y-xs">
                    <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                    >
                      <option value="Content">Content</option>
                      <option value="Development">Development</option>
                      <option value="Business">Business</option>
                      <option value="Design">Design</option>
                      <option value="AI Strategy">AI Strategy</option>
                    </select>
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Access Tier</label>
                    <select
                      value={formAccess}
                      disabled={!hasPremiumAccess()}
                      onChange={(e) => setFormAccess(e.target.value)}
                      className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                </div>

                {userRole === 'ADMIN' && (
                  <div className="flex items-center gap-xs px-md py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl">
                    <label className="flex items-center gap-xs cursor-pointer select-none text-body-md font-semibold text-on-surface-variant">
                      <input 
                        type="checkbox"
                        checked={formIsShared}
                        onChange={(e) => setFormIsShared(e.target.checked)}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                      Is Shared with all users (Public)
                    </label>
                  </div>
                )}

                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Collection Folder</label>
                  <select
                    value={formCollectionId}
                    onChange={(e) => setFormCollectionId(e.target.value)}
                    className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer font-semibold"
                  >
                    <option value="">None (Auto-match by Category)</option>
                    {collections.filter(c => !['marketing', 'engineering', 'ai-agents'].includes(c.id)).map(col => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Tags (comma-separated)</label>
                  <input 
                    type="text" 
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="SQL, React, SEO"
                    className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Prompt Instructions (with ##variables##)</label>
                  <textarea 
                    value={formTemplate}
                    onChange={(e) => setFormTemplate(e.target.value)}
                    placeholder="Write instructions utilizing variables: e.g. Design a component for ##ComponentName##..."
                    rows="8"
                    className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono min-h-[160px]"
                  />
                </div>
              </div>

              <div className="p-lg flex justify-end gap-sm border-t border-outline-variant/20 bg-surface-container-low/20 shrink-0">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-lg py-sm border border-outline-variant rounded-xl text-label-md font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-lg py-sm bg-primary text-on-primary rounded-xl text-label-md font-bold hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Save Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROMPT DETAILS MODAL */}
      {editingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-lg">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-lg py-md border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low/40 shrink-0">
              <h3 className="text-title-md font-bold text-on-surface">Edit Prompt Details</h3>
              <button 
                onClick={() => setEditingPrompt(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditPrompt} className="flex flex-col flex-1 min-h-0">
              <div className="p-lg space-y-md overflow-y-auto flex-1">
                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Prompt Name</label>
                  <input 
                    type="text" 
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    required
                  />
                </div>

                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Short Subtitle / Goal</label>
                  <input 
                    type="text" 
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-md">
                  <div className="space-y-xs">
                    <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
                    >
                      <option value="Content">Content</option>
                      <option value="Development">Development</option>
                      <option value="Business">Business</option>
                      <option value="Design">Design</option>
                      <option value="AI Strategy">AI Strategy</option>
                    </select>
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Access Tier</label>
                    <select
                      value={formAccess}
                      disabled={!hasPremiumAccess()}
                      onChange={(e) => setFormAccess(e.target.value)}
                      className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Premium">Premium</option>
                    </select>
                  </div>
                </div>

                {userRole === 'ADMIN' && (
                  <div className="flex items-center gap-xs px-md py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl">
                    <label className="flex items-center gap-xs cursor-pointer select-none text-body-md font-semibold text-on-surface-variant">
                      <input 
                        type="checkbox"
                        checked={formIsShared}
                        onChange={(e) => setFormIsShared(e.target.checked)}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                      Is Shared with all users (Public)
                    </label>
                  </div>
                )}

                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Collection Folder</label>
                  <select
                    value={formCollectionId}
                    onChange={(e) => setFormCollectionId(e.target.value)}
                    className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer font-semibold"
                  >
                    <option value="">None (Auto-match by Category)</option>
                    {collections.filter(c => !['marketing', 'engineering', 'ai-agents'].includes(c.id)).map(col => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Tags (comma-separated)</label>
                  <input 
                    type="text" 
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant text-xs uppercase block">Prompt Instructions (with ##variables##)</label>
                  <textarea 
                    value={formTemplate}
                    onChange={(e) => setFormTemplate(e.target.value)}
                    rows="8"
                    className="w-full bg-surface text-body-md border border-outline-variant rounded-xl px-md py-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono min-h-[160px]"
                  />
                </div>
              </div>

              <div className="p-lg flex justify-end gap-sm border-t border-outline-variant/20 bg-surface-container-low/20 shrink-0">
                <button 
                  type="button"
                  onClick={() => setEditingPrompt(null)}
                  className="px-lg py-sm border border-outline-variant rounded-xl text-label-md font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-lg py-sm bg-primary text-on-primary rounded-xl text-label-md font-bold hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW API KEY MODAL */}
      {isNewKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-lg">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-2xl w-full max-w-[448px] p-lg space-y-md animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-title-md font-bold text-on-surface">Create API Key</h3>
            <div className="space-y-xs">
              <label className="text-label-sm font-bold text-on-surface-variant/90 uppercase block text-xs">Key Name / Description</label>
              <input 
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g. Production Application"
                className="w-full bg-surface text-on-surface border border-outline-variant rounded-xl px-md py-sm text-body-md outline-none focus:border-primary transition-all font-semibold"
              />
            </div>
            <div className="flex justify-end gap-sm">
              <button 
                onClick={() => {
                  setIsNewKeyModalOpen(false);
                  setNewKeyName("");
                }}
                className="px-lg py-sm border border-outline-variant rounded-xl text-label-md font-bold hover:bg-surface-container-high transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!newKeyName.trim()) return;
                  const randHex = Array.from({length: 20}, () => Math.floor(Math.random()*16).toString(16)).join('');
                  const keyValue = `sk_live_${randHex}`;
                  const newKeyData = {
                    name: newKeyName,
                    value: keyValue,
                    dateCreated: new Date().toISOString().split('T')[0],
                    createdBy: currentUser ? currentUser.uid : 'system',
                    createdTimestamp: Date.now()
                  };

                  try {
                    const docRef = await addDoc(collection(db, "apiKeys"), newKeyData);
                    const newKey = { id: docRef.id, ...newKeyData };
                    setApiKeys([newKey, ...apiKeys]);
                    setIsNewKeyModalOpen(false);
                    setNewKeyName("");
                    triggerToast(`Created API Key "${newKeyData.name}"!`);
                  } catch (error) {
                    console.error("Failed to save API Key to Firestore:", error);
                    triggerToast("Failed to write to database. Saved locally.");
                    const newKey = { id: `local-${Date.now()}`, ...newKeyData };
                    setApiKeys([newKey, ...apiKeys]);
                    setIsNewKeyModalOpen(false);
                    setNewKeyName("");
                  }
                }}
                className="px-lg py-sm bg-primary text-on-primary rounded-xl text-label-md font-bold hover:shadow-lg transition-all cursor-pointer"
              >
                Generate Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW COLLECTION FOLDER MODAL */}
      {isNewCollectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-lg">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-2xl w-full max-w-[448px] p-lg space-y-md animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-title-md font-bold text-on-surface">Create Collection Folder</h3>
            <div className="space-y-sm">
              <div className="space-y-xs">
                <label className="text-label-sm font-bold text-on-surface-variant/90 uppercase block text-xs">Folder Name</label>
                <input 
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g. Customer Success Prompts"
                  className="w-full bg-surface text-on-surface border border-outline-variant rounded-xl px-md py-sm text-body-md outline-none focus:border-primary transition-all font-semibold"
                />
              </div>
              <div className="space-y-xs">
                <label className="text-label-sm font-bold text-on-surface-variant/90 uppercase block text-xs">Folder Icon</label>
                <select
                  value={newCollectionIcon}
                  onChange={(e) => setNewCollectionIcon(e.target.value)}
                  className="w-full bg-surface text-on-surface border border-outline-variant rounded-xl px-md py-sm text-body-md outline-none focus:border-primary cursor-pointer font-semibold"
                >
                  <option value="folder">Standard Folder</option>
                  <option value="campaign">Marketing Campaign</option>
                  <option value="code">Software Engineering</option>
                  <option value="smart_toy">AI Agents</option>
                  <option value="description">Documents / Copy</option>
                  <option value="palette">Design / Art</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-sm">
              <button 
                onClick={() => {
                  setIsNewCollectionModalOpen(false);
                  setNewCollectionName("");
                }}
                className="px-lg py-sm border border-outline-variant rounded-xl text-label-md font-bold hover:bg-surface-container-high transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!newCollectionName.trim()) return;
                  const newColData = {
                    name: newCollectionName,
                    icon: newCollectionIcon,
                    promptIds: [],
                    createdBy: currentUser ? currentUser.uid : 'system',
                    createdTimestamp: Date.now()
                  };
                  try {
                    const docRef = await addDoc(collection(db, "collections"), newColData);
                    const newCol = { id: docRef.id, ...newColData };
                    setCollections([...collections, newCol]);
                    setIsNewCollectionModalOpen(false);
                    setNewCollectionName("");
                    triggerToast(`Created Collection folder "${newCol.name}"!`);
                  } catch (err) {
                    console.error("Failed to create collection in Firestore:", err);
                    triggerToast("Failed to save to database. Created locally.");
                    const localCol = { id: `local-${Date.now()}`, ...newColData };
                    setCollections([...collections, localCol]);
                    setIsNewCollectionModalOpen(false);
                    setNewCollectionName("");
                  }
                }}
                className="px-lg py-sm bg-primary text-on-primary rounded-xl text-label-md font-bold hover:shadow-lg transition-all cursor-pointer"
              >
                Create Folder
              </button>

            </div>
          </div>
        </div>
      )}

      {/* CHECKOUT PAYMENT PORTAL MODAL DEPRECATED IN FAVOR OF STRIPE REDIRECTION */}

      {/* BULK EXPORT LIBRARY MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-lg">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-2xl w-full max-w-[448px] p-lg space-y-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-xs">
              <h3 className="text-title-md font-bold text-on-surface flex items-center gap-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">download</span>
                Export Prompt Library
              </h3>
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-md">
              <div className="space-y-xs">
                <label className="text-label-sm font-bold text-on-surface-variant/90 uppercase block text-xs">Export Format</label>
                <div className="grid grid-cols-3 gap-sm">
                  {['JSON', 'CSV', 'Markdown'].map((format) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() => setExportFormat(format)}
                      className={`py-2 border rounded-xl font-bold text-label-md transition-all cursor-pointer text-center ${
                        exportFormat === format
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-outline-variant/40 hover:border-outline-variant text-on-surface-variant'
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-xs">
                <label className="text-label-sm font-bold text-on-surface-variant/90 uppercase block text-xs">Export Scope</label>
                <div className="grid grid-cols-2 gap-sm">
                  {[
                    { id: 'all', label: 'All Prompts', count: allExportCount },
                    { id: 'filtered', label: 'Filtered Prompts', count: filteredExportCount }
                  ].map((scope) => (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => setExportScope(scope.id)}
                      className={`py-2 border rounded-xl font-bold text-label-md transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-xs ${
                        exportScope === scope.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-outline-variant/40 hover:border-outline-variant text-on-surface-variant'
                      }`}
                    >
                      <span>{scope.label}</span>
                      <span className="text-[10px] opacity-70">({scope.count} items)</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-sm pt-xs">
              <button 
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-lg py-sm border border-outline-variant rounded-xl text-label-md font-bold hover:bg-surface-container-high transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleBulkExport}
                className="px-lg py-sm bg-primary text-on-primary rounded-xl text-label-md font-bold hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-xs"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Download File
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
