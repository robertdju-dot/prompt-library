'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) router.push('/dashboard');
    });
    return () => unsubscribe();
  }, [router]);

  const syncUserRecord = async (user, customName = '') => {
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          id: user.uid,
          name: customName || user.displayName || user.email.split('@')[0],
          email: user.email,
          role: 'USER',
          tier: 'FREE',
          status: 'ACTIVE',
          lastLogin: new Date().toISOString()
        });
      } else {
        await updateDoc(userDocRef, { lastLogin: new Date().toISOString() });
      }
    } catch (err) {
      console.error('Firestore user sync failed:', err);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (!email.trim() || !password.trim()) { setError('Please fill in all required fields.'); setLoading(false); return; }
    if (activeTab === 'signup' && !name.trim()) { setError('Please enter your display name.'); setLoading(false); return; }
    try {
      if (activeTab === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await syncUserRecord(userCredential.user);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await syncUserRecord(userCredential.user, name);
      }
      router.push('/dashboard');
    } catch (err) {
      let errMsg = 'An unexpected error occurred. Please try again.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') errMsg = 'Invalid email or password.';
      else if (err.code === 'auth/email-already-in-use') errMsg = 'This email address is already in use.';
      else if (err.code === 'auth/weak-password') errMsg = 'Password must be at least 6 characters long.';
      else if (err.code === 'auth/invalid-email') errMsg = 'Invalid email address format.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await syncUserRecord(result.user);
      router.push('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') setError('Google authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex items-center justify-center p-md font-sans relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary opacity-10 blur-[150px] rounded-full"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary opacity-10 blur-[150px] rounded-full"></div>
      <div className="w-full max-w-[440px] bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-xl p-lg relative z-10">
        <div className="text-center mb-lg">
          <Link href="/" className="text-headline-md font-extrabold text-primary tracking-tight">Prompt Library</Link>
          <p className="text-body-md font-medium text-on-surface-variant mt-1">{activeTab === 'login' ? 'Welcome back! Sign in to access your library.' : 'Create your account to start managing prompts.'}</p>
        </div>
        <div className="flex bg-surface-container-low p-1 rounded-xl mb-md">
          <button onClick={() => { setActiveTab('login'); setError(null); }} className={`flex-1 py-2 rounded-lg text-label-md font-bold transition-all cursor-pointer text-center ${activeTab === 'login' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Sign In</button>
          <button onClick={() => { setActiveTab('signup'); setError(null); }} className={`flex-1 py-2 rounded-lg text-label-md font-bold transition-all cursor-pointer text-center ${activeTab === 'signup' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Create Account</button>
        </div>
        {error && (<div className="bg-error-container/10 border border-error/20 rounded-xl p-md flex items-start gap-sm mb-md animate-in fade-in duration-200"><span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">error</span><span className="text-label-md font-medium text-error leading-relaxed">{error}</span></div>)}
        <form onSubmit={handleEmailAuth} className="space-y-md">
          {activeTab === 'signup' && (
            <div className="space-y-xs">
              <label className="text-label-sm font-bold text-on-surface-variant/90 uppercase block text-xs">Display Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" disabled={loading} className="w-full bg-surface text-on-surface border border-outline-variant rounded-xl px-md py-sm text-body-md outline-none focus:border-primary transition-all font-semibold" required />
            </div>
          )}
          <div className="space-y-xs">
            <label className="text-label-sm font-bold text-on-surface-variant/90 uppercase block text-xs">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" disabled={loading} className="w-full bg-surface text-on-surface border border-outline-variant rounded-xl px-md py-sm text-body-md outline-none focus:border-primary transition-all font-semibold" required />
          </div>
          <div className="space-y-xs">
            <div className="flex justify-between items-center">
              <label className="text-label-sm font-bold text-on-surface-variant/90 uppercase block text-xs">Password</label>
              {activeTab === 'login' && <a href="#" className="text-label-sm font-bold text-primary hover:underline">Forgot password?</a>}
            </div>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={loading} className="w-full bg-surface text-on-surface border border-outline-variant rounded-xl px-md py-sm text-body-md outline-none focus:border-primary transition-all font-semibold pr-10" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 hover:text-on-surface cursor-pointer focus:outline-none flex items-center">
                <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary text-on-primary py-md rounded-xl font-semibold text-body-md hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-sm cursor-pointer mt-lg disabled:opacity-50">
            {loading ? <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin"></span> : activeTab === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <div className="flex items-center my-md text-on-surface-variant/30">
          <div className="flex-1 border-t border-outline-variant/30"></div>
          <span className="px-md text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/60">Or continue with</span>
          <div className="flex-1 border-t border-outline-variant/30"></div>
        </div>
        <button type="button" onClick={handleGoogleAuth} disabled={loading} className="w-full bg-surface text-on-surface border border-outline-variant rounded-xl py-md flex items-center justify-center gap-sm hover:bg-surface-container-low transition-colors cursor-pointer disabled:opacity-50 font-bold text-body-md shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Google Workspace
        </button>
        <p className="text-center text-label-sm font-semibold text-on-surface-variant/80 mt-lg">By proceeding, you agree to our <Link href="#" className="text-primary hover:underline">Terms of Service</Link> and <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>.</p>
      </div>
    </div>
  );
}
