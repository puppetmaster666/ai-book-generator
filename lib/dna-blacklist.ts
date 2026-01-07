/**
 * DNA Blacklist System
 *
 * Prevents cross-project template reuse by tracking character names,
 * locations, and other identifiers from previous projects.
 *
 * This ensures each screenplay/book has completely unique DNA.
 */

import { prisma } from '@/lib/db';

export type DNAType = 'character_name' | 'location' | 'organization' | 'catchphrase' | 'title';

export interface DNAEntry {
  id: string;
  userId: string;
  type: DNAType;
  value: string;
  normalizedValue: string; // Lowercase, trimmed for matching
  projectId: string;
  projectTitle: string;
  createdAt: Date;
}

// Maximum entries per user to prevent unbounded growth
const DNA_BLACKLIST_LIMIT = 100;

/**
 * Normalize a value for consistent matching
 */
function normalizeValue(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Add entries to the DNA blacklist for a user
 * Automatically prunes old entries beyond the limit
 */
export async function addToDNABlacklist(
  userId: string,
  projectId: string,
  projectTitle: string,
  entries: Array<{ type: DNAType; value: string }>
): Promise<number> {
  if (entries.length === 0) return 0;

  // Filter out empty or too-short values
  const validEntries = entries.filter(e => e.value && e.value.trim().length >= 2);

  if (validEntries.length === 0) return 0;

  // Create entries
  const created = await prisma.dNABlacklist.createMany({
    data: validEntries.map(entry => ({
      userId,
      type: entry.type,
      value: entry.value.trim(),
      normalizedValue: normalizeValue(entry.value),
      projectId,
      projectTitle,
    })),
    skipDuplicates: true,
  });

  // Prune old entries if over limit
  const totalCount = await prisma.dNABlacklist.count({ where: { userId } });

  if (totalCount > DNA_BLACKLIST_LIMIT) {
    // Delete oldest entries beyond limit
    const entriesToDelete = await prisma.dNABlacklist.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: totalCount - DNA_BLACKLIST_LIMIT,
      select: { id: true },
    });

    await prisma.dNABlacklist.deleteMany({
      where: { id: { in: entriesToDelete.map((e: { id: string }) => e.id) } },
    });
  }

  return created.count;
}

/**
 * Get the DNA blacklist for a user (excluding current project)
 */
export async function getDNABlacklist(
  userId: string,
  excludeProjectId?: string
): Promise<DNAEntry[]> {
  const entries = await prisma.dNABlacklist.findMany({
    where: {
      userId,
      ...(excludeProjectId ? { projectId: { not: excludeProjectId } } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  return entries as DNAEntry[];
}

/**
 * Check content against the DNA blacklist
 * Returns violations found
 */
export async function checkAgainstBlacklist(
  content: string,
  userId: string,
  excludeProjectId?: string
): Promise<{
  violations: Array<{
    type: DNAType;
    value: string;
    projectTitle: string;
    context: string;
  }>;
  isClean: boolean;
}> {
  const blacklist = await getDNABlacklist(userId, excludeProjectId);
  const violations: Array<{
    type: DNAType;
    value: string;
    projectTitle: string;
    context: string;
  }> = [];

  const normalizedContent = content.toLowerCase();

  for (const entry of blacklist) {
    // Check if the blacklisted value appears in content
    const index = normalizedContent.indexOf(entry.normalizedValue);

    if (index !== -1) {
      // Extract context around the match
      const start = Math.max(0, index - 30);
      const end = Math.min(content.length, index + entry.normalizedValue.length + 30);
      const context = content.slice(start, end);

      violations.push({
        type: entry.type as DNAType,
        value: entry.value,
        projectTitle: entry.projectTitle,
        context: `...${context}...`,
      });
    }
  }

  return {
    violations,
    isClean: violations.length === 0,
  };
}

/**
 * Generate a blacklist section for injection into generation prompts
 */
export function generateBlacklistPromptSection(blacklist: DNAEntry[]): string {
  if (blacklist.length === 0) {
    return '';
  }

  // Group by type for cleaner formatting
  const grouped: Record<DNAType, string[]> = {
    character_name: [],
    location: [],
    organization: [],
    catchphrase: [],
    title: [],
  };

  for (const entry of blacklist) {
    grouped[entry.type as DNAType]?.push(entry.value);
  }

  const sections: string[] = [];

  if (grouped.character_name.length > 0) {
    sections.push(`BANNED CHARACTER NAMES: ${grouped.character_name.join(', ')}`);
  }
  if (grouped.location.length > 0) {
    sections.push(`BANNED LOCATIONS: ${grouped.location.join(', ')}`);
  }
  if (grouped.organization.length > 0) {
    sections.push(`BANNED ORGANIZATIONS: ${grouped.organization.join(', ')}`);
  }
  if (grouped.catchphrase.length > 0) {
    sections.push(`BANNED PHRASES: ${grouped.catchphrase.join(', ')}`);
  }

  return `
=== DNA BLACKLIST (HARD REJECT) ===
The following names/locations/phrases were used in the user's previous projects.
Using ANY of these triggers automatic regeneration. Create COMPLETELY ORIGINAL alternatives.

${sections.join('\n')}

This prevents template reuse and ensures unique creative DNA for each project.
`;
}

/**
 * Extract DNA from a screenplay/book outline and add to blacklist
 * Call this after outline generation is complete
 */
export async function extractAndBlacklistFromOutline(
  userId: string,
  projectId: string,
  projectTitle: string,
  outline: {
    characters?: Array<{ name: string; role?: string }>;
    setting?: string;
    locations?: string[];
    organizations?: string[];
  }
): Promise<number> {
  const entries: Array<{ type: DNAType; value: string }> = [];

  // Extract character names
  if (outline.characters) {
    for (const char of outline.characters) {
      if (char.name && char.name.trim().length >= 2) {
        entries.push({ type: 'character_name', value: char.name });

        // Also extract first names and last names separately
        const nameParts = char.name.split(' ').filter(p => p.length >= 2);
        for (const part of nameParts) {
          // Only add if it's not a common word
          if (!isCommonWord(part)) {
            entries.push({ type: 'character_name', value: part });
          }
        }
      }
    }
  }

  // Extract setting/primary location
  if (outline.setting && outline.setting.trim().length >= 3) {
    entries.push({ type: 'location', value: outline.setting });
  }

  // Extract locations
  if (outline.locations) {
    for (const loc of outline.locations) {
      if (loc && loc.trim().length >= 3) {
        entries.push({ type: 'location', value: loc });
      }
    }
  }

  // Extract organizations
  if (outline.organizations) {
    for (const org of outline.organizations) {
      if (org && org.trim().length >= 3) {
        entries.push({ type: 'organization', value: org });
      }
    }
  }

  // Add project title to prevent reuse
  if (projectTitle && projectTitle.trim().length >= 3) {
    entries.push({ type: 'title', value: projectTitle });
  }

  return addToDNABlacklist(userId, projectId, projectTitle, entries);
}

/**
 * Extract DNA from screenplay characters specifically
 */
export async function extractAndBlacklistFromCharacters(
  userId: string,
  projectId: string,
  projectTitle: string,
  characters: Array<{
    name: string;
    archetype?: string;
    background?: string;
    quirks?: string[];
    catchphrases?: string[];
  }>
): Promise<number> {
  const entries: Array<{ type: DNAType; value: string }> = [];

  for (const char of characters) {
    // Character name
    if (char.name && char.name.trim().length >= 2) {
      entries.push({ type: 'character_name', value: char.name });

      // Extract name parts
      const nameParts = char.name.split(' ').filter(p => p.length >= 2);
      for (const part of nameParts) {
        if (!isCommonWord(part)) {
          entries.push({ type: 'character_name', value: part });
        }
      }
    }

    // Catchphrases (unique verbal signatures)
    if (char.catchphrases) {
      for (const phrase of char.catchphrases) {
        if (phrase && phrase.trim().length >= 5) {
          entries.push({ type: 'catchphrase', value: phrase });
        }
      }
    }
  }

  return addToDNABlacklist(userId, projectId, projectTitle, entries);
}

/**
 * Clear blacklist entries for a specific project
 * Use when a project is deleted
 */
export async function clearProjectFromBlacklist(projectId: string): Promise<number> {
  const result = await prisma.dNABlacklist.deleteMany({
    where: { projectId },
  });

  return result.count;
}

/**
 * Clear entire blacklist for a user
 * Use with caution - only for user account deletion or explicit reset
 */
export async function clearUserBlacklist(userId: string): Promise<number> {
  const result = await prisma.dNABlacklist.deleteMany({
    where: { userId },
  });

  return result.count;
}

// Common words to exclude from blacklist (too generic)
const COMMON_WORDS = new Set([
  'the', 'and', 'but', 'for', 'not', 'you', 'all', 'can', 'had', 'her',
  'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
  'its', 'may', 'new', 'now', 'old', 'see', 'way', 'who', 'boy', 'did',
  'man', 'men', 'she', 'two', 'let', 'put', 'say', 'too', 'use', 'dad',
  'mom', 'son', 'sir', 'mrs', 'miss', 'dr', 'mr', 'ms', 'jr', 'sr',
  'john', 'james', 'mary', 'david', 'michael', 'sarah', 'anna', 'tom',
  'jack', 'sam', 'kate', 'jane', 'bob', 'joe', 'bill', 'mike', 'dan',
]);

function isCommonWord(word: string): boolean {
  return COMMON_WORDS.has(word.toLowerCase());
}
