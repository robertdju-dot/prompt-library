'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { db, auth } from '../../../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';

// Markdown parser helper function
function parseMarkdown(mdText) {
  if (!mdText) return "";
  let html = mdText
    .replace(/\\n/g, "\n")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks: ```javascript code ```
  html = html.replace(/```([\s\S]+?)```/g, (match, code) => {
    return `<pre class="font-mono bg-surface-container-low p-md rounded-lg border border-outline-variant/30 text-body-md my-md overflow-x-auto"><code class="text-primary font-mono">${code.trim()}</code></pre>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`]+?)`/g, '<code class="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[13px]">$1</code>');

  // Headers
  html = html.replace(/^### (.*?)$/gm, '<h3 class="text-title-md font-bold text-on-surface mt-lg mb-sm">$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2 class="text-title-lg font-bold text-on-surface mt-xl mb-md border-b border-outline-variant/30 pb-xs">$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1 class="text-headline-md font-extrabold text-on-surface mt-xl mb-md">$1</h1>');

  // Bold / Italics
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" class="text-primary hover:underline font-semibold">$1</a>');

  // Bullets: - item -> <li>item</li>
  html = html.replace(/^- (.*?)$/gm, '<li class="ml-lg list-disc text-body-md text-on-surface-variant my-xs">$1</li>');

  // Paragraph blocks (split by double carriage return and wrap non-headers/lists)
  const paragraphs = html.split(/\n\n+/);
  const parsedParagraphs = paragraphs.map(p => {
    const trimmed = p.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<li') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) {
      return trimmed;
    }
    return `<p class="text-body-md text-on-surface-variant leading-relaxed mb-md">${trimmed.replace(/\n/g, '<br/>')}</p>`;
  });

  return parsedParagraphs.join("\n");
}

export default function BlogPostPage({ params }) {
  const { slug } = use(params);
  
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Theme state
  const [themeMode, setThemeMode] = useState('light');

  // Monitor scroll for navbar styles
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Theme synchronization
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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Fetch specific blog from Firestore by slug
  useEffect(() => {
    const fetchBlogPost = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, "blogs"),
          where("slug", "==", slug),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data();
          const normalizedContent = (data.content || '').replace(/\\n/g, '\n');
          setPost({ id: docSnap.id, ...data, content: normalizedContent });
        } else {
          setPost(null);
        }
      } catch (err) {
        console.error("Error fetching single post by slug:", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (slug) {
      fetchBlogPost();
    }
  }, [slug]);

  return (
    <div className="bg-background text-on-background selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen font-sans">
      
      {/* TopNavBar */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md border-b border-outline-variant/30 ${
        scrolled ? 'py-sm shadow-sm bg-surface/90' : 'py-md bg-surface/80'
      }`}>
        <nav className="max-w-[1280px] mx-auto px-lg flex justify-between items-center h-16 w-full relative">
          {/* Logo aligned left */}
          <div className="flex-1 flex justify-start">
            <Link className="text-title-md font-headline-lg text-primary tracking-tight font-extrabold" href="/">
              Online Prompt Library
            </Link>
          </div>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center justify-center gap-lg flex-1">
            <Link className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors" href={user ? "/dashboard" : "/login"}>
              Collections
            </Link>
            <Link className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors" href="/#pricing">
              Pricing
            </Link>
            <Link className="text-label-md font-bold text-primary transition-colors" href="/blog">
              Blog
            </Link>
            <Link className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors" href="/#faq">
              Docs
            </Link>
          </div>

          {/* Right Side Actions */}
          <div className="flex-1 flex justify-end items-center gap-md">
            {/* Theme Toggle */}
            <button
              onClick={() => handleToggleTheme(themeMode === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all cursor-pointer border-none bg-transparent"
              title="Toggle Theme"
            >
              <span className="material-symbols-outlined text-[20px]">
                {themeMode === 'light' ? 'dark_mode' : 'light_mode'}
              </span>
            </button>

            {user ? (
              <>
                <Link href="/dashboard" className="text-label-md font-bold text-primary px-lg py-2 hover:bg-primary/5 transition-all border border-dashed border-primary/40 rounded-lg">
                  Dashboard
                </Link>
                <button 
                  onClick={handleSignOut}
                  className="bg-surface-container-low text-error border border-error/20 px-lg py-2 rounded-lg text-label-md font-bold hover:bg-error-container/10 transition-all cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-label-md font-bold text-primary px-lg py-2 hover:bg-primary/5 transition-all border border-dashed border-primary/40 rounded-lg">
                  Log In
                </Link>
                <Link href="/login" className="bg-primary text-on-primary px-lg py-2 rounded-lg text-label-md font-bold hover:shadow-lg hover:shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Main Container */}
      <main className="pt-32 pb-24 max-w-4xl mx-auto px-lg">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-md">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-body-md font-bold text-on-surface-variant/80">Loading article...</p>
          </div>
        ) : !post ? (
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-24 text-center space-y-md shadow-sm">
            <span className="material-symbols-outlined text-error text-[64px]">warning</span>
            <h4 className="text-title-lg font-bold text-on-surface">Article Not Found</h4>
            <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
              We couldn't locate the blog post under the URL slug "{slug}". It might be under draft status or has been moved.
            </p>
            <Link
              href="/blog"
              className="bg-primary text-on-primary px-lg py-2 rounded-lg font-semibold text-label-md hover:shadow-md inline-block text-center border-none"
            >
              Back to Blog Feed
            </Link>
          </div>
        ) : (
          <article className="space-y-xl">
            {/* Back to feed navigation */}
            <Link href="/blog" className="inline-flex items-center gap-xs text-label-md font-bold text-primary hover:underline transition-all">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to Blog Feed
            </Link>

            {/* Title / Subtitle Headers */}
            <div className="space-y-md">
              <div className="flex flex-wrap gap-xs">
                {post.tags && post.tags.map(tag => (
                  <span key={tag} className="bg-secondary-container/10 text-secondary px-sm py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-[32px] md:text-[48px] font-extrabold text-on-surface leading-tight tracking-tight">
                {post.title}
              </h1>
              <p className="text-[18px] md:text-[22px] font-medium text-on-surface-variant leading-relaxed">
                {post.subtitle}
              </p>

              {/* Author details block */}
              <div className="flex items-center gap-sm pt-sm">
                <img
                  src={post.authorAvatar}
                  alt={post.authorName}
                  className="w-10 h-10 rounded-full object-cover border border-primary/20"
                />
                <div>
                  <span className="block font-bold text-on-surface text-body-md">
                    {post.authorName}
                  </span>
                  <span className="block text-on-surface-variant/70 text-xs font-semibold">
                    Published: {new Date(post.createdTimestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Featured Image */}
            <div className="rounded-2xl overflow-hidden aspect-video border border-outline-variant/30 shadow-md">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Markdown rendered body */}
            <div 
              className="prose dark:prose-invert max-w-none prose-h1:text-headline-md prose-h2:text-title-lg prose-p:text-body-md prose-li:text-body-md text-on-surface-variant"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(post.content) }}
            >
            </div>
          </article>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-outline-variant/30">
        <div className="w-full max-w-[1280px] mx-auto px-lg py-xl flex flex-col md:flex-row justify-between items-center gap-xl">
          <div className="space-y-sm text-center md:text-left">
            <span className="text-title-md font-bold text-on-surface">Online Prompt Library</span>
            <p className="text-body-md text-on-surface-variant/80 font-medium">© 2026 Online Prompt Library. Built for high-utility SaaS.</p>
          </div>
          <div className="flex gap-lg">
            <Link className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors" href="/blog">Blog</Link>
            <Link className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors" href="/terms">Terms</Link>
            <Link className="text-label-md font-semibold text-on-surface-variant hover:text-primary transition-colors" href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
