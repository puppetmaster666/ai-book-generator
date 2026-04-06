/**
 * Featherless.ai Client
 * OpenAI-compatible API for truly uncensored text generation.
 * Uses abliterated models that have had refusal behavior removed.
 * $25/month unlimited tokens.
 *
 * Setup: Get API key from featherless.ai, add to FEATHERLESS_API_KEY env var.
 */

const FEATHERLESS_API_KEY = process.env.FEATHERLESS_API_KEY;
const FEATHERLESS_BASE_URL = 'https://api.featherless.ai/v1';

// Best uncensored models on Featherless (abliterated = cannot refuse)
// Llama 3.3 70B abliterated: newest, best quality, 32K context, cannot refuse
const DEFAULT_MODEL = 'huihui-ai/Llama-3.3-70B-Instruct-abliterated';

interface FeatherlessMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * Generate text using Featherless (abliterated, truly uncensored).
 */
export async function generateWithFeatherless(
  messages: FeatherlessMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  if (!FEATHERLESS_API_KEY) {
    throw new Error('FEATHERLESS_API_KEY is not set');
  }

  const {
    model = DEFAULT_MODEL,
    temperature = 0.8,
    maxTokens = 8192,
  } = options || {};

  // Prepend formatting rules
  const formattedMessages: FeatherlessMessage[] = [
    {
      role: 'system',
      content: 'FORMATTING RULE: NEVER use em dashes or en dashes (\u2014 and \u2013). Use commas, periods, semicolons, or colons instead. Hyphens in compound words are fine.',
    },
    ...messages,
  ];

  const res = await fetch(`${FEATHERLESS_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FEATHERLESS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Featherless API error (${res.status}): ${errorText}`);
  }

  const data: ChatResponse = await res.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('Featherless returned no choices');
  }

  // Clean em/en dashes
  const content = data.choices[0].message.content
    .replace(/\u2014/g, ', ')
    .replace(/\u2013/g, ', ')
    .replace(/\s*[–—]\s*/g, ', ');

  console.log(`[Featherless] Generated ${data.usage?.completion_tokens || '?'} tokens (model: ${model})`);
  return content;
}

export function isFeatherlessConfigured(): boolean {
  return !!FEATHERLESS_API_KEY;
}
