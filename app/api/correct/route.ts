import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { script, transcript } = await req.json();

    if (!script || !transcript) {
      return NextResponse.json({ error: 'Missing script or transcript' }, { status: 400 });
    }

    // Build prompt
    const prompt = `
You are a helpful assistant that corrects speech-to-text transcripts using the given script.

Script:
"""
${script}
"""

Whisper transcript:
"""
${transcript}
"""

Please correct the transcript so that it only contains words or phrases that appear in the script. Keep the same meaning and order, but replace any misheard words with the correct ones from the script. If a word is not in the script, find the closest match from the script or skip it.

Return only the corrected text, without any extra explanation.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0,
    });

    const corrected = completion.choices[0].message.content?.trim() || transcript;
    return NextResponse.json({ corrected });
  } catch (error: any) {
    console.error('Correction API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}