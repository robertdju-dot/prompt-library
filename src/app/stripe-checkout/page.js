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
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) { setError('Missing Checkout Session ID'); setLoading(false); return; }
      try {
        const docRef = doc(db, 'checkoutSessions', sessionId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) { setSession(docSnap.data()); }
        else { setError('Checkout session invalid or expired'); }
      } catch (err) {
        setError('Failed to connect to checkout database');
      } finally { setLoading(false); }
    };
    fetchSession();
  }, [sessionId]);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!session || isPaying) return;
    setIsPaying(true);
    try {
      const sessionDocRef = doc(db, 'checkoutSessions', sessionId);
      await updateDoc(sessionDocRef, { status: 'completed' });
      setTimeout(() => { router.push(`/dashboard?session_id=${sessionId}`); }, 1500);
    } catch (err) {
      setError('Payment processing error. Please try again.');
      setIsPaying(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f1f3f9] flex flex-col items-center justify-center font-sans gap-md">
      <div className="w-12 h-12 border-4 border-[#4648d4]/20 border-t-[#4648d4] rounded-full animate-spin"></div>
      <p className="text-body-md font-bold text-[#a2a8b9]/80 animate-pulse font-sans">Connecting to Stripe Secure Gateway...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f1f3f9] flex flex-col items-center justify-center font-sans p-lg text-center space-y-md">
      <div className="w-16 h-16 rounded-full bg-[#ba1a1a]/10 flex items-center justify-center text-[#ba1a1a]"><span className="material-symbols-outlined text-[32px]">warning</span></div>
      <h3 className="text-headline-sm font-bold">Checkout Verification Failed</h3>
      <p className="text-body-md text-[#a2a8b9]/90 max-w-md">{error}</p>
      <button onClick={() => router.push('/dashboard')} className="px-lg py-sm bg-[#4648d4] text-white rounded-xl text-label-md font-bold hover:shadow-lg transition-all cursor-pointer">Return to Dashboard</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f1f3f9] font-sans flex items-center justify-center p-md md:p-xl">
      <div className="bg-[#05070e] border border-[#2d3448] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
        <div className="md:col-span-5 bg-[#101524] p-lg md:p-xl flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#2d3448]">
          <div className="space-y-lg">
            <div className="flex items-center gap-xs text-[#4648d4]">
              <span className="material-symbols-outlined font-extrabold text-[28px]">payments</span>
              <span className="font-sans font-black text-xl tracking-tight text-white">stripe</span>
            </div>
            <div className="space-y-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#a2a8b9]">Subscribe to</span>
              <h2 className="text-headline-md font-black text-white">{session.planName} Plan</h2>
              <p className="text-body-md text-[#a2a8b9]/80 leading-relaxed font-semibold">Access advanced workspace features, CLI tokens, collection filters, and prompt version history.</p>
            </div>
            <div className="flex items-baseline gap-xs">
              <span className="text-headline-lg font-black text-white">${session.price}</span>
              <span className="text-body-md text-[#a2a8b9]/70 font-bold">/ month</span>
            </div>
          </div>
          <div className="pt-lg border-t border-[#2d3448]/50 space-y-sm">
            <div className="flex items-center gap-sm text-xs font-semibold text-[#a2a8b9]/90"><span className="material-symbols-outlined text-[#8455ef] text-[18px]">verified_user</span><span>Cancel subscription anytime from billing dashboard</span></div>
            <div className="flex items-center gap-sm text-xs font-semibold text-[#a2a8b9]/90"><span className="material-symbols-outlined text-[#8455ef] text-[18px]">shield</span><span>All payment logs fully encrypted and tokenized</span></div>
          </div>
        </div>
        <form onSubmit={handlePay} className="md:col-span-7 p-lg md:p-xl flex flex-col justify-between space-y-lg">
          <div className="space-y-md">
            <div className="flex justify-between items-center pb-xs border-b border-[#2d3448]/60">
              <h3 className="text-title-md font-bold text-white">Credit Card Details</h3>
              <div className="flex gap-xs items-center text-xs text-[#a2a8b9]/80"><span className="material-symbols-outlined text-[14px]">lock</span><span>Secure SSL Connection</span></div>
            </div>
            <div className="space-y-sm">
              <div className="space-y-xs">
                <label className="text-label-xs font-bold text-[#a2a8b9] uppercase tracking-wider text-[10px] block">Cardholder Name</label>
                <input type="text" required value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Alex Rivera" className="w-full bg-[#101524] border border-[#2d3448] rounded-xl px-md py-sm text-body-md outline-none focus:border-[#4648d4] text-white transition-all font-semibold" />
              </div>
              <div className="space-y-xs">
                <label className="text-label-xs font-bold text-[#a2a8b9] uppercase tracking-wider text-[10px] block">Card Number</label>
                <div className="relative">
                  <input type="text" required value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4111 2222 3333 4444" className="w-full bg-[#101524] border border-[#2d3448] rounded-xl px-md py-sm text-body-md outline-none focus:border-[#4648d4] text-white transition-all font-mono pl-md pr-10" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2"><span className="material-symbols-outlined text-[#8455ef] text-[20px]">credit_card</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-xs">
                  <label className="text-label-xs font-bold text-[#a2a8b9] uppercase tracking-wider text-[10px] block">Expiry Date</label>
                  <input type="text" required value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/YY" className="w-full bg-[#101524] border border-[#2d3448] rounded-xl px-md py-sm text-body-md outline-none focus:border-[#4648d4] text-white transition-all font-mono" />
                </div>
                <div className="space-y-xs">
                  <label className="text-label-xs font-bold text-[#a2a8b9] uppercase tracking-wider text-[10px] block">CVC / CVV</label>
                  <input type="text" required value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} placeholder="123" className="w-full bg-[#101524] border border-[#2d3448] rounded-xl px-md py-sm text-body-md outline-none focus:border-[#4648d4] text-white transition-all font-mono" />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-sm">
            <button type="submit" disabled={isPaying} className="w-full bg-[#4648d4] hover:bg-[#4648d4]/95 text-white py-md rounded-xl text-body-md font-bold hover:shadow-lg hover:shadow-[#4648d4]/20 transition-all flex items-center justify-center gap-xs cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed">
              {isPaying ? (<><div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div><span>Processing Payment...</span></>) : (<><span className="material-symbols-outlined text-[18px]">lock</span><span>Pay ${session.price}.00 &amp; Subscribe</span></>)}
            </button>
            <button type="button" onClick={() => router.push('/dashboard')} className="w-full py-sm text-center text-xs text-[#a2a8b9]/70 hover:text-[#a2a8b9] transition-colors cursor-pointer">Cancel and Return</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StripeCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b0f19] text-[#f1f3f9] flex flex-col items-center justify-center font-sans gap-md">
        <div className="w-12 h-12 border-4 border-[#4648d4]/20 border-t-[#4648d4] rounded-full animate-spin"></div>
        <p className="text-body-md font-bold text-[#a2a8b9]/80 animate-pulse font-sans">Connecting to Stripe Secure Gateway...</p>
      </div>
    }>
      <StripeCheckoutContent />
    </Suspense>
  );
}
