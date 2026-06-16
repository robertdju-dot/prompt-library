import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { filename } = resolvedParams;

    if (!filename) {
      return NextResponse.json({ error: 'Filename parameter is required' }, { status: 400 });
    }

    // Sanitize filename to prevent directory traversal
    const cleanFilename = filename.replace(/[^a-zA-Z0-9_\.-]/g, '');
    
    // Path to the avatars in src/app/avatar/
    const filePath = path.join(process.cwd(), 'src/app/avatar', cleanFilename);

    if (!fs.existsSync(filePath)) {
      return new Response('Avatar not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving avatar:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
