import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Fallback to client-side generation
      return NextResponse.json({
        error: 'API key not configured',
        segments: createFallbackScript(prompt, duration)
      }, { status: 200 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a YouTube Shorts script writer. Create engaging, concise scripts optimized for vertical video format.',
          },
          {
            role: 'user',
            content: `Create a ${duration}-second YouTube Shorts script about: ${prompt}.

            Format the response as JSON with an array of segments. Each segment should have:
            - text: The script text for that segment (2-3 sentences max)
            - duration: How long this segment should last in seconds
            - keywords: Array of 2-3 keywords to find relevant video footage

            Make it engaging, dynamic, and perfect for short-form video. Total duration should be exactly ${duration} seconds.`,
          },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    let segments;
    try {
      const parsed = JSON.parse(content);
      segments = parsed.segments || parsed;
    } catch {
      segments = createFallbackScript(prompt, duration);
    }

    return NextResponse.json({ segments });

  } catch (error) {
    console.error('Error generating script:', error);
    const { prompt, duration } = await req.json();
    return NextResponse.json({
      segments: createFallbackScript(prompt, duration)
    });
  }
}

function createFallbackScript(prompt: string, duration: number) {
  const wordsPerSecond = 2.5;
  const totalWords = Math.floor(duration * wordsPerSecond);

  const segments = [];
  const segmentCount = Math.ceil(duration / 5);
  const segmentDuration = duration / segmentCount;

  const templates = [
    `Welcome to this amazing ${prompt}. Let's dive right in!`,
    `Here's what makes ${prompt} so special and unique.`,
    `You won't believe these incredible facts about ${prompt}.`,
    `This is the ultimate guide to ${prompt} you've been waiting for.`,
    `Transform your life with ${prompt} starting today.`,
  ];

  const keywords = extractKeywords(prompt);

  for (let i = 0; i < segmentCount; i++) {
    const text = templates[i % templates.length];
    segments.push({
      text,
      duration: segmentDuration,
      keywords,
    });
  }

  return segments;
}

function extractKeywords(prompt: string): string[] {
  const words = prompt.toLowerCase().split(/\s+/);
  const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'create', 'video', 'about'];
  return words.filter(word => !stopWords.includes(word) && word.length > 3).slice(0, 3);
}
