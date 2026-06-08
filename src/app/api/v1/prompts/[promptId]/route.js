import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export async function GET(request, { params }) {
  try {
    const { promptId } = await params;

    // 1. Get the Authorization Header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid Authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7).trim();

    // 2. Validate token against Firestore apiKeys collection
    let ownerUid = null;
    let validated = false;

    // Hardcoded sandbox fallback compatibility
    if (token === 'sk_live_4627dja89d3ja827ad82' || token === 'sk_test_8372adja283dha1239ad') {
      ownerUid = 'system';
      validated = true;
    } else {
      const apiKeysRef = collection(db, 'apiKeys');
      const q = query(apiKeysRef, where('value', '==', token));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const keyDoc = querySnapshot.docs[0].data();
        ownerUid = keyDoc.createdBy;
        validated = true;
      }
    }

    if (!validated) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API key' }, { status: 401 });
    }

    // 3. Fetch the prompt by ID
    const docRef = doc(db, 'prompts', promptId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json({ error: 'Not Found: Prompt does not exist' }, { status: 404 });
    }

    const data = docSnap.data();
    const createdBy = data.createdBy || 'system';
    const isShared = data.isShared || false;

    const isSystem = createdBy === 'system' || createdBy === 'preset';
    const isOwner = ownerUid && createdBy === ownerUid;

    // Check visibility permissions
    if (!(isSystem || isShared || isOwner)) {
      return NextResponse.json({ error: 'Forbidden: You do not have access to this prompt' }, { status: 403 });
    }

    const promptDetails = {
      id: docSnap.id,
      title: data.title || 'Untitled Prompt',
      subtitle: data.subtitle || data.description || '',
      category: data.category || 'General',
      tags: data.tags || [],
      access: data.access || 'Basic',
      template: data.template || data.content || '',
      isShared: isShared,
      createdDate: data.createdDate || '',
      createdBy: createdBy
    };

    return NextResponse.json({ prompt: promptDetails }, { status: 200 });
  } catch (error) {
    console.error('API Single Prompt Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
