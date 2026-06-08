import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request) {
  try {
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
      ownerUid = 'system'; // System fallback
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

    // 3. Fetch prompts visible to this user
    // Visible prompts rules:
    // - System presets (createdBy === 'system' or 'preset' or no createdBy)
    // - Prompts marked as shared (isShared === true)
    // - Custom prompts created by the key owner (createdBy === ownerUid)
    const promptsRef = collection(db, 'prompts');
    const promptsSnapshot = await getDocs(promptsRef);
    const visiblePrompts = [];

    promptsSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const createdBy = data.createdBy || 'system';
      const isShared = data.isShared || false;

      const isSystem = createdBy === 'system' || createdBy === 'preset';
      const isOwner = ownerUid && createdBy === ownerUid;

      if (isSystem || isShared || isOwner) {
        visiblePrompts.push({
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
        });
      }
    });

    return NextResponse.json({ prompts: visiblePrompts }, { status: 200 });
  } catch (error) {
    console.error('API Prompts Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
