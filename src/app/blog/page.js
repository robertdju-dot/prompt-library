'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, auth } from '../../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';

export default function BlogFeedPage() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [blogPosts, setBlogPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  
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

  // Fetch blogs from Firestore
  useEffect(() => {
    const fetchBlogs = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "blogs"));
        const docs = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status === 'published') {
            docs.push({ id: docSnap.id, ...data });
          }
        });
        docs.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
        setBlogPosts(docs);
      } catch (err) {
        console.error("Error fetching published blog posts:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  // Calculate unique tags for filter
  const allTags = ['All', ...new Set(blogPosts.flatMap(post => post.tags || []))];

  // Filtering logic
  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (post.subtitle && post.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTag = selectedTag === 'All' || post.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

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

      {/* Main Content */}
      <main className="pt-32 pb-24 space-y-xl max-w-[1280px] mx-auto px-lg">
        
        {/* Header Block */}
        <section className="text-center space-y-md max-w-2xl mx-auto py-md">
          <div className="inline-flex items-center gap-sm bg-primary/10 text-primary px-md py-xs rounded-full border border-primary/20">
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
            <span className="text-label-md font-bold">Knowledge Base & Guides</span>
          </div>
          <h1 className="text-[36px] md:text-[48px] font-extrabold text-on-surface leading-tight tracking-tight">
            The Prompt Library <span className="text-primary">Blog</span>
          </h1>
          <p className="text-[16px] md:text-[18px] font-medium text-on-surface-variant leading-relaxed">
            In-depth guides, research breakdowns, and tutorials to help you build, orchestrate, and optimize your prompting architectures.
          </p>
        </section>

        {/* Toolbar: Search and Tag Filters */}
        <section className="space-y-md">
          <div className="flex flex-col md:flex-row gap-md justify-between items-center bg-surface-container-lowest border border-outline-variant/30 p-md rounded-2xl shadow-sm">
            <div className="relative w-full md:max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-10 pr-4 py-2 text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="Search articles by keywords, systems, tags..."
              />
            </div>
            
            {/* Tag Buttons Scrollbar */}
            <div className="flex items-center gap-xs w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-label-md font-bold text-on-surface-variant/70 shrink-0 mr-2">Tags:</span>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-md py-1.5 rounded-lg text-label-md font-semibold transition-all cursor-pointer border shrink-0 ${
                    selectedTag === tag
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-surface-container-low border-transparent text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Blog Posts Grid */}
        <section>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-md">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <p className="text-body-md font-bold text-on-surface-variant/80">Fetching guides...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-24 text-center space-y-md shadow-sm">
              <span className="material-symbols-outlined text-outline text-[64px]">search_off</span>
              <h4 className="text-title-lg font-bold text-on-surface">No Articles Found</h4>
              <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
                No published articles matched your search query "{searchQuery}" or selected tag filter. Please try a different query.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedTag('All'); }}
                className="bg-primary text-on-primary px-lg py-2 rounded-lg font-semibold text-label-md hover:shadow-md cursor-pointer border-none"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
              {filteredPosts.map(post => (
                <article
                  key={post.id}
                  className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all group flex flex-col justify-between"
                >
                  <Link href={`/blog/${post.slug}`} className="block overflow-hidden relative shrink-0 aspect-video border-b border-outline-variant/20">
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </Link>
                  <div className="p-lg flex-1 flex flex-col justify-between space-y-md">
                    <div className="space-y-sm">
                      {/* Tag list */}
                      <div className="flex gap-xs flex-wrap">
                        {post.tags.map(tag => (
                          <span
                            key={tag}
                            className="bg-secondary-container/10 text-secondary px-sm py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <Link href={`/blog/${post.slug}`} className="block">
                        <h3 className="text-title-md font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                          {post.title}
                        </h3>
                      </Link>
                      <p className="text-body-md font-medium text-on-surface-variant line-clamp-3 leading-relaxed">
                        {post.subtitle}
                      </p>
                    </div>

                    {/* Author and Date */}
                    <div className="flex items-center gap-sm pt-md border-t border-outline-variant/20 mt-auto shrink-0">
                      <img
                        src={post.authorAvatar}
                        alt={post.authorName}
                        className="w-8 h-8 rounded-full object-cover border border-primary/10"
                      />
                      <div className="min-w-0">
                        <span className="block font-bold text-on-surface text-xs truncate leading-tight">
                          {post.authorName}
                        </span>
                        <span className="block text-on-surface-variant/70 text-[10px] font-medium leading-none">
                          {new Date(post.createdTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

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
