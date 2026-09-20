import { NextRequest, NextResponse } from 'next/server';
import { generateGoogleTTS } from '@/lib/gemini';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text');
  const voice = searchParams.get('voice') || 'Puck';

  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
  }

  try {
    const wavBuffer = await generateGoogleTTS(text.trim(), voice);

    return new Response(new Uint8Array(wavBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': wavBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API TTS Error:', message);
    return NextResponse.json(
      { error: 'Failed to generate voice speech with Google Studio AI', details: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voice } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Missing text in body' }, { status: 400 });
    }

    const wavBuffer = await generateGoogleTTS(text.trim(), voice || 'Puck');

    return new Response(new Uint8Array(wavBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': wavBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API TTS POST Error:', message);
    return NextResponse.json(
      { error: 'Failed to generate voice speech with Google Studio AI', details: message },
      { status: 500 }
    );
  }
}
