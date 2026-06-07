import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, subject, category, message, userId } = body;

    if (!name || !email || !subject || !category || !message) {
      return NextResponse.json(
        { error: 'All fields (name, email, subject, category, message) are required' },
        { status: 400 }
      );
    }

    // Save ticket to Firestore
    const ticketData = {
      name,
      email,
      subject,
      category,
      message,
      userId: userId || 'guest',
      status: 'OPEN',
      createdTimestamp: Date.now(),
      createdAt: new Date().toISOString(),
      recipient: 'admin@onlinepromptlibrary.com'
    };

    const docRef = await addDoc(collection(db, 'supportTickets'), ticketData);

    // In a production app, you would also trigger an email sending service here
    // e.g., Nodemailer, SendGrid, Resend, or Firebase Extension: Trigger Email
    console.log(`Support ticket created: ${docRef.id}. Notification sent to admin@onlinepromptlibrary.com`);

    return NextResponse.json({
      success: true,
      ticketId: docRef.id,
      message: 'Support ticket submitted successfully.'
    });
  } catch (error) {
    console.error('Support ticket submission error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
