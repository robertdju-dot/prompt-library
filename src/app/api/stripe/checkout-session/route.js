import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import Stripe from 'stripe';

export async function POST(request) {
  try {
    const body = await request.json();
    const { planName, price, userId } = body;

    if (!planName || price === undefined || price === null || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (secretKey && !secretKey.startsWith('mock_')) {
      // 1. Real Stripe Flow
      const stripe = new Stripe(secretKey);
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${planName} Plan Subscription`,
                description: `Online Prompt Library ${planName} Access`,
              },
              unit_amount: Math.round(Number(price) * 100),
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        client_reference_id: userId,
        success_url: `${request.nextUrl.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(planName)}`,
        cancel_url: `${request.nextUrl.origin}/dashboard`,
      });

      return NextResponse.json({ url: session.url, mode: 'live' });
    } else {
      // 2. Simulated Stripe Sandbox Flow
      const mockSessionId = `mock_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Save mock session data in Firestore to verify on redirect
      const sessionDocRef = doc(db, 'checkoutSessions', mockSessionId);
      await setDoc(sessionDocRef, {
        sessionId: mockSessionId,
        userId,
        planName,
        price,
        status: 'pending',
        createdTimestamp: Date.now()
      });

      const mockCheckoutUrl = `${request.nextUrl.origin}/stripe-checkout?session_id=${mockSessionId}`;
      return NextResponse.json({ url: mockCheckoutUrl, mode: 'sandbox' });
    }
  } catch (error) {
    console.error('Create Stripe Checkout Session Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
