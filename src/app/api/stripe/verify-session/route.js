import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Stripe from 'stripe';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 400 });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (sessionId.startsWith('mock_session_')) {
      // 1. Sandbox Verify
      const sessionDocRef = doc(db, 'checkoutSessions', sessionId);
      const sessionSnap = await getDoc(sessionDocRef);

      if (!sessionSnap.exists()) {
        return NextResponse.json({ error: 'Checkout session not found' }, { status: 404 });
      }

      const sessionData = sessionSnap.data();

      if (sessionData.status !== 'completed') {
        return NextResponse.json({ error: 'Payment has not been completed' }, { status: 400 });
      }

      // Update user plan in Firestore database
      const userDocRef = doc(db, 'users', sessionData.userId);
      await updateDoc(userDocRef, { tier: sessionData.planName });

      return NextResponse.json({
        success: true,
        userId: sessionData.userId,
        planName: sessionData.planName,
        price: sessionData.price,
        mode: 'sandbox'
      });
    } else {
      // 2. Real Stripe Verify
      if (!secretKey) {
        return NextResponse.json({ error: 'Stripe Secret Key configuration missing' }, { status: 500 });
      }

      const stripe = new Stripe(secretKey);
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (!session || (session.payment_status !== 'paid' && session.status !== 'complete')) {
        return NextResponse.json({ error: 'Stripe Checkout Session is unpaid or incomplete' }, { status: 400 });
      }

      const userId = session.client_reference_id;
      // Extract plan name from session query string or query line items
      let planName = searchParams.get('plan') || 'Pro';
      
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
        if (lineItems.data.length > 0) {
          const itemDescription = lineItems.data[0].description;
          if (itemDescription.includes('Power User')) {
            planName = 'Power User';
          } else if (itemDescription.includes('Pro')) {
            planName = 'Pro';
          }
        }
      } catch (err) {
        console.error('Error fetching stripe line items:', err);
      }

      if (!userId) {
        return NextResponse.json({ error: 'Missing client_reference_id in checkout session' }, { status: 400 });
      }

      // Update user plan in Firestore database
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { tier: planName });

      return NextResponse.json({
        success: true,
        userId,
        planName,
        price: session.amount_total ? session.amount_total / 100 : 0,
        mode: 'live'
      });
    }
  } catch (error) {
    console.error('Verify Stripe Session Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
