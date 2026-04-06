/**
 * Roast Idea Generator API
 * POST /api/roast/generate-idea
 *
 * Generates creative roast scenarios/ideas for a character using Mistral.
 * Costs 5 credits per idea. Returns 3 ideas per call.
 *
 * Falls back to Gemini if Mistral is not configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { generateWithMistral, isMistralConfigured } from '@/lib/mistral';

const IDEA_CREDIT_COST = 10;
const IDEAS_PER_CALL = 3;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Sign in to generate roast ideas' }, { status: 401 });
    }

    const body = await request.json();
    const { characterName, personality, severity } = body as {
      characterName: string;
      personality?: string;
      severity: number;
    };

    if (!characterName || !characterName.trim()) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 });
    }

    // Check credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { creditBalance: true, freeCredits: true, credits: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const totalCredits = (user.creditBalance || 0) + (user.freeCredits || 0) + (user.credits || 0);
    if (totalCredits < IDEA_CREDIT_COST) {
      return NextResponse.json({
        error: `Not enough credits. Need ${IDEA_CREDIT_COST} credits, you have ${totalCredits}.`,
        creditsNeeded: IDEA_CREDIT_COST,
        creditsAvailable: totalCredits,
      }, { status: 402 });
    }

    // Generate ideas
    const severityLabel = severity === 1 ? 'friendly' : severity === 2 ? 'spicy' : severity === 3 ? 'brutal' : 'nuclear (18+, completely unhinged)';

    const nuclearGuidance = severity === 4 ? `
For NUCLEAR ideas: these should be the most degrading, embarrassing, explicit scenarios possible.
- Include sexual humiliation, nudity, caught in compromising positions
- Drug/alcohol disasters, public meltdowns, bathroom catastrophes
- Failed romantic encounters, getting rejected in the most public way
- Body humor, wardrobe malfunctions, getting exposed
- Nothing is off limits. The more humiliating the better.
- But each idea should be FUNNY, not just shocking.` : '';

    const prompt = `Generate ${IDEAS_PER_CALL} creative roast comic scenarios for a person named ${characterName.trim()}.
${personality ? `Their personality: ${personality}` : ''}
Meanness level: ${severityLabel}
${nuclearGuidance}

Each scenario should be a 2-3 sentence pitch for a 12-panel comic that roasts ${characterName.trim()} through embarrassing situations. The scenarios should be SPECIFIC to their personality, not generic.

Rules:
- Each scenario should put ${characterName.trim()} in a different setting/situation
- The humor should come from their personality flaws being exposed
- Include a hint of what the most embarrassing moment would be
- Write like a funny friend pitching ideas, not like a formal synopsis
- Each idea should make someone go "oh my god yes, do that one"

Output ONLY a JSON array of ${IDEAS_PER_CALL} strings, each being one scenario idea:
["scenario 1 text", "scenario 2 text", "scenario 3 text"]`;

    let ideas: string[];

    if (isMistralConfigured()) {
      const response = await generateWithMistral(
        [
          { role: 'system', content: 'You generate creative comedy scenarios. Output valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        { temperature: 0.95, maxTokens: 2000 }
      );

      // Parse the JSON array
      const cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Failed to parse ideas from Mistral');
      ideas = JSON.parse(match[0]) as string[];
    } else {
      // Fallback to Gemini
      const { getGeminiFlash } = await import('@/lib/generation/shared/api-client');
      const result = await getGeminiFlash().generateContent(prompt);
      const response = result.response.text() || '';
      const cleaned = response.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Failed to parse ideas from Gemini');
      ideas = JSON.parse(match[0]) as string[];
    }

    // Validate
    if (!Array.isArray(ideas) || ideas.length === 0) {
      throw new Error('No ideas generated');
    }
    ideas = ideas.filter(i => typeof i === 'string' && i.trim().length > 10).slice(0, IDEAS_PER_CALL);

    // Deduct credits
    if (user.creditBalance >= IDEA_CREDIT_COST) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { creditBalance: { decrement: IDEA_CREDIT_COST } },
      });
    } else if (user.freeCredits >= IDEA_CREDIT_COST) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { freeCredits: { decrement: IDEA_CREDIT_COST } },
      });
    } else {
      // Split across credit types
      const fromBalance = Math.min(user.creditBalance, IDEA_CREDIT_COST);
      const fromFree = IDEA_CREDIT_COST - fromBalance;
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          creditBalance: { decrement: fromBalance },
          freeCredits: { decrement: fromFree },
        },
      });
    }

    console.log(`[RoastIdeas] Generated ${ideas.length} ideas for "${characterName}" (severity ${severity}), charged ${IDEA_CREDIT_COST} credits`);

    return NextResponse.json({
      ideas,
      creditsUsed: IDEA_CREDIT_COST,
      creditsRemaining: totalCredits - IDEA_CREDIT_COST,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RoastIdeas] Error:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
