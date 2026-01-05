import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Permissive safety settings to avoid false positives for creative writing
// We handle content moderation at the application level if needed
export const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// Content sanitization for safety filter retries
// When Gemini blocks content, we sanitize and retry with toned-down version
export function sanitizeContentForSafety(content: string): string {
  // Map of explicit terms to euphemisms - preserves story while reducing explicitness
  const replacements: [RegExp, string][] = [
    // Sexual/explicit terms -> euphemistic alternatives
    [/\bbuttplug\b/gi, 'intimate accessory'],
    [/\bbutt plug\b/gi, 'intimate accessory'],
    [/\banal plug\b/gi, 'personal accessory'],
    [/\bsex toy\b/gi, 'intimate item'],
    [/\bsextoy\b/gi, 'intimate item'],
    [/\bdildo\b/gi, 'personal toy'],
    [/\bvibrator\b/gi, 'personal massager'],
    [/\bfemboy\b/gi, 'androgynous person'],
    [/\bnaked\b/gi, 'undressed'],
    [/\bnude\b/gi, 'unclothed'],
    [/\borgasm\b/gi, 'climax'],
    [/\bcum\b/gi, 'release'],
    [/\bcumming\b/gi, 'releasing'],
    [/\berection\b/gi, 'arousal'],
    [/\berect\b/gi, 'aroused'],
    [/\bpenis\b/gi, 'intimate area'],
    [/\bcock\b/gi, 'member'],
    [/\bdick\b/gi, 'member'],
    [/\bvagina\b/gi, 'intimate area'],
    [/\bpussy\b/gi, 'intimate area'],
    [/\bbreasts?\b/gi, 'chest'],
    [/\bboobs?\b/gi, 'chest'],
    [/\bnipples?\b/gi, 'sensitive spots'],
    [/\bass\b/gi, 'bottom'],
    [/\bbutt\b/gi, 'bottom'],
    [/\bmasturbat\w+\b/gi, 'self-pleasure'],
    [/\bfuck\w*\b/gi, 'intimate'],
    [/\bsex\b/gi, 'intimacy'],
    [/\bsexual\b/gi, 'intimate'],
    [/\bsexually\b/gi, 'intimately'],
    [/\bintercourse\b/gi, 'intimacy'],
    [/\bmoan\w*\b/gi, 'sigh'],
    [/\bgroan\w*\b/gi, 'sound of pleasure'],
    [/\bthrust\w*\b/gi, 'move'],
    [/\bpenetrat\w+\b/gi, 'join'],
    [/\barouse\w*\b/gi, 'excite'],
    [/\barousal\b/gi, 'excitement'],
    [/\blust\b/gi, 'desire'],
    [/\bhorny\b/gi, 'desirous'],
    [/\bkink\w*\b/gi, 'preference'],
    [/\bfetish\w*\b/gi, 'interest'],
    [/\bbdsm\b/gi, 'power dynamics'],
    [/\bbondage\b/gi, 'restraint play'],
    [/\bsubmissive\b/gi, 'yielding'],
    [/\bdominant\b/gi, 'assertive'],
    [/\bslave\b/gi, 'devoted partner'],
    [/\bmaster\b/gi, 'leader'],
    [/\bstrip\w*\b/gi, 'undress'],
    [/\bseduct\w+\b/gi, 'attract'],
    [/\bexplicit\b/gi, 'detailed'],
    [/\berotic\b/gi, 'romantic'],
    [/\bpornograph\w+\b/gi, 'adult content'],
    [/\bporn\b/gi, 'adult content'],
    // Physical descriptions that might trigger filters
    [/\bwearing only\b/gi, 'dressed minimally in'],
    [/\bfullness\b/gi, 'sensation'],
    [/\bgrinding\b/gi, 'moving'],
    [/\brubbing\b/gi, 'touching'],
    [/\bstroking\b/gi, 'caressing'],
    [/\blicking\b/gi, 'kissing'],
    [/\bsucking\b/gi, 'kissing'],
    [/\bswallow\w*\b/gi, 'take'],
  ];

  let sanitized = content;
  for (const [pattern, replacement] of replacements) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

// Check if an error is a safety/content block error
export function isSafetyBlockError(error: unknown): boolean {
  const errorMsg = error instanceof Error ? error.message : String(error);
  return errorMsg.includes('PROHIBITED_CONTENT') ||
    errorMsg.includes('blocked') ||
    errorMsg.includes('safety') ||
    errorMsg.includes('SAFETY') ||
    errorMsg.includes('Prohibited Use') ||
    errorMsg.includes('content policy');
}
