/**
 * Character Fact-Lock System
 *
 * Prevents character fact drift during generation:
 * - Age changes (character ages or de-ages mid-story)
 * - Status amnesia (forgetting injuries, emotional states)
 * - Relationship drift (forgetting who knows what)
 * - Location teleportation (character appears somewhere without traveling)
 *
 * Facts are LOCKED and validated after each beat generation.
 */

export interface CharacterFact {
  name: string;
  aliases: string[];              // Nicknames, titles ("Dr. Smith", "Mom")
  gender: 'male' | 'female' | 'nonbinary' | 'unknown';
  age: number | null;             // null if not specified
  ageDescriptor?: string;         // "elderly", "teenage", "middle-aged"
  status: string;                 // Current physical/emotional state
  location: string;               // Where they are right now
  knows: string[];                // What they know (plot-critical secrets)
  doesNotKnow: string[];          // What they explicitly DON'T know yet
  wounds: string[];               // Injuries that persist
  conditions: string[];           // Ongoing conditions (blind, pregnant, etc.)
  relationships: Record<string, string>;  // {"Maya": "estranged daughter"}
  lastAction?: string;            // What they were doing when last seen
  traits: string[];               // Personality traits for consistency
  speechPattern?: string;         // How they talk (formal, slang, accent)
}

export interface CharacterFactSheet {
  characters: Record<string, CharacterFact>;
  sceneParticipants: string[];    // Who is in the current scene
  lastUpdated: string;            // ISO timestamp
}

export interface FactViolation {
  characterName: string;
  violationType: 'age' | 'wound' | 'location' | 'knowledge' | 'relationship' | 'status';
  expected: string;
  found: string;
  severity: 'error' | 'warning';
  suggestion: string;
}

/**
 * Build the immutable fact sheet to inject into generation prompts.
 * This is prepended to every beat generation.
 */
export function buildCharacterFactSheet(
  characters: Record<string, CharacterFact>,
  sceneParticipants?: string[]
): string {
  const participants = sceneParticipants || Object.keys(characters);

  let sheet = `
=== IMMUTABLE CHARACTER FACTS ===
These facts are LOCKED. You CANNOT change, summarize, or contradict them.
If your generation contradicts these facts, it will be REJECTED.

`;

  for (const name of participants) {
    const facts = characters[name];
    if (!facts) continue;

    sheet += `${name.toUpperCase()}:\n`;

    // Age (critical - AI loves to drift ages)
    if (facts.age !== null) {
      sheet += `  - Age: ${facts.age} years old (FIXED - do not change)\n`;
    } else if (facts.ageDescriptor) {
      sheet += `  - Age: ${facts.ageDescriptor} (do not contradict)\n`;
    }

    // Gender (for pronoun consistency)
    if (facts.gender !== 'unknown') {
      const pronouns = {
        male: 'he/him',
        female: 'she/her',
        nonbinary: 'they/them',
      };
      sheet += `  - Pronouns: ${pronouns[facts.gender]}\n`;
    }

    // Current status
    if (facts.status) {
      sheet += `  - Current Status: ${facts.status}\n`;
    }

    // Location (prevents teleportation)
    if (facts.location) {
      sheet += `  - Current Location: ${facts.location}\n`;
    }

    // Wounds/injuries (critical - can't run with leg wound)
    if (facts.wounds.length > 0) {
      sheet += `  - ACTIVE INJURIES: ${facts.wounds.join(', ')}\n`;
      sheet += `    (Character CANNOT perform actions contradicting these injuries)\n`;
    }

    // Conditions
    if (facts.conditions.length > 0) {
      sheet += `  - Conditions: ${facts.conditions.join(', ')}\n`;
    }

    // What they know
    if (facts.knows.length > 0) {
      sheet += `  - KNOWS: ${facts.knows.join('; ')}\n`;
    }

    // What they DON'T know (prevents premature reveals)
    if (facts.doesNotKnow.length > 0) {
      sheet += `  - DOES NOT KNOW: ${facts.doesNotKnow.join('; ')}\n`;
      sheet += `    (Character cannot reference or act on this information)\n`;
    }

    // Relationships
    if (Object.keys(facts.relationships).length > 0) {
      const rels = Object.entries(facts.relationships)
        .map(([person, relation]) => `${person} (${relation})`)
        .join(', ');
      sheet += `  - Relationships: ${rels}\n`;
    }

    // Speech pattern
    if (facts.speechPattern) {
      sheet += `  - Speech: ${facts.speechPattern}\n`;
    }

    sheet += '\n';
  }

  return sheet;
}

/**
 * Validate generated text against character facts.
 * Returns violations found in the text.
 */
export function validateCharacterConsistency(
  text: string,
  characters: Record<string, CharacterFact>
): { valid: boolean; violations: FactViolation[] } {
  const violations: FactViolation[] = [];

  for (const [name, facts] of Object.entries(characters)) {
    // Skip if character not mentioned in text
    if (!new RegExp(`\\b${escapeRegex(name)}\\b`, 'i').test(text)) {
      continue;
    }

    // 1. Check for age changes
    if (facts.age !== null) {
      const agePatterns = [
        new RegExp(`${escapeRegex(name)}[^.]*?(\\d{1,3})[-\\s]?year[-\\s]?old`, 'gi'),
        new RegExp(`${escapeRegex(name)}[^.]*?aged?\\s+(\\d{1,3})`, 'gi'),
        new RegExp(`${escapeRegex(name)}[^.]*?was\\s+(\\d{1,3})`, 'gi'),
      ];

      for (const pattern of agePatterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          const mentionedAge = parseInt(match[1]);
          if (!isNaN(mentionedAge) && Math.abs(mentionedAge - facts.age) > 2) {
            violations.push({
              characterName: name,
              violationType: 'age',
              expected: `${facts.age} years old`,
              found: `${mentionedAge} years old`,
              severity: 'error',
              suggestion: `Fix: "${name}" is ${facts.age} years old, not ${mentionedAge}.`,
            });
          }
        }
      }
    }

    // 2. Check for wound violations (can't run with leg wound)
    const legWounds = facts.wounds.filter(w =>
      /leg|thigh|knee|ankle|foot|hip/i.test(w)
    );
    if (legWounds.length > 0) {
      const runningActions = [
        /\b(ran|run|running|sprinted|sprinting|dashed|dashing|raced|racing|jogged|jogging)\b/i,
        /\b(kicked|kicking|jumped|jumping|leaped|leaping)\b/i,
      ];

      for (const actionPattern of runningActions) {
        // Check if character is doing this action
        const charActionPattern = new RegExp(
          `${escapeRegex(name)}[^.]{0,50}${actionPattern.source}|` +
          `${actionPattern.source}[^.]{0,50}${escapeRegex(name)}`,
          'i'
        );

        if (charActionPattern.test(text)) {
          violations.push({
            characterName: name,
            violationType: 'wound',
            expected: `Limited mobility due to: ${legWounds.join(', ')}`,
            found: `Character performing running/jumping actions`,
            severity: 'error',
            suggestion: `Fix: "${name}" has ${legWounds[0]} and cannot run/sprint/jump. Use limping, hobbling, or assisted movement.`,
          });
        }
      }
    }

    // 3. Check for arm/hand wounds
    const armWounds = facts.wounds.filter(w =>
      /arm|hand|wrist|shoulder|finger/i.test(w)
    );
    if (armWounds.length > 0) {
      const armActions = [
        /\b(grabbed|gripped|clutched|seized|punched|punching)\b/i,
        /\b(lifted heavy|carried|hauled|dragged)\b/i,
      ];

      for (const actionPattern of armActions) {
        const charActionPattern = new RegExp(
          `${escapeRegex(name)}[^.]{0,50}${actionPattern.source}`,
          'i'
        );

        if (charActionPattern.test(text)) {
          violations.push({
            characterName: name,
            violationType: 'wound',
            expected: `Limited arm use due to: ${armWounds.join(', ')}`,
            found: `Character using injured arm normally`,
            severity: 'warning',
            suggestion: `Consider: "${name}" has ${armWounds[0]}. Show difficulty or use other arm.`,
          });
        }
      }
    }

    // 4. Check knowledge violations (character reveals what they don't know)
    for (const secret of facts.doesNotKnow) {
      // Look for character stating or revealing the secret
      const secretWords = secret.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      const significantWord = secretWords[0] || secret.split(/\s+/)[0];

      const revealPattern = new RegExp(
        `${escapeRegex(name)}[^.]*?(said|told|knew|realized|understood|revealed)[^.]*${escapeRegex(significantWord)}`,
        'i'
      );

      if (revealPattern.test(text)) {
        violations.push({
          characterName: name,
          violationType: 'knowledge',
          expected: `Does not know: ${secret}`,
          found: `Character appears to reference this knowledge`,
          severity: 'warning',
          suggestion: `Check: "${name}" should not know "${secret}" yet.`,
        });
      }
    }

    // 5. Check for location teleportation
    if (facts.location && facts.lastAction) {
      // If character was in location A doing action B, they can't suddenly be elsewhere
      // This is a soft check - just flag potential issues
      const differentLocationIndicators = [
        /\b(across town|at the|arrived at|reached the|entered the)\b/i,
      ];

      // Only flag if there's a sudden location shift without transition
      const textStart = text.slice(0, 200);
      for (const pattern of differentLocationIndicators) {
        if (pattern.test(textStart) && !textStart.toLowerCase().includes(facts.location.toLowerCase())) {
          // Check if there's travel mentioned
          const travelWords = /\b(drove|walked|ran|flew|traveled|went|headed|made (his|her|their) way)\b/i;
          if (!travelWords.test(textStart)) {
            violations.push({
              characterName: name,
              violationType: 'location',
              expected: `Was at: ${facts.location}`,
              found: `Appears in different location without transition`,
              severity: 'warning',
              suggestion: `Consider: Show "${name}" traveling from ${facts.location} or explain the time skip.`,
            });
          }
        }
      }
    }
  }

  return {
    valid: violations.filter(v => v.severity === 'error').length === 0,
    violations,
  };
}

/**
 * Update character facts based on events in the beat.
 * Call this after a beat is validated and accepted.
 */
export function updateCharacterFacts(
  currentFacts: Record<string, CharacterFact>,
  beatContent: string,
  explicitUpdates?: Partial<Record<string, Partial<CharacterFact>>>
): Record<string, CharacterFact> {
  const updated = JSON.parse(JSON.stringify(currentFacts)) as Record<string, CharacterFact>;

  // Apply explicit updates first (from outline/chapter plan)
  if (explicitUpdates) {
    for (const [name, updates] of Object.entries(explicitUpdates)) {
      if (updated[name]) {
        Object.assign(updated[name], updates);
      }
    }
  }

  // Auto-detect some changes from text (conservative - only clear signals)
  for (const [name, facts] of Object.entries(updated)) {
    // Detect death
    if (new RegExp(`${escapeRegex(name)}[^.]*?(died|was killed|passed away|took (his|her|their) last breath)`, 'i').test(beatContent)) {
      facts.status = 'deceased';
      facts.wounds = [];
      facts.conditions = ['deceased'];
    }

    // Detect new injuries (add to wounds, don't replace)
    const injuryPatterns = [
      /\b(shot|stabbed|cut|wounded|injured)\s+in\s+(the\s+)?(leg|arm|chest|head|shoulder|hand|thigh)/gi,
      /\b(broke|fractured|sprained)\s+(his|her|their)\s+(leg|arm|wrist|ankle|finger)/gi,
    ];

    for (const pattern of injuryPatterns) {
      const matches = [...beatContent.matchAll(pattern)];
      for (const match of matches) {
        // Check if this is about our character (within reasonable distance)
        const context = beatContent.slice(
          Math.max(0, beatContent.indexOf(match[0]) - 100),
          beatContent.indexOf(match[0]) + match[0].length + 50
        );

        if (new RegExp(`\\b${escapeRegex(name)}\\b`, 'i').test(context)) {
          const newWound = match[0].toLowerCase();
          if (!facts.wounds.some(w => w.toLowerCase().includes(newWound))) {
            facts.wounds.push(newWound);
          }
        }
      }
    }

    // Detect location changes (only if explicit)
    const locationPattern = new RegExp(
      `${escapeRegex(name)}[^.]*?(arrived at|entered|reached|went to|was at)\\s+(the\\s+)?([^.]{5,30})`,
      'i'
    );
    const locationMatch = beatContent.match(locationPattern);
    if (locationMatch) {
      facts.location = locationMatch[3].trim().replace(/[.,;:!?]$/, '');
    }
  }

  return updated;
}

/**
 * Create initial character facts from book character data.
 */
export function createCharacterFactsFromDescription(
  characters: Array<{ name: string; description: string; role?: string }>
): Record<string, CharacterFact> {
  const facts: Record<string, CharacterFact> = {};

  for (const char of characters) {
    const desc = char.description.toLowerCase();

    // Extract gender
    let gender: CharacterFact['gender'] = 'unknown';
    if (/\b(he|him|his|man|boy|male|father|brother|son|husband)\b/.test(desc)) {
      gender = 'male';
    } else if (/\b(she|her|hers|woman|girl|female|mother|sister|daughter|wife)\b/.test(desc)) {
      gender = 'female';
    } else if (/\b(they|them|their|nonbinary|non-binary)\b/.test(desc)) {
      gender = 'nonbinary';
    }

    // Extract age
    let age: number | null = null;
    let ageDescriptor: string | undefined;
    const ageMatch = desc.match(/(\d{1,3})[-\s]?year[-\s]?old/);
    if (ageMatch) {
      age = parseInt(ageMatch[1]);
    } else {
      // Look for age descriptors
      if (/\b(elderly|old|aged|senior|retired)\b/.test(desc)) {
        ageDescriptor = 'elderly';
      } else if (/\b(middle[-\s]?aged|forties|fifties)\b/.test(desc)) {
        ageDescriptor = 'middle-aged';
      } else if (/\b(young|youthful|twenties|thirties)\b/.test(desc)) {
        ageDescriptor = 'young adult';
      } else if (/\b(teen|teenage|adolescent)\b/.test(desc)) {
        ageDescriptor = 'teenager';
      } else if (/\b(child|kid|young|little)\b/.test(desc)) {
        ageDescriptor = 'child';
      }
    }

    // Extract epithets (for pronoun replacement later)
    const epithets: string[] = [];
    const titleMatch = char.description.match(/\b(Dr\.|Doctor|Detective|Captain|Professor|Officer|Agent|Mr\.|Mrs\.|Ms\.)\s+\w+/);
    if (titleMatch) {
      epithets.push(titleMatch[0]);
    }
    if (char.role) {
      epithets.push(`the ${char.role.toLowerCase()}`);
    }

    // Extract traits
    const traitWords = desc.match(/\b(brave|cautious|cynical|optimistic|stubborn|kind|cruel|clever|naive|ambitious|lazy|loyal|treacherous)\b/gi) || [];

    facts[char.name] = {
      name: char.name,
      aliases: epithets,
      gender,
      age,
      ageDescriptor,
      status: 'alive',
      location: 'unknown',
      knows: [],
      doesNotKnow: [],
      wounds: [],
      conditions: [],
      relationships: {},
      traits: [...new Set(traitWords.map(t => t.toLowerCase()))],
    };
  }

  return facts;
}

// Helper function
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Note: CharacterFact, CharacterFactSheet, and FactViolation are exported at their definitions
