// Check if JSON appears to be truncated (incomplete)
export function isJSONTruncated(response: string): boolean {
  const cleaned = response
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Count opening and closing braces/brackets
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escapeNext = false;

  for (const char of cleaned) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
    }
  }

  // If we're still inside a string or have unbalanced braces, it's truncated
  return inString || braceCount !== 0 || bracketCount !== 0;
}

// Recursively clean en/em dashes from all string values in an object
export function cleanDashesFromObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    // Replace en dash (–), em dash (—), and spaced hyphens with comma or appropriate punctuation
    return obj
      .replace(/\s*[–—]\s*/g, ', ')
      .replace(/\s+-\s+/g, ', ')
      .trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanDashesFromObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanDashesFromObject(value);
    }
    return cleaned;
  }
  return obj;
}

// Helper to clean and parse JSON from LLM responses
export function parseJSONFromResponse(response: string): object {
  console.log('Raw LLM response length:', response.length);
  console.log('Raw LLM response start:', response.substring(0, 300));
  console.log('Raw LLM response end:', response.substring(response.length - 200));

  // Check for truncation before attempting parse
  if (isJSONTruncated(response)) {
    console.warn('[JSON] Truncated response detected (unbalanced braces/brackets) - will retry');
    console.warn('[JSON] Response ends with:', response.substring(response.length - 500));
    throw new Error('JSON_TRUNCATED: Response was cut off before completion');
  }

  // Remove markdown code blocks if present
  let cleaned = response
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Extract JSON object or array
  const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('No JSON found. Full response:', response);
    throw new Error('No JSON found in response');
  }

  cleaned = jsonMatch[0];

  // Fix common LLM JSON errors
  cleaned = cleaned
    // Fix trailing commas before } or ]
    .replace(/,(\s*[}\]])/g, '$1');

  try {
    const parsed = JSON.parse(cleaned);
    return cleanDashesFromObject(parsed) as object;
  } catch (e) {
    // Try with newline cleanup
    cleaned = cleaned.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    try {
      const parsed = JSON.parse(cleaned);
      return cleanDashesFromObject(parsed) as object;
    } catch (e2) {
      console.error('JSON parse failed. Cleaned:', cleaned.substring(0, 1500));
      throw e2;
    }
  }
}

// Check if text ends with proper punctuation (complete sentence)
export function isCompleteSentence(text: string): boolean {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) && trimmed.length > 50;
}
