/**
 * Name Variety Controls
 *
 * Enforces name diversity by:
 * 1. Banning overused AI-favorite names
 * 2. Detecting cultural setting from premise/genre
 * 3. Providing culturally-appropriate name guidance
 */

// ============================================================================
// BANNED OVERUSED NAMES - AI keeps using these, avoid them
// ============================================================================

export const BANNED_OVERUSED_NAMES = [
  // Female names the AI loves to spam
  'Elena', 'Maya', 'Aria', 'Luna', 'Aurora', 'Nova', 'Sage', 'Ivy',
  'Willow', 'Jade', 'Phoenix', 'Raven', 'Serena', 'Sierra', 'Stella',
  'Lyra', 'Nadia', 'Mira', 'Zara', 'Kira', 'Selene', 'Celeste',
  'Ember', 'Echo', 'Iris', 'Violet', 'Rose', 'Lily', 'Scarlet',

  // Male names the AI loves to spam
  'Marcus', 'Ethan', 'Kai', 'Liam', 'Aiden', 'Orion', 'Phoenix', 'Axel',
  'Zander', 'Ryder', 'Jasper', 'Asher', 'Leo', 'Max', 'Finn', 'Cole',
  'Blake', 'Chase', 'Hunter', 'Logan', 'Mason', 'Noah', 'Oliver',
  'Sebastian', 'Xavier', 'Damien', 'Adrian', 'Dante', 'Felix',

  // Gender-neutral overused
  'Alex', 'Jordan', 'Riley', 'Quinn', 'Sage', 'River', 'Sky', 'Rowan',

  // Generic "diverse" names AI defaults to
  'Amara', 'Zuri', 'Nia', 'Malik', 'Jamal', 'DeShawn', 'Kenji', 'Hiroshi',
  'Chen', 'Wei', 'Raj', 'Priya', 'Aisha', 'Fatima',
];

// ============================================================================
// CULTURAL SETTING DETECTION
// ============================================================================

interface CulturalSetting {
  region: string;
  nameGuidance: string;
  demographicNote: string;
  exampleNames: {
    male: string[];
    female: string[];
  };
}

const CULTURAL_SETTINGS: Record<string, CulturalSetting> = {
  japan: {
    region: 'Japan',
    nameGuidance: 'Use Japanese names. Family name first (Tanaka, Yamamoto, Sato), given names like Yuki, Haruto, Sakura, Ren.',
    demographicNote: 'Characters should be Japanese. In modern Japan, foreign characters are rare outside tourist areas or international business.',
    exampleNames: {
      male: ['Haruto', 'Yuto', 'Sota', 'Ren', 'Takeshi', 'Kenji', 'Daiki', 'Ryota'],
      female: ['Yui', 'Hana', 'Sakura', 'Rin', 'Aoi', 'Mio', 'Yuki', 'Akari'],
    },
  },
  china: {
    region: 'China',
    nameGuidance: 'Use Chinese names. Family name first (Wang, Li, Zhang, Liu, Chen), given names like Wei, Ming, Xiao, Mei.',
    demographicNote: 'Characters should be Chinese. China is 92% Han Chinese.',
    exampleNames: {
      male: ['Wei', 'Ming', 'Jun', 'Tao', 'Feng', 'Long', 'Hao', 'Cheng'],
      female: ['Mei', 'Ling', 'Xiao', 'Hui', 'Yan', 'Jing', 'Fang', 'Yue'],
    },
  },
  korea: {
    region: 'South Korea',
    nameGuidance: 'Use Korean names. Family name first (Kim, Park, Lee, Choi, Jung), given names like Min-jun, Seo-yeon.',
    demographicNote: 'Characters should be Korean. South Korea is highly homogeneous.',
    exampleNames: {
      male: ['Min-jun', 'Seo-jun', 'Ji-ho', 'Jun-seo', 'Hyun-woo', 'Tae-min', 'Dong-hyun', 'Sung-jin'],
      female: ['Seo-yeon', 'Ji-woo', 'Ha-eun', 'Soo-ah', 'Ye-jin', 'Min-ji', 'Hye-won', 'Eun-bi'],
    },
  },
  france: {
    region: 'France',
    nameGuidance: 'Use French names: Jean, Pierre, Marie, Sophie, Luc, Camille, Antoine, Claire.',
    demographicNote: 'Most characters should be ethnically French. While France has diversity in cities, rural France is largely homogeneous.',
    exampleNames: {
      male: ['Jean', 'Pierre', 'Luc', 'Antoine', 'Michel', 'Henri', 'Bernard', 'Philippe'],
      female: ['Marie', 'Sophie', 'Claire', 'Camille', 'Isabelle', 'Monique', 'Catherine', 'Nathalie'],
    },
  },
  germany: {
    region: 'Germany',
    nameGuidance: 'Use German names: Hans, Klaus, Fritz, Greta, Ingrid, Otto, Heinrich, Anna.',
    demographicNote: 'Most characters should be German. Some Turkish-German characters in urban settings is realistic.',
    exampleNames: {
      male: ['Hans', 'Klaus', 'Fritz', 'Otto', 'Heinrich', 'Karl', 'Wolfgang', 'Dieter'],
      female: ['Greta', 'Ingrid', 'Anna', 'Heidi', 'Ursula', 'Brigitte', 'Helga', 'Monika'],
    },
  },
  italy: {
    region: 'Italy',
    nameGuidance: 'Use Italian names: Marco, Luca, Giovanni, Sofia, Giulia, Alessandro, Francesca.',
    demographicNote: 'Characters should be Italian. Italy is relatively homogeneous.',
    exampleNames: {
      male: ['Marco', 'Luca', 'Giovanni', 'Alessandro', 'Francesco', 'Paolo', 'Roberto', 'Giuseppe'],
      female: ['Sofia', 'Giulia', 'Francesca', 'Alessia', 'Chiara', 'Valentina', 'Martina', 'Sara'],
    },
  },
  spain: {
    region: 'Spain',
    nameGuidance: 'Use Spanish names: Carlos, Javier, Pablo, Carmen, Lucia, Maria, Diego, Isabel.',
    demographicNote: 'Characters should be Spanish. Regional diversity (Catalan, Basque, Andalusian) is welcome.',
    exampleNames: {
      male: ['Carlos', 'Javier', 'Pablo', 'Diego', 'Miguel', 'Antonio', 'Fernando', 'Rafael'],
      female: ['Carmen', 'Lucia', 'Maria', 'Isabel', 'Pilar', 'Elena', 'Dolores', 'Ana'],
    },
  },
  russia: {
    region: 'Russia',
    nameGuidance: 'Use Russian names: Ivan, Dmitri, Nikolai, Anastasia, Natasha, Olga, Vladimir, Yuri.',
    demographicNote: 'Characters should be Russian. Include patronymics for authenticity (Ivanovich, Petrovna).',
    exampleNames: {
      male: ['Ivan', 'Dmitri', 'Nikolai', 'Vladimir', 'Yuri', 'Alexei', 'Sergei', 'Mikhail'],
      female: ['Anastasia', 'Natasha', 'Olga', 'Tatiana', 'Svetlana', 'Irina', 'Katya', 'Yelena'],
    },
  },
  uk: {
    region: 'United Kingdom',
    nameGuidance: 'Use British names: William, James, George, Elizabeth, Charlotte, Edward, Victoria.',
    demographicNote: 'Predominantly British characters. Cities like London have diversity; rural UK is largely white British.',
    exampleNames: {
      male: ['William', 'James', 'George', 'Edward', 'Harry', 'Thomas', 'Charles', 'Arthur'],
      female: ['Elizabeth', 'Charlotte', 'Victoria', 'Margaret', 'Catherine', 'Eleanor', 'Sophie', 'Emma'],
    },
  },
  usa_general: {
    region: 'United States (General)',
    nameGuidance: 'American names can be diverse, but match demographics to the setting. Small-town Midwest differs from NYC.',
    demographicNote: 'USA is diverse, but demographics vary by region. Let the specific setting guide character backgrounds.',
    exampleNames: {
      male: ['John', 'Michael', 'Robert', 'David', 'James', 'William', 'Richard', 'Thomas'],
      female: ['Jennifer', 'Susan', 'Linda', 'Karen', 'Nancy', 'Betty', 'Margaret', 'Dorothy'],
    },
  },
  usa_south: {
    region: 'American South',
    nameGuidance: 'Southern American names: Billy, Bobby, Earl, Loretta, Mae, Cletus, Jolene, Beau.',
    demographicNote: 'American South has distinct cultural names. Mix of white and Black demographics depending on area.',
    exampleNames: {
      male: ['Billy', 'Bobby', 'Earl', 'Beau', 'Travis', 'Wyatt', 'Clayton', 'Cody'],
      female: ['Loretta', 'Mae', 'Jolene', 'Daisy', 'Savannah', 'Scarlett', 'Belle', 'Magnolia'],
    },
  },
  india: {
    region: 'India',
    nameGuidance: 'Use Indian names appropriate to region: North India (Rahul, Priya, Vikram), South India (Lakshmi, Arvind).',
    demographicNote: 'Characters should be Indian. India has vast regional and religious diversity - match names to the specific region.',
    exampleNames: {
      male: ['Rahul', 'Vikram', 'Arjun', 'Aditya', 'Sanjay', 'Rohit', 'Amit', 'Rajesh'],
      female: ['Priya', 'Lakshmi', 'Ananya', 'Pooja', 'Divya', 'Neha', 'Swati', 'Kavita'],
    },
  },
  mexico: {
    region: 'Mexico',
    nameGuidance: 'Use Mexican names: Carlos, Miguel, Maria, Guadalupe, Jose, Ana, Fernando, Rosa.',
    demographicNote: 'Characters should be Mexican. Mestizo majority with indigenous and Spanish influences.',
    exampleNames: {
      male: ['Carlos', 'Miguel', 'Jose', 'Fernando', 'Roberto', 'Alejandro', 'Luis', 'Pedro'],
      female: ['Maria', 'Guadalupe', 'Ana', 'Rosa', 'Carmen', 'Patricia', 'Luisa', 'Elena'],
    },
  },
  brazil: {
    region: 'Brazil',
    nameGuidance: 'Use Brazilian Portuguese names: Joao, Pedro, Lucas, Ana, Julia, Fernanda, Rafael.',
    demographicNote: 'Brazil is highly diverse (white, mixed, Black, Asian) - reflect this realistic mix.',
    exampleNames: {
      male: ['Joao', 'Pedro', 'Lucas', 'Rafael', 'Gustavo', 'Carlos', 'Bruno', 'Thiago'],
      female: ['Ana', 'Julia', 'Fernanda', 'Camila', 'Beatriz', 'Larissa', 'Amanda', 'Gabriela'],
    },
  },
  middle_east: {
    region: 'Middle East',
    nameGuidance: 'Use Arabic names: Ahmed, Mohammed, Fatima, Layla, Omar, Yusuf, Aisha, Hassan.',
    demographicNote: 'Characters should be Arab/Middle Eastern. Different countries have distinct naming conventions.',
    exampleNames: {
      male: ['Ahmed', 'Mohammed', 'Omar', 'Yusuf', 'Hassan', 'Ali', 'Khalid', 'Ibrahim'],
      female: ['Fatima', 'Layla', 'Aisha', 'Noor', 'Maryam', 'Salma', 'Hana', 'Amira'],
    },
  },
  nigeria: {
    region: 'Nigeria',
    nameGuidance: 'Use Nigerian names from major ethnic groups: Yoruba (Adebayo, Olumide), Igbo (Chukwuemeka, Ngozi), Hausa (Aminu, Halima).',
    demographicNote: 'Characters should be Nigerian. Nigeria has 250+ ethnic groups - specify which for authenticity.',
    exampleNames: {
      male: ['Adebayo', 'Olumide', 'Chukwuemeka', 'Aminu', 'Emeka', 'Tunde', 'Obinna', 'Segun'],
      female: ['Ngozi', 'Halima', 'Chioma', 'Aisha', 'Funke', 'Adaeze', 'Yetunde', 'Amaka'],
    },
  },
  scandinavia: {
    region: 'Scandinavia (Norway/Sweden/Denmark)',
    nameGuidance: 'Use Scandinavian names: Erik, Lars, Ingrid, Astrid, Bjorn, Olaf, Freya, Magnus.',
    demographicNote: 'Characters should be Scandinavian. These countries are historically homogeneous.',
    exampleNames: {
      male: ['Erik', 'Lars', 'Bjorn', 'Olaf', 'Magnus', 'Sven', 'Thor', 'Gunnar'],
      female: ['Ingrid', 'Astrid', 'Freya', 'Sigrid', 'Helga', 'Greta', 'Freja', 'Karin'],
    },
  },
  fantasy_medieval: {
    region: 'Fantasy/Medieval Europe',
    nameGuidance: 'Use medieval-inspired names: Edmund, Roland, Gwyneth, Aldric, Isolde, Cedric, Rowena.',
    demographicNote: 'Fantasy based on medieval Europe - characters should reflect that aesthetic unless worldbuilding specifies otherwise.',
    exampleNames: {
      male: ['Edmund', 'Roland', 'Aldric', 'Cedric', 'Garrett', 'Theron', 'Alaric', 'Godric'],
      female: ['Gwyneth', 'Isolde', 'Rowena', 'Elspeth', 'Bronwyn', 'Elowen', 'Seraphina', 'Morgana'],
    },
  },
};

// Keywords to detect cultural settings from premise/genre
const SETTING_KEYWORDS: Record<string, string[]> = {
  japan: ['japan', 'japanese', 'tokyo', 'osaka', 'kyoto', 'samurai', 'anime', 'manga', 'shinto', 'ninja', 'geisha', 'sakura'],
  china: ['china', 'chinese', 'beijing', 'shanghai', 'hong kong', 'dynasty', 'mandarin', 'cantonese', 'wuxia', 'kung fu'],
  korea: ['korea', 'korean', 'seoul', 'busan', 'k-pop', 'k-drama', 'hanbok', 'joseon'],
  france: ['france', 'french', 'paris', 'marseille', 'provence', 'bordeaux', 'versailles', 'normandy'],
  germany: ['germany', 'german', 'berlin', 'munich', 'bavaria', 'prussian', 'oktoberfest'],
  italy: ['italy', 'italian', 'rome', 'milan', 'venice', 'florence', 'sicily', 'naples', 'mafia', 'mob'],
  spain: ['spain', 'spanish', 'madrid', 'barcelona', 'andalusia', 'flamenco', 'matador'],
  russia: ['russia', 'russian', 'moscow', 'siberia', 'st petersburg', 'soviet', 'kremlin', 'tsar'],
  uk: ['britain', 'british', 'england', 'english', 'london', 'scotland', 'scottish', 'wales', 'welsh', 'victorian', 'regency'],
  usa_south: ['southern', 'dixie', 'alabama', 'mississippi', 'louisiana', 'georgia', 'texas', 'tennessee', 'plantation', 'bayou'],
  usa_general: ['america', 'american', 'usa', 'united states', 'new york', 'california', 'los angeles', 'chicago'],
  india: ['india', 'indian', 'mumbai', 'delhi', 'bollywood', 'hindu', 'sikh', 'bangalore', 'kolkata'],
  mexico: ['mexico', 'mexican', 'mexico city', 'aztec', 'mayan', 'tijuana', 'cancun'],
  brazil: ['brazil', 'brazilian', 'rio', 'sao paulo', 'amazon', 'favela', 'carnival'],
  middle_east: ['arab', 'arabian', 'dubai', 'saudi', 'egypt', 'cairo', 'jordan', 'persian', 'iran', 'iraq', 'desert kingdom'],
  nigeria: ['nigeria', 'nigerian', 'lagos', 'african', 'yoruba', 'igbo', 'hausa'],
  scandinavia: ['viking', 'norse', 'norway', 'norwegian', 'sweden', 'swedish', 'denmark', 'danish', 'fjord', 'scandinavia'],
  fantasy_medieval: ['medieval', 'kingdom', 'castle', 'knight', 'sword and sorcery', 'dragon', 'quest', 'throne', 'realm'],
};

/**
 * Detect cultural setting from premise, title, and genre.
 */
export function detectCulturalSetting(
  premise: string,
  title: string = '',
  genre: string = ''
): CulturalSetting | null {
  const combinedText = `${premise} ${title} ${genre}`.toLowerCase();

  // Check each setting's keywords
  for (const [settingKey, keywords] of Object.entries(SETTING_KEYWORDS)) {
    for (const keyword of keywords) {
      if (combinedText.includes(keyword)) {
        return CULTURAL_SETTINGS[settingKey] || null;
      }
    }
  }

  return null;
}

/**
 * Build name guidance prompt section based on cultural setting.
 */
export function buildNameGuidancePrompt(
  premise: string,
  title: string = '',
  genre: string = ''
): string {
  const setting = detectCulturalSetting(premise, title, genre);

  // Always include banned names
  const bannedSection = `
=== BANNED OVERUSED NAMES (DO NOT USE) ===
These names are overused by AI. NEVER use any of these:
${BANNED_OVERUSED_NAMES.slice(0, 30).join(', ')}

Use FRESH, UNIQUE names instead. If you find yourself reaching for a name that "sounds right," it's probably overused.
`;

  // Add cultural setting if detected
  if (setting) {
    return `${bannedSection}
=== CULTURAL SETTING DETECTED: ${setting.region} ===
${setting.nameGuidance}

DEMOGRAPHIC GUIDANCE:
${setting.demographicNote}

EXAMPLE NAMES TO USE:
- Male: ${setting.exampleNames.male.join(', ')}
- Female: ${setting.exampleNames.female.join(', ')}

IMPORTANT: Match character names and backgrounds to this setting. Do not force diversity that doesn't fit the cultural context. A story set in rural Japan should have Japanese characters. A story in 1920s Paris should have French characters.
`;
  }

  // Generic guidance if no specific setting detected
  return `${bannedSection}
=== NAME VARIETY GUIDELINES ===
- Match character names to the story's SETTING and TIME PERIOD
- If the story is set in a specific country/culture, use names from that culture
- Avoid generic "diverse for diversity's sake" name combos - let the STORY dictate demographics
- Example: Medieval Europe = European names. Tokyo noir = Japanese names. NYC = American names (naturally diverse).
- Be AUTHENTIC to the setting rather than checking diversity boxes
`;
}

/**
 * Check if a character name is banned/overused.
 */
export function isNameBanned(name: string): boolean {
  return BANNED_OVERUSED_NAMES.some(
    banned => banned.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Filter out banned names from a list.
 */
export function filterBannedNames(names: string[]): string[] {
  return names.filter(name => !isNameBanned(name));
}

/**
 * Get example names for a cultural setting.
 */
export function getExampleNamesForSetting(
  premise: string,
  title: string = '',
  genre: string = ''
): { male: string[]; female: string[] } | null {
  const setting = detectCulturalSetting(premise, title, genre);
  return setting?.exampleNames || null;
}
