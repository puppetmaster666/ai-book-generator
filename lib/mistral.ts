/**
 * Mistral AI Client
 * OpenAI-compatible API for uncensored text generation.
 * Used for roast books and mature content where Gemini's safety filters block content.
 */

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_BASE_URL = 'https://api.mistral.ai/v1';

interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface MistralChatResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Generate text using Mistral's chat completions API.
 * Uses mistral-large-latest by default (best quality, least censored).
 */
export async function generateWithMistral(
  messages: MistralMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  }
): Promise<string> {
  if (!MISTRAL_API_KEY) {
    throw new Error('MISTRAL_API_KEY is not set');
  }

  const {
    model = 'mistral-large-latest',
    temperature = 0.8,
    maxTokens = 8192,
    topP = 0.95,
  } = options || {};

  // Prepend formatting rules as system message
  const formattedMessages: MistralMessage[] = [
    {
      role: 'system',
      content: 'FORMATTING RULE (STRICT): NEVER use em dashes or en dashes (the characters \u2014 and \u2013) anywhere in your output. Use commas, periods, semicolons, colons, or rewrite the sentence instead. Hyphens in compound words (like "well-known") are fine.',
    },
    ...messages,
  ];

  const res = await fetch(`${MISTRAL_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Mistral API error (${res.status}): ${errorText}`);
  }

  const data: MistralChatResponse = await res.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('Mistral returned no choices');
  }

  // Clean em/en dashes from output (in case model ignores the instruction)
  const content = data.choices[0].message.content
    .replace(/\u2014/g, ', ')  // em dash
    .replace(/\u2013/g, ', ')  // en dash
    .replace(/\s*[–—]\s*/g, ', ');
  console.log(`[Mistral] Generated ${data.usage.completion_tokens} tokens (model: ${model})`);

  return content;
}

/**
 * Generate a comic script using Mistral (uncensored).
 * Returns the raw text response for parsing.
 */
export async function generateRoastScript(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number }
): Promise<string> {
  return generateWithMistral(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    {
      temperature: options?.temperature ?? 0.9,
      maxTokens: options?.maxTokens ?? 8192,
    }
  );
}

/**
 * Generate JSON output from Mistral with retry on parse failure.
 */
export async function generateJsonWithMistral(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number; retries?: number }
): Promise<object> {
  const maxRetries = options?.retries ?? 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await generateWithMistral(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          temperature: options?.temperature ?? 0.7,
          maxTokens: options?.maxTokens ?? 8192,
        }
      );

      // Extract JSON from response (handle markdown code blocks)
      let cleaned = response
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Mistral response');
      }

      // Fix trailing commas
      cleaned = jsonMatch[0].replace(/,(\s*[}\]])/g, '$1');

      return JSON.parse(cleaned);
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(`[Mistral] JSON parse failed on attempt ${attempt + 1}, retrying...`);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Failed to generate valid JSON from Mistral');
}

/**
 * Check if Mistral is configured.
 */
export function isMistralConfigured(): boolean {
  return !!MISTRAL_API_KEY;
}
