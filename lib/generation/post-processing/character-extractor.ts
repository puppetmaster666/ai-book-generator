/**
 * Character Extractor - Gender and Epithet Extraction
 *
 * Extracts character information from descriptions for pronoun replacement:
 * - Gender (for correct pronoun: he/she/they)
 * - Epithets ("the detective", "the older woman", "the sergeant")
 * - Titles (Dr., Captain, Professor)
 *
 * This runs ONCE when a book is created, not during generation.
 */

export interface CharacterInfo {
  name: string;
  firstName: string;                    // First name only (for variety)
  gender: 'male' | 'female' | 'nonbinary' | 'unknown';
  pronouns: {
    subject: string;                    // he, she, they
    object: string;                     // him, her, them
    possessive: string;                 // his, her, their
    possessivePronoun: string;          // his, hers, theirs
    reflexive: string;                  // himself, herself, themselves
  };
  epithets: string[];                   // "the detective", "the older woman"
  titles: string[];                     // "Dr.", "Captain"
  roleDescriptor?: string;              // "protagonist", "antagonist", "mentor"
  ageGroup?: 'child' | 'teen' | 'young_adult' | 'adult' | 'middle_aged' | 'elderly';
}

export interface CharacterExtractionResult {
  characters: CharacterInfo[];
  extractionNotes: string[];            // Any ambiguities or assumptions made
}

/**
 * Extract character info from a list of characters with descriptions.
 */
export function extractCharacterInfo(
  characters: Array<{ name: string; description: string; role?: string }>
): CharacterExtractionResult {
  const results: CharacterInfo[] = [];
  const notes: string[] = [];

  for (const char of characters) {
    const info = extractSingleCharacter(char.name, char.description, char.role);
    results.push(info.character);
    notes.push(...info.notes);
  }

  return {
    characters: results,
    extractionNotes: notes,
  };
}

/**
 * Extract info from a single character.
 */
function extractSingleCharacter(
  name: string,
  description: string,
  role?: string
): { character: CharacterInfo; notes: string[] } {
  const notes: string[] = [];
  const descLower = description.toLowerCase();

  // Extract first name
  const firstName = extractFirstName(name);

  // Detect gender
  const gender = detectGender(descLower, name);
  if (gender === 'unknown') {
    notes.push(`Could not determine gender for "${name}" - defaulting to "they/them"`);
  }

  // Get pronouns based on gender
  const pronouns = getPronouns(gender);

  // Extract epithets
  const epithets = extractEpithets(name, description, role);

  // Extract titles
  const titles = extractTitles(name, description);

  // Detect age group
  const ageGroup = detectAgeGroup(descLower);

  return {
    character: {
      name,
      firstName,
      gender,
      pronouns,
      epithets,
      titles,
      roleDescriptor: role?.toLowerCase(),
      ageGroup,
    },
    notes,
  };
}

/**
 * Extract the first name from a full name.
 */
function extractFirstName(fullName: string): string {
  // Handle titles
  const withoutTitle = fullName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.|Miss|Professor|Captain|Detective|Officer|Agent)\s+/i, '');

  // Get first word
  const parts = withoutTitle.trim().split(/\s+/);
  return parts[0] || fullName;
}

/**
 * Detect gender from description.
 */
function detectGender(description: string, name: string): CharacterInfo['gender'] {
  // Direct pronoun mentions
  const femalePronouns = /\b(she|her|hers|herself)\b/i;
  const malePronouns = /\b(he|him|his|himself)\b/i;
  const nonbinaryPronouns = /\b(they|them|their|theirs|themselves|nonbinary|non-binary|enby)\b/i;

  // Check for explicit pronoun usage
  if (femalePronouns.test(description)) {
    return 'female';
  }
  if (malePronouns.test(description)) {
    return 'male';
  }
  if (nonbinaryPronouns.test(description)) {
    return 'nonbinary';
  }

  // Gender-indicating words
  const femaleWords = /\b(woman|girl|female|mother|sister|daughter|wife|aunt|grandmother|queen|princess|lady|maiden|actress|waitress|hostess)\b/i;
  const maleWords = /\b(man|boy|male|father|brother|son|husband|uncle|grandfather|king|prince|gentleman|actor|waiter|host)\b/i;

  if (femaleWords.test(description)) {
    return 'female';
  }
  if (maleWords.test(description)) {
    return 'male';
  }

  // Common name patterns (fallback heuristic)
  const femaleNames = /^(Mary|Sarah|Emma|Anna|Maria|Elizabeth|Jennifer|Jessica|Ashley|Amanda|Stephanie|Nicole|Michelle|Laura|Emily|Rebecca|Rachel|Katherine|Christine|Diana|Victoria|Sophia|Isabella|Olivia|Ava|Mia|Charlotte|Amelia|Harper|Luna|Camila|Aria|Scarlett|Violet|Grace|Chloe|Lily|Eleanor|Hannah|Natalie|Zoe|Lillian|Ellie|Stella|Hazel|Aurora|Nora|Riley|Savannah|Brooklyn|Leah|Audrey|Claire|Bella|Lucy|Skylar|Paisley|Evelyn|Anna|Caroline|Maya|Genesis|Madeline|Ruby|Piper|Willow|Naomi|Elena|Quinn|Sadie|Alice|Hailey|Eva|Kinsley|Nevaeh|Gabriella|Valentina|Ivy|Ariana|Aurora|Lydia|Jade|Julia|Emilia|Delilah|Madelyn|Peyton|Kennedy|Clara|Sydney|Brianna|Autumn|Alyssa|Aubrey|Serenity|Alexa)\b/i;
  const maleNames = /^(James|John|Robert|Michael|William|David|Richard|Joseph|Thomas|Christopher|Daniel|Matthew|Anthony|Donald|Mark|Paul|Steven|Andrew|Joshua|Kenneth|Kevin|Brian|George|Edward|Ronald|Timothy|Jason|Jeffrey|Ryan|Jacob|Gary|Nicholas|Eric|Stephen|Jonathan|Larry|Justin|Scott|Brandon|Benjamin|Samuel|Raymond|Gregory|Frank|Alexander|Patrick|Jack|Dennis|Jerry|Tyler|Aaron|Jose|Adam|Nathan|Zachary|Henry|Douglas|Peter|Kyle|Noah|Walter|Ethan|Jeremy|Harold|Keith|Christian|Roger|Noah|Gerald|Carl|Terry|Sean|Austin|Arthur|Lawrence|Dylan|Jesse|Jordan|Bryan|Billy|Bruce|Gabriel|Joe|Logan|Albert|Willie|Alan|Eugene|Russell|Vincent|Philip|Bobby|Johnny|Bradley|Roy|Harry|Dylan|Caleb|Isaiah|Landon|Isaac|Jaxon|Hunter|Liam|Mason|Lucas|Aiden|Oliver|Elijah|Grayson|Carter|Sebastian|Cameron|Jayden|Luke|Owen|Wyatt|Jack|Julian|Levi|Connor|Asher|Eli|Lincoln|Nathan|Aaron|Adrian|Cooper|Ezra|Jeremiah|Easton|Colton|Leo|Jordan|Parker|Hudson|Evan|Jose|Brayden|Ian|Ayden|Jace|Nolan|Adam|Axel|Dominic|Jonathan|Gavin|Max|Kayden|Chase|Harrison|Ivan|Kaden|Kai|Emmett|Maverick|Leo|Declan|Weston|Micah|Antonio|George|Wesley|Blake|Elliot|Graham|Archer)\b/i;

  const firstName = extractFirstName(name);
  if (femaleNames.test(firstName)) {
    return 'female';
  }
  if (maleNames.test(firstName)) {
    return 'male';
  }

  return 'unknown';
}

/**
 * Get pronoun set based on gender.
 */
function getPronouns(gender: CharacterInfo['gender']): CharacterInfo['pronouns'] {
  switch (gender) {
    case 'female':
      return {
        subject: 'she',
        object: 'her',
        possessive: 'her',
        possessivePronoun: 'hers',
        reflexive: 'herself',
      };
    case 'male':
      return {
        subject: 'he',
        object: 'him',
        possessive: 'his',
        possessivePronoun: 'his',
        reflexive: 'himself',
      };
    case 'nonbinary':
    case 'unknown':
    default:
      return {
        subject: 'they',
        object: 'them',
        possessive: 'their',
        possessivePronoun: 'theirs',
        reflexive: 'themselves',
      };
  }
}

/**
 * Extract epithets from description.
 */
function extractEpithets(name: string, description: string, role?: string): string[] {
  const epithets: string[] = [];

  // Role-based epithets
  if (role) {
    epithets.push(`the ${role.toLowerCase()}`);
  }

  // Profession/role patterns
  const professionPatterns = [
    /\b(detective|officer|sergeant|captain|lieutenant|chief|inspector)\b/i,
    /\b(doctor|nurse|surgeon|physician|psychiatrist|therapist)\b/i,
    /\b(lawyer|attorney|judge|prosecutor|defender)\b/i,
    /\b(teacher|professor|instructor|principal|dean)\b/i,
    /\b(writer|author|journalist|reporter|editor)\b/i,
    /\b(artist|painter|sculptor|musician|singer|actor|actress)\b/i,
    /\b(scientist|researcher|engineer|programmer|developer)\b/i,
    /\b(soldier|marine|sailor|pilot|veteran)\b/i,
    /\b(priest|pastor|minister|rabbi|imam|monk|nun)\b/i,
    /\b(king|queen|prince|princess|duke|duchess|lord|lady|baron)\b/i,
    /\b(CEO|president|director|manager|executive|boss)\b/i,
    /\b(chef|cook|baker|waiter|waitress|bartender)\b/i,
    /\b(thief|criminal|gangster|mobster|assassin)\b/i,
  ];

  for (const pattern of professionPatterns) {
    const match = description.match(pattern);
    if (match) {
      epithets.push(`the ${match[1].toLowerCase()}`);
    }
  }

  // Age-based epithets
  const agePatterns = [
    { pattern: /\b(elderly|old|aged|senior)\b/i, epithet: 'the older' },
    { pattern: /\b(young|youthful)\b/i, epithet: 'the younger' },
    { pattern: /\b(teenage|teen|adolescent)\b/i, epithet: 'the teen' },
    { pattern: /\b(child|kid|little|young boy|young girl)\b/i, epithet: 'the child' },
  ];

  for (const { pattern, epithet } of agePatterns) {
    if (pattern.test(description)) {
      // Combine with gender
      const gender = detectGender(description.toLowerCase(), name);
      if (gender === 'female') {
        epithets.push(`${epithet} woman`);
      } else if (gender === 'male') {
        epithets.push(`${epithet} man`);
      } else {
        epithets.push(`${epithet} person`);
      }
    }
  }

  // Appearance-based epithets
  const appearancePatterns = [
    { pattern: /\b(tall)\b/i, epithet: 'the tall' },
    { pattern: /\b(short|petite|small)\b/i, epithet: 'the short' },
    { pattern: /\b(bald|bald-headed)\b/i, epithet: 'the bald' },
    { pattern: /\b(red[-\s]?hair|redhead|ginger)\b/i, epithet: 'the redhead' },
    { pattern: /\b(blonde|blond)\b/i, epithet: 'the blonde' },
    { pattern: /\b(dark[-\s]?hair|brunette)\b/i, epithet: 'the dark-haired' },
    { pattern: /\b(scarred|scar)\b/i, epithet: 'the scarred' },
    { pattern: /\b(bearded|beard)\b/i, epithet: 'the bearded' },
  ];

  for (const { pattern, epithet } of appearancePatterns) {
    if (pattern.test(description)) {
      const gender = detectGender(description.toLowerCase(), name);
      if (gender === 'female') {
        epithets.push(`${epithet} woman`);
      } else if (gender === 'male') {
        epithets.push(`${epithet} man`);
      } else {
        epithets.push(`${epithet} one`);
      }
    }
  }

  // Deduplicate and limit
  return [...new Set(epithets)].slice(0, 5);
}

/**
 * Extract titles from name and description.
 */
function extractTitles(name: string, description: string): string[] {
  const titles: string[] = [];
  const combined = `${name} ${description}`;

  const titlePatterns = [
    /\b(Dr\.|Doctor)\b/i,
    /\b(Mr\.|Mister)\b/i,
    /\b(Mrs\.)\b/i,
    /\b(Ms\.)\b/i,
    /\b(Miss)\b/i,
    /\b(Professor|Prof\.)\b/i,
    /\b(Captain|Capt\.)\b/i,
    /\b(Lieutenant|Lt\.)\b/i,
    /\b(Sergeant|Sgt\.)\b/i,
    /\b(Detective|Det\.)\b/i,
    /\b(Officer)\b/i,
    /\b(Agent)\b/i,
    /\b(Father|Fr\.)\b/i,
    /\b(Sister|Sr\.)\b/i,
    /\b(Reverend|Rev\.)\b/i,
    /\b(King|Queen|Prince|Princess|Duke|Duchess|Lord|Lady|Baron|Baroness)\b/i,
    /\b(Sir|Dame)\b/i,
    /\b(Chief)\b/i,
    /\b(General|Gen\.)\b/i,
    /\b(Admiral|Adm\.)\b/i,
    /\b(Colonel|Col\.)\b/i,
    /\b(Major|Maj\.)\b/i,
  ];

  for (const pattern of titlePatterns) {
    const match = combined.match(pattern);
    if (match) {
      titles.push(match[1]);
    }
  }

  return [...new Set(titles)];
}

/**
 * Detect age group from description.
 */
function detectAgeGroup(description: string): CharacterInfo['ageGroup'] | undefined {
  if (/\b(child|kid|little|young boy|young girl|toddler|infant|baby)\b/i.test(description)) {
    return 'child';
  }
  if (/\b(teen|teenage|adolescent|high school)\b/i.test(description)) {
    return 'teen';
  }
  if (/\b(young adult|college|university|twenties|20s|early thirties|early 30s)\b/i.test(description)) {
    return 'young_adult';
  }
  if (/\b(middle[-\s]?aged|forties|40s|fifties|50s)\b/i.test(description)) {
    return 'middle_aged';
  }
  if (/\b(elderly|old|aged|senior|retired|sixties|60s|seventies|70s|eighties|80s)\b/i.test(description)) {
    return 'elderly';
  }

  // Check for specific ages
  const ageMatch = description.match(/(\d{1,2})[-\s]?years?[-\s]?old|\bage[d]?\s+(\d{1,2})\b/i);
  if (ageMatch) {
    const age = parseInt(ageMatch[1] || ageMatch[2]);
    if (age < 13) return 'child';
    if (age < 20) return 'teen';
    if (age < 35) return 'young_adult';
    if (age < 55) return 'adult';
    if (age < 70) return 'middle_aged';
    return 'elderly';
  }

  return 'adult'; // Default
}

/**
 * Get character info by name from a list.
 */
export function getCharacterByName(
  characters: CharacterInfo[],
  name: string
): CharacterInfo | undefined {
  // Exact match
  const exact = characters.find(c =>
    c.name.toLowerCase() === name.toLowerCase()
  );
  if (exact) return exact;

  // First name match
  const firstName = characters.find(c =>
    c.firstName.toLowerCase() === name.toLowerCase()
  );
  if (firstName) return firstName;

  // Partial match
  return characters.find(c =>
    c.name.toLowerCase().includes(name.toLowerCase()) ||
    name.toLowerCase().includes(c.name.toLowerCase())
  );
}

// Note: CharacterInfo and CharacterExtractionResult are exported at their definitions
