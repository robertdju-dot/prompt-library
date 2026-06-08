'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

function StripeCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  // Sync theme mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") || "light";
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  // Form inputs
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setError('Missing Checkout Session ID');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'checkoutSessions', sessionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setSession(docSnap.data());
        } else {
          setError('Checkout session invalid or expired');
        }
      } catch (err) {
        console.error('Error fetching mock session:', err);
        setError('Failed to connect to checkout database');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!session || isPaying) return;

    setIsPaying(true);

    try {
      // Update checkout session status in Firestore
      const sessionDocRef = doc(db, 'checkoutSessions', sessionId);
      await updateDoc(sessionDocRef, { status: 'completed' });

      // Simulate network request delay
      setTimeout(() => {
        router.push(`/dashboard?session_id=${sessionId}`);
      }, 1500);
    } catch (err) {
      console.error('Payment verification failed:', err);
      setError('Payment processing error. Please try again.');
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center font-sans gap-md">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-body-md font-bold text-on-surface-variant/80 animate-pulse font-sans">Connecting to Stripe Secure Gateway...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center font-sans p-lg text-center space-y-md">
        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-error">
          <span className="material-symbols-outlined text-[32px]">warning</span>
        </div>
        <h3 className="text-headline-sm font-bold">Checkout Verification Failed</h3>
        <p className="text-body-md text-on-surface-variant/90 max-w-md">{error}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-lg py-sm bg-primary text-on-primary rounded-xl text-label-md font-bold hover:shadow-lg transition-all cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-sans flex items-center justify-center p-md md:p-xl">
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
        
        {/* Left Column: Plan Summary */}
        <div className="md:col-span-5 bg-surface-container-low p-lg md:p-xl flex flex-col justify-between border-b md:border-b-0 md:border-r border-outline-variant/30">
          <div className="space-y-lg">
            <div className="flex items-center gap-xs text-primary">
              <span className="material-symbols-outlined font-extrabold text-[28px]">payments</span>
              <span className="font-sans font-black text-xl tracking-tight text-on-surface">stripe</span>
            </div>
            
            <div className="space-y-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Subscribe to</span>
              <h2 className="text-headline-md font-black text-on-surface">{session.planName} Plan</h2>
              <p className="text-body-md text-on-surface-variant/80 leading-relaxed font-semibold">
                Access advanced workspace features, CLI tokens, collection filters, and prompt version history.
              </p>
            </div>

            <div className="flex items-baseline gap-xs">
              <span className="text-headline-lg font-black text-on-surface">${session.price}</span>
              <span className="text-body-md text-on-surface-variant/70 font-bold">/ month</span>
            </div>
          </div>

          <div className="pt-lg border-t border-outline-variant/20 space-y-sm">
            <div className="flex items-center gap-sm text-xs font-semibold text-on-surface-variant/90">
              <span className="material-symbols-outlined text-secondary text-[18px]">verified_user</span>
              <span>Cancel subscription anytime from billing dashboard</span>
            </div>
            <div className="flex items-center gap-sm text-xs font-semibold text-on-surface-variant/90">
              <span className="material-symbols-outlined text-secondary text-[18px]">shield</span>
              <span>All payment logs fully encrypted and tokenized</span>
            </div>
          </div>
        </div>

        {/* Right Column: Secure Card Checkout Form */}
        <form onSubmit={handlePay} className="md:col-span-7 p-lg md:p-xl flex flex-col justify-between space-y-lg">
          <div className="space-y-md">
            <div className="flex justify-between items-center pb-xs border-b border-outline-variant/30">
              <h3 className="text-title-md font-bold text-on-surface">Credit Card Details</h3>
              <div className="flex gap-xs items-center text-xs text-on-surface-variant/80">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Secure SSL Connection</span>
              </div>
            </div>

            <div className="space-y-sm">
              <div className="space-y-xs">
                <label className="text-label-xs font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">Email Address</label>
                <input
                  type="email"
                  readOnly
                  value="developer@workspace.io"
                  className="w-full bg-surface-container-low/60 border border-outline-variant/30 rounded-xl px-md py-sm text-body-md font-semibold text-on-surface-variant/70 cursor-not-allowed outline-none"
                />
              </div>

              <div className="space-y-xs">
                <label className="text-label-xs font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">Cardholder Name</label>
                <input
                  type="text"
                  required
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full bg-surface border border-outline-variant/30 rounded-xl px-md py-sm text-body-md outline-none focus:border-primary text-on-surface transition-all font-semibold"
                />
              </div>

              <div className="space-y-xs">
                <label className="text-label-xs font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4111 2222 3333 4444"
                    className="w-full bg-surface border border-outline-variant/30 rounded-xl px-md py-sm text-body-md outline-none focus:border-primary text-on-surface transition-all font-mono pl-md pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-xs">
                    <span className="material-symbols-outlined text-secondary text-[20px]">credit_card</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-xs">
                  <label className="text-label-xs font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">Expiry Date</label>
                  <input
                    type="text"
                    required
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full bg-surface border border-outline-variant/30 rounded-xl px-md py-sm text-body-md outline-none focus:border-primary text-on-surface transition-all font-mono"
                  />
                </div>
                <div className="space-y-xs">
                  <label className="text-label-xs font-bold text-on-surface-variant uppercase tracking-wider text-[10px] block">CVC / CVV</label>
                  <input
                    type="text"
                    required
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="123"
                    className="w-full bg-surface border border-outline-variant/30 rounded-xl px-md py-sm text-body-md outline-none focus:border-primary text-on-surface transition-all font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-sm">
            <button
              type="submit"
              disabled={isPaying}
              className="w-full bg-primary hover:bg-primary/95 text-on-primary py-md rounded-xl text-body-md font-bold hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-xs cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isPaying ? (
                <>
                  <div className="w-5 h-5 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin"></div>
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">lock</span>
                  <span>Pay ${session.price}.00 &amp; Subscribe</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="w-full py-sm text-center text-xs text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer"
            >
              Cancel and Return
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

export default function StripeCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center font-sans gap-md">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-body-md font-bold text-on-surface-variant/80 animate-pulse font-sans">Connecting to Stripe Secure Gateway...</p>
      </div>
    }>
      <StripeCheckoutContent />
    </Suspense>
  );
}
