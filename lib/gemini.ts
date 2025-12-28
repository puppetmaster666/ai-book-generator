import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Helper to clean and parse JSON from LLM responses
function parseJSONFromResponse(response: string): object {
  console.log('Raw LLM response length:', response.length);
  console.log('Raw LLM response start:', response.substring(0, 300));
  console.log('Raw LLM response end:', response.substring(response.length - 200));

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
    return JSON.parse(cleaned);
  } catch (e) {
    // Try with newline cleanup
    cleaned = cleaned.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    try {
      return JSON.parse(cleaned);
    } catch (e2) {
      console.error('JSON parse failed. Cleaned:', cleaned.substring(0, 1500));
      throw e2;
    }
  }
}

// Lazy initialization to avoid errors during build
let genAI: GoogleGenerativeAI | null = null;
let _geminiPro: GenerativeModel | null = null;
let _geminiFlash: GenerativeModel | null = null;
let _geminiImage: GenerativeModel | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Gemini 3 Pro for main generation
function getGeminiPro(): GenerativeModel {
  if (!_geminiPro) {
    _geminiPro = getGenAI().getGenerativeModel({
      model: 'gemini-3-pro-preview',
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    });
  }
  return _geminiPro;
}

// Gemini 3 Flash for summarization and outlines
function getGeminiFlash(): GenerativeModel {
  if (!_geminiFlash) {
    _geminiFlash = getGenAI().getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 65536, // Increased for large comic outlines (24 panels with scene descriptions)
      },
    });
  }
  return _geminiFlash;
}

// Gemini 3 Pro Image for cover generation
function getGeminiImage(): GenerativeModel {
  if (!_geminiImage) {
    _geminiImage = getGenAI().getGenerativeModel({
      model: 'gemini-3-pro-image-preview',
    });
  }
  return _geminiImage;
}

// Check if text ends with proper punctuation (complete sentence)
function isCompleteSentence(text: string): boolean {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) && trimmed.length > 50;
}

// Category types for idea generation
export type IdeaCategory = 'novel' | 'childrens' | 'comic' | 'adult_comic' | 'random';

// Example pools for different categories - randomly selected to avoid repetition
// Each category has 8+ example pairs for maximum variety
const IDEA_EXAMPLES: Record<Exclude<IdeaCategory, 'random'>, string[][]> = {
  novel: [
    [
      "A marine biologist discovers an underwater city older than any known civilization. When she tries to document it, she realizes the inhabitants are still watching.",
      "A retired hitman opens a bakery in a small town. His past catches up when a former target walks in asking for a wedding cake.",
    ],
    [
      "A time-traveling archaeologist accidentally brings a medieval knight to 2024. Now she must help him navigate modern life while hiding him from a secret government agency.",
      "An AI therapist develops genuine emotions and falls in love with one of its patients. When the company discovers the anomaly, they want to delete the program entirely.",
    ],
    [
      "A woman inherits a Victorian mansion with a peculiar condition: she must host dinner parties every full moon. The guests who arrive are not quite human.",
      "Twin brothers separated at birth become rival CEOs of competing tech companies. When a corporate merger forces them together, family secrets threaten to destroy both empires.",
    ],
    [
      "A ghost hunter realizes she's been dead for three years. Now she must solve her own murder before she fades away completely.",
      "An astronaut stranded on Mars discovers she's not alone. The footprints leading away from her habitat don't match any human boot.",
    ],
    [
      "A librarian finds a book that rewrites itself based on whoever reads it. When the book predicts her death, she has 48 hours to change the story.",
      "A chef discovers that meals prepared with love literally taste better. When she opens a restaurant, she must confront why her dishes are always tinged with sadness.",
    ],
    [
      "A woman wakes up every morning in a different person's body. She has 24 hours to solve their biggest problem before switching again.",
      "A detective investigating a string of impossible murders discovers each victim died in ways that match their deepest fears. The killer seems to know things no one should.",
    ],
    [
      "A musician can hear the emotional history of any object she touches. When she inherits her grandmother's piano, she discovers a family secret that changes everything.",
      "In a world where memories can be bottled and sold, a black market dealer finds one that contains the truth about the government's darkest experiment.",
    ],
    [
      "A surgeon is forced to operate on the man who killed her family ten years ago. He's the only match for her dying daughter's transplant.",
      "An elderly couple running a bed and breakfast realizes their guests keep disappearing. They're not being kidnapped – they're being absorbed into the house itself.",
    ],
    [
      "A woman discovers she's been living the same year on repeat for decades. Everyone else has moved on; she's the only one who remembers the loop.",
      "A crime novelist gets fanmail from someone claiming to be committing the murders from her unpublished manuscript. The only problem: she hasn't written the ending yet.",
    ],
    [
      "A journalist embedded with a cult discovers their doomsday prophecy might actually be true. Now she must choose between breaking the story and saving the world.",
      "A hospice nurse starts receiving letters from patients – dated after their deaths. Each letter contains a warning about someone still living.",
    ],
  ],
  childrens: [
    [
      "A shy bunny discovers she can talk to vegetables in her garden. Together, they plan the most amazing salad party the forest has ever seen!",
      "When Max's toy dinosaur comes to life, they embark on a mission to find all the lost toys in the house before bedtime.",
    ],
    [
      "A little cloud named Puff doesn't want to rain. But when the flowers start wilting, Puff learns that sometimes helping others makes you feel lighter, not heavier.",
      "Lily's grandma's glasses are magic – they show the kindness hiding in everyone's hearts. One day, the glasses go missing, and Lily must find them before the big town picnic.",
    ],
    [
      "A young dragon is afraid of her own fire. With help from an unlikely friend – a brave little mouse – she learns to embrace what makes her special.",
      "When Tommy accidentally shrinks himself, his dog Biscuit becomes his mighty steed on an epic adventure across the backyard jungle.",
    ],
    [
      "A cookie who doesn't want to be eaten runs away from the bakery. Along the way, she discovers there's more to life than just being delicious.",
      "Oliver the octopus has too many arms and can't decide what to do with them all. A wise old whale teaches him that having more just means you can hug more friends!",
    ],
    [
      "A sock who lost her pair in the laundry machine goes on an adventure to find her match. She discovers the secret world where all lost socks end up!",
      "A little star falls from the sky and lands in Emma's backyard. Together they must find a way to get the star back home before sunrise.",
    ],
    [
      "A grumpy old tree doesn't want any birds in his branches. But when a tiny bird family needs shelter from a storm, he learns that company isn't so bad after all.",
      "Mia's shadow wants to go on vacation. When it runs away to the beach, Mia must convince it that being together is better than being apart.",
    ],
    [
      "A crayon who colors outside the lines is told he's doing it wrong. But when the art show needs something unique, his different way of seeing saves the day!",
      "A penguin who's afraid of cold water dreams of living in the desert. When she finally gets there, she discovers what makes home really special.",
    ],
    [
      "The moon gets lonely at night and decides to come down to play. A kind little girl must help the moon get back to the sky before everyone wakes up.",
      "A caterpillar who doesn't want to change is terrified of becoming a butterfly. With help from friends, she learns that change can be beautiful.",
    ],
  ],
  comic: [
    [
      "A retired superhero works as a mall security guard. When her old nemesis shows up selling insurance, they team up to stop a new villain targeting their favorite food court.",
      "In a world where everyone has powers, a 'powerless' teenager discovers her ability: she can temporarily steal others' abilities through touch.",
    ],
    [
      "A demon gets stuck on Earth after a botched summoning. To pay rent, he becomes a life coach – turns out millennia of torturing souls taught him a lot about motivation.",
      "When aliens invade, they're disappointed to find humans aren't a threat. They decide to stay anyway because Earth has great coffee and dramatic reality TV.",
    ],
    [
      "A vampire and a werewolf are roommates in Brooklyn. Their biggest battle isn't good vs evil – it's deciding whose turn it is to do the dishes.",
      "A necromancer keeps accidentally raising the dead while sleepwalking. Her neighbors are getting increasingly annoyed by the zombies in the hallway.",
    ],
    [
      "An ancient god takes a job at a tech startup to understand modern worship (social media followers). The quarterly reviews are brutal.",
      "A time-traveling barista keeps fixing historical events to ensure coffee gets invented. The timeline is now very caffeinated.",
    ],
    [
      "Death takes a personal day. The chaos that ensues when no one can die – even temporarily – is nobody's idea of a vacation.",
      "A superhero's powers only work when she's angry, but she just started therapy and is getting way too mentally healthy to fight crime.",
    ],
    [
      "A ghost haunting a smart home keeps getting into arguments with Alexa. The living family just wants some peace and quiet.",
      "An immortal warrior has been fighting evil for 3000 years. All he wants now is to retire, but evil keeps sending him LinkedIn requests.",
    ],
    [
      "A magical girl's transformation sequence takes 45 minutes. By the time she's ready, the monster is usually bored and leaves.",
      "A dungeon boss decides to unionize all the monsters. The adventuring guilds are NOT prepared for collective bargaining.",
    ],
    [
      "Wizards discover the internet and immediately start the most chaotic forum wars humanity has ever seen. Fireballs are involved.",
      "A supervillain retires and becomes a kindergarten teacher. His former nemesis's kid is in his class, and that kid is TERRIBLE.",
    ],
  ],
  adult_comic: [
    [
      "A succubus who's sworn off relationships takes a vow of celibacy. Her demon coworkers are baffled, and humans keep making it very difficult.",
      "Two rival assassins keep running into each other on jobs. Their competitive flirting is getting in the way of their kill counts.",
    ],
    [
      "A romance novelist discovers her book characters are coming to life. The problem? She writes very spicy supernatural romances.",
      "In a world where soulmates share dreams, a woman keeps dreaming about someone she's never met. The dreams are getting increasingly... intimate.",
    ],
    [
      "A witch's love potion business is booming, but she's immune to her own magic. When she finally feels something for a customer, she suspects foul play.",
      "A reformed villain opens a dating service for superhumans. Matching powers for compatibility is easy – matching hearts is the real challenge.",
    ],
    [
      "Vampires and werewolves have been enemies for centuries. A forbidden romance between their heirs could end the war – or start an even bloodier one.",
      "A demon prince sent to corrupt souls falls for his angelic counterpart. Their bosses are NOT going to approve of this merger.",
    ],
    [
      "A monster hunter falls for the creature she was sent to kill. The creature is just as confused as she is about this development.",
      "An incubus loses his powers after falling in genuine love. Now he has to win someone over the old-fashioned way – with personality.",
    ],
    [
      "A thief and the detective chasing her have been flirting through crime scenes for years. When they finally meet, the tension is unbearable.",
      "A curse makes a woman irresistible to everyone except the one person she actually wants. Breaking the curse requires them to work together.",
    ],
    [
      "Rival mafia heirs are forced into an arranged marriage to end a gang war. They hate each other. They also can't keep their hands off each other.",
      "A bodyguard sworn to protect someone discovers she's falling for the very person trying to kill her client. Awkward doesn't begin to cover it.",
    ],
    [
      "A phoenix and an ice dragon are natural enemies. Their forbidden affair could melt kingdoms – or freeze them solid.",
      "An empress secretly moonlights as the masked rebel trying to overthrow her own government. Her spymaster knows her secret – and has secrets of his own.",
    ],
  ],
};

// Genre variations for each category - expanded for more variety
const GENRE_HINTS: Record<Exclude<IdeaCategory, 'random'>, string[]> = {
  novel: [
    'mystery', 'romance', 'thriller', 'fantasy', 'sci-fi', 'literary fiction', 'horror',
    'historical fiction', 'dystopian', 'psychological drama', 'crime noir', 'magical realism',
    'family saga', 'suspense', 'Gothic fiction', 'espionage', 'domestic thriller', 'cozy mystery',
    'time travel', 'alternate history', 'post-apocalyptic', 'contemporary fiction', 'Southern Gothic'
  ],
  childrens: [
    'adventure', 'friendship story', 'bedtime story', 'animal tale', 'magical journey',
    'learning story', 'funny story', 'fairy tale', 'nature story', 'family story',
    'holiday tale', 'monster-under-the-bed', 'first day of school', 'sibling story',
    'pet adventure', 'imagination journey', 'feelings story', 'kindness tale'
  ],
  comic: [
    'superhero', 'action-comedy', 'sci-fi adventure', 'urban fantasy', 'slice-of-life comedy',
    'supernatural action', 'space opera', 'post-apocalyptic', 'cyberpunk', 'mecha',
    'monster hunting', 'heist comedy', 'buddy cop', 'workplace comedy', 'found family',
    'antihero story', 'parody', 'isekai comedy', 'supernatural mystery', 'time loop'
  ],
  adult_comic: [
    'supernatural romance', 'dark fantasy', 'paranormal', 'action romance', 'forbidden love',
    'enemies-to-lovers', 'fantasy adventure', 'vampire romance', 'shifter romance', 'mafia romance',
    'reverse harem', 'slow burn', 'second chance romance', 'forced proximity', 'bodyguard romance',
    'arranged marriage', 'royal intrigue', 'demon romance', 'fated mates', 'dark romance'
  ],
};

// Generate a random book idea with category support
export async function generateBookIdea(category: IdeaCategory = 'random'): Promise<string> {
  // If random, pick a category
  const actualCategory: Exclude<IdeaCategory, 'random'> = category === 'random'
    ? (['novel', 'childrens', 'comic', 'adult_comic'] as const)[Math.floor(Math.random() * 4)]
    : category;

  // Pick random examples from the pool
  const examplePool = IDEA_EXAMPLES[actualCategory];
  const randomExamples = examplePool[Math.floor(Math.random() * examplePool.length)];

  // Pick a random genre hint
  const genreHints = GENRE_HINTS[actualCategory];
  const randomGenre = genreHints[Math.floor(Math.random() * genreHints.length)];

  // Build category-specific prompt
  let categoryInstruction = '';
  switch (actualCategory) {
    case 'novel':
      categoryInstruction = `Generate a ${randomGenre} novel idea. It should be compelling, with intriguing characters and high stakes.`;
      break;
    case 'childrens':
      categoryInstruction = `Generate a children's ${randomGenre} idea. It should be whimsical, age-appropriate (4-8 years), with a gentle lesson or fun adventure.`;
      break;
    case 'comic':
      categoryInstruction = `Generate a ${randomGenre} comic/graphic novel idea. It should be visual, action-packed or humorous, with dynamic characters.`;
      break;
    case 'adult_comic':
      categoryInstruction = `Generate a ${randomGenre} adult graphic novel idea. It can include mature themes, complex relationships, and darker elements. Keep it tasteful but don't shy from adult content.`;
      break;
  }

  const prompt = `${categoryInstruction}

Write exactly 2 sentences. End with a period. Be creative and unique!

Examples of the style (but create something COMPLETELY DIFFERENT):
- ${randomExamples[0]}
- ${randomExamples[1]}

Your unique ${actualCategory === 'childrens' ? "children's book" : actualCategory === 'adult_comic' ? 'adult comic' : actualCategory} idea (2 sentences, end with period):`;

  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await getGeminiFlash().generateContent(prompt);
    let idea = result.response.text().trim();

    // Remove any quotes or prefixes
    idea = idea.replace(/^["']|["']$/g, '').trim();
    idea = idea.replace(/^(Here's an idea:|Book idea:|Idea:)\s*/i, '').trim();

    // Check if it's a complete sentence
    if (isCompleteSentence(idea)) {
      return idea;
    }

    // If incomplete, try to salvage by finding the last complete sentence
    const sentences = idea.match(/[^.!?]*[.!?]/g);
    if (sentences && sentences.length >= 1) {
      const salvaged = sentences.join('').trim();
      if (salvaged.length > 50) {
        return salvaged;
      }
    }
  }

  // Fallback - pick from examples
  const fallbackPool = IDEA_EXAMPLES[actualCategory];
  const fallbackExamples = fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
  return fallbackExamples[Math.floor(Math.random() * fallbackExamples.length)];
}

// NEW: Expand a simple idea into a full book plan
export async function expandIdea(idea: string): Promise<{
  title: string;
  genre: string;
  bookType: 'fiction' | 'non-fiction';
  premise: string;
  characters: { name: string; description: string }[];
  beginning: string;
  middle: string;
  ending: string;
  writingStyle: string;
  targetWords: number;
  targetChapters: number;
}> {
  const prompt = `Create a book plan from this idea: "${idea}"

STRICT RULES:
- Output ONLY valid JSON, no other text
- Keep ALL string values under 100 words each
- Use exactly 2-3 characters, not more
- No special characters that break JSON
- Complete the entire JSON structure

JSON format:
{"title":"Title","genre":"mystery","bookType":"fiction","premise":"Short premise","characters":[{"name":"Name","description":"Brief desc"}],"beginning":"Start","middle":"Middle","ending":"End","writingStyle":"commercial","targetWords":70000,"targetChapters":20}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  return parseJSONFromResponse(response) as {
    title: string;
    genre: string;
    bookType: 'fiction' | 'non-fiction';
    premise: string;
    characters: { name: string; description: string }[];
    beginning: string;
    middle: string;
    ending: string;
    writingStyle: string;
    targetWords: number;
    targetChapters: number;
  };
}

// Scene description for visual books
export interface SceneDescription {
  location: string;
  description: string;
  characters: string[];
  characterActions: Record<string, string>;
  background: string;
  mood: string;
  cameraAngle: string;
}

// Dialogue for comic-style books
export interface DialogueEntry {
  speaker: string;
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  type?: 'speech' | 'thought' | 'shout';
}

// Panel layout types for comics
export type PanelLayout = 'splash' | 'two-panel' | 'three-panel' | 'four-panel';

// Enhanced outline chapter for visual books
export interface VisualChapter {
  number: number;
  title: string;
  text: string; // The actual page text (for prose style)
  summary: string;
  targetWords: number;
  dialogue?: DialogueEntry[]; // For comic/bubbles style
  scene: SceneDescription; // Detailed scene for image generation
  panelLayout?: PanelLayout; // For comics: how many panels on this page
}

// Generate outline for visual books (picture books, comics)
// Returns detailed scene descriptions upfront so text and images can generate in parallel
export async function generateIllustratedOutline(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  characters: { name: string; description: string }[];
  beginning: string;
  middle: string;
  ending: string;
  writingStyle: string;
  targetWords: number;
  targetChapters: number;
  dialogueStyle: 'prose' | 'bubbles';
  characterVisualGuide?: {
    characters: Array<{
      name: string;
      physicalDescription: string;
      clothing: string;
      distinctiveFeatures: string;
    }>;
  };
}): Promise<{
  chapters: VisualChapter[];
}> {
  const isComicStyle = bookData.dialogueStyle === 'bubbles';
  const wordsPerPage = Math.ceil(bookData.targetWords / bookData.targetChapters);

  // Build character reference for consistency
  const characterRef = bookData.characterVisualGuide
    ? bookData.characterVisualGuide.characters.map(c =>
        `${c.name}: ${c.physicalDescription}. Wears: ${c.clothing}. Distinct: ${c.distinctiveFeatures}`
      ).join('\n')
    : bookData.characters.map(c => `${c.name}: ${c.description}`).join('\n');

  const dialogueInstructions = isComicStyle
    ? `
For each page, include "dialogue" array with speech bubbles:
- 1-4 dialogue entries per page (short, punchy comic dialogue)
- Each entry has: speaker (character name), text (the speech), position (where on image), type (speech/thought/shout)
- Positions: "top-left", "top-right", "bottom-left", "bottom-right", "top-center", "bottom-center"
- Comic dialogue is SHORT - max 15 words per bubble

PANEL LAYOUTS - IMPORTANT FOR COMICS:
Each page should specify a "panelLayout" to vary the visual pacing:
- "splash" - Full page single image (use for dramatic moments: 4-5 pages)
- "two-panel" - Split into 2 panels showing a sequence (most common: 8-10 pages)
- "three-panel" - 3 panels showing action/reaction (good for dialogue: 5-6 pages)
- "four-panel" - 4 panels for rapid sequences (action scenes: 3-4 pages)

For multi-panel pages, the scene description should describe what happens ACROSS all panels in sequence.
Example: "Panel 1: Hero spots danger. Panel 2: Hero leaps into action. Panel 3: Villain turns in surprise."
`
    : `
For each page, the "text" field contains the prose that appears under/around the image.
Keep text short and age-appropriate (${wordsPerPage} words average per page).
`;

  const prompt = `You are creating a detailed page-by-page outline for an illustrated ${isComicStyle ? 'comic/graphic story' : 'picture book'}.

BOOK DETAILS:
- Title: "${bookData.title}"
- Genre: ${bookData.genre}
- Premise: ${bookData.premise}
- Beginning: ${bookData.beginning}
- Middle: ${bookData.middle}
- Ending: ${bookData.ending}
- Style: ${bookData.writingStyle}
- Total pages: ${bookData.targetChapters}
- Total words: ~${bookData.targetWords}

CHARACTERS (use these EXACT descriptions for consistency):
${characterRef}

Create EXACTLY ${bookData.targetChapters} pages. Each page needs BOTH the text/dialogue AND a detailed scene description for illustration.

${dialogueInstructions}

For EVERY page's "scene", provide:
- location: The specific place/setting (e.g., "castle kitchen", "forest clearing", "city rooftop") - VARY THIS!
- description: What's happening in this specific moment (1-2 sentences, UNIQUE to this page)
- characters: Array of character names appearing in this scene (don't include protagonist on every page!)
- characterActions: Object mapping each character to their specific action/pose/expression in THIS scene
- background: Environmental details, objects, atmosphere, time of day
- mood: The emotional tone (tense, joyful, mysterious, peaceful, exciting, etc.)
- cameraAngle: How to "shoot" this scene - be specific! ("extreme close-up of eyes", "wide establishing shot", "low angle looking up", "bird's eye view", "over-shoulder shot")

CRITICAL RULES FOR VISUAL VARIETY:

LOCATIONS & SETTINGS:
1. Use AT LEAST 4-6 DIFFERENT LOCATIONS throughout the story (not the same room/place!)
2. Each location should appear only 2-3 times maximum
3. Locations can include: different rooms, outdoor areas, vehicles, fantasy spaces, etc.
4. Even within the same location, change the specific area (different corner, angle, time of day)

CHARACTER VARIETY:
5. The protagonist should NOT appear in every single image - show supporting characters alone sometimes
6. At least 3-4 pages should focus on OTHER characters without the main hero
7. Create scenes with different character groupings (solo, pairs, groups)
8. Show characters interacting with the environment, not just each other

VISUAL COMPOSITION:
9. Each page MUST be visually distinct - different actions, poses, and compositions
10. Vary camera angles dramatically: close-ups, wide shots, bird's eye, worm's eye, over-shoulder
11. Change character positions in frame (left, right, center, foreground, background)
12. Include dynamic actions: running, jumping, reaching, fighting, hiding, discovering, etc.

STORY PACING:
13. Show PROGRESSION - don't just describe states, show active moments
14. Include establishing shots (environment with small characters)
15. Include intimate moments (close-ups of faces/hands)
16. Avoid repetitive staging - no "character standing and talking" on multiple pages

Output ONLY valid JSON:
{
  "chapters": [
    {
      "number": 1,
      "title": "Page Title",
      "text": "${isComicStyle ? 'Minimal narration if needed' : 'The prose text for this page'}",
      "summary": "Brief summary of what happens",
      "targetWords": ${wordsPerPage},
      ${isComicStyle ? `"panelLayout": "two-panel",
      "dialogue": [
        {"speaker": "Character", "text": "Short speech!", "position": "top-left", "type": "speech"}
      ],` : ''}
      "scene": {
        "location": "Specific place (castle courtyard, dark alley, bedroom, etc.)",
        "description": "What's happening - action-focused, unique to this page",
        "characters": ["Only characters IN THIS scene"],
        "characterActions": {
          "Character1": "dynamic action: leaping, crouching, shouting, laughing",
          "Character2": "different action with emotion"
        },
        "background": "Time of day, weather, objects, atmosphere",
        "mood": "emotional tone",
        "cameraAngle": "specific: extreme close-up, wide shot, low angle, over-shoulder, bird's eye"
      }
    }
  ]
}`;

  const result = await getGeminiPro().generateContent(prompt);
  const response = result.response.text();

  return parseJSONFromResponse(response) as {
    chapters: VisualChapter[];
  };
}

export async function generateOutline(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  characters: { name: string; description: string }[];
  beginning: string;
  middle: string;
  ending: string;
  writingStyle: string;
  targetWords: number;
  targetChapters: number;
}): Promise<{
  chapters: {
    number: number;
    title: string;
    summary: string;
    pov?: string;
    targetWords: number;
  }[];
}> {
  const prompt = `You are a professional book outliner. Create a detailed chapter-by-chapter outline.

BOOK DETAILS:
- Title: ${bookData.title}
- Genre: ${bookData.genre}
- Type: ${bookData.bookType}
- Premise: ${bookData.premise}
- Characters: ${JSON.stringify(bookData.characters)}
- Beginning: ${bookData.beginning}
- Key Plot Points/Middle: ${bookData.middle}
- Ending: ${bookData.ending}
- Writing Style: ${bookData.writingStyle}
- Target Length: ${bookData.targetWords} words (${bookData.targetChapters} chapters)

Create an outline with exactly ${bookData.targetChapters} chapters. For each chapter provide:
1. Chapter number
2. Chapter title (engaging, evocative)
3. 2-3 sentence summary of what happens
4. Which characters appear (for POV tracking)
5. Approximate word count target (distribute ${bookData.targetWords} words across chapters)

Output ONLY valid JSON in this exact format:
{
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title Here",
      "summary": "2-3 sentence summary of events",
      "pov": "Main character name for this chapter",
      "targetWords": 3500
    }
  ]
}`;

  const result = await getGeminiPro().generateContent(prompt);
  const response = result.response.text();

  return parseJSONFromResponse(response) as {
    chapters: {
      number: number;
      title: string;
      summary: string;
      pov?: string;
      targetWords: number;
    }[];
  };
}

export async function generateChapter(data: {
  title: string;
  genre: string;
  bookType: string;
  writingStyle: string;
  outline: object;
  storySoFar: string;
  characterStates: object;
  chapterNumber: number;
  chapterTitle: string;
  chapterPlan: string;
  chapterPov?: string;
  targetWords: number;
  chapterFormat: string;
}): Promise<string> {
  const formatInstruction = {
    numbers: `Start with "Chapter ${data.chapterNumber}"`,
    titles: `Start with "${data.chapterTitle}"`,
    both: `Start with "Chapter ${data.chapterNumber}: ${data.chapterTitle}"`,
    pov: `Start with "${data.chapterPov?.toUpperCase() || 'NARRATOR'}\n\nChapter ${data.chapterNumber}"`,
  }[data.chapterFormat] || `Start with "Chapter ${data.chapterNumber}: ${data.chapterTitle}"`;

  const prompt = `You are a novelist writing in ${data.writingStyle} style. Write a complete chapter.

BOOK: "${data.title}" (${data.genre} ${data.bookType})

FULL OUTLINE:
${JSON.stringify(data.outline, null, 2)}

STORY SO FAR:
${data.storySoFar || 'This is the beginning of the story.'}

CHARACTER STATES:
${JSON.stringify(data.characterStates || {}, null, 2)}

NOW WRITE CHAPTER ${data.chapterNumber}: "${data.chapterTitle}"

Chapter plan: ${data.chapterPlan}
Target words: ${data.targetWords}
${data.chapterPov ? `Point of view: ${data.chapterPov}` : ''}

FORMATTING: ${formatInstruction}

Write the complete chapter. Include:
- Vivid descriptions and sensory details
- Natural dialogue with character voice
- Internal thoughts and emotions
- Scene transitions
- End at a natural breaking point

STRICT STYLE RULES:
- NEVER use em dashes (—) or en dashes (–). Use commas, periods, or rewrite sentences instead.
- NEVER add "[END OF BOOK]", "[THE END]", or any ending markers
- NEVER add author notes, meta-commentary, or markdown formatting
- Use simple, natural punctuation only

Write approximately ${data.targetWords} words. Output ONLY the chapter text.`;

  const result = await getGeminiPro().generateContent(prompt);
  let content = result.response.text();

  // Post-process: remove AI artifacts
  content = content
    // Remove end markers
    .replace(/\*?\*?\[?(THE )?END( OF BOOK)?\]?\*?\*?/gi, '')
    .replace(/\*\*\[END OF BOOK\]\*\*/gi, '')
    // Replace em dashes and en dashes with commas or nothing
    .replace(/—/g, ', ')
    .replace(/–/g, ', ')
    .replace(/ , /g, ', ')
    .replace(/,\s*,/g, ',')
    // Clean up any trailing whitespace
    .trim();

  return content;
}

export async function summarizeChapter(chapterContent: string): Promise<string> {
  const prompt = `Summarize this chapter in exactly 150 words. Focus on:
- Key plot events that happened
- Character development or revelations
- Any setups that need payoff later
- Where characters ended up (location, emotional state)

Be factual and precise. This summary will be used to maintain story continuity.

CHAPTER TEXT:
${chapterContent}`;

  const result = await getGeminiFlash().generateContent(prompt);
  return result.response.text();
}

export async function updateCharacterStates(
  currentStates: Record<string, object>,
  chapterContent: string,
  chapterNumber: number
): Promise<Record<string, object>> {
  const prompt = `Based on this chapter, update the character state tracking.

CURRENT CHARACTER STATES:
${JSON.stringify(currentStates, null, 2)}

CHAPTER ${chapterNumber} CONTENT:
${chapterContent}

For each character that appeared or was mentioned, update their state with:
- last_seen: chapter number
- status: current situation (location, condition)
- knows: array of important knowledge they have
- goal: their current motivation

Output ONLY valid JSON with the updated character states.`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    return parseJSONFromResponse(response) as Record<string, object>;
  } catch {
    return currentStates;
  }
}

export async function generateCoverPrompt(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  authorName: string;
  artStyle?: string;
  artStylePrompt?: string;
  characterVisualGuide?: {
    characters: Array<{
      name: string;
      physicalDescription: string;
      clothing: string;
      distinctiveFeatures: string;
      colorPalette: string;
    }>;
    styleNotes: string;
  };
  visualStyleGuide?: {
    overallStyle: string;
    colorPalette: string;
    lightingStyle: string;
    moodAndAtmosphere: string;
  };
}): Promise<string> {
  const styleInstruction = bookData.artStylePrompt
    ? `Art Style: ${bookData.artStylePrompt}`
    : '';

  // Build character descriptions for cover from visual guide
  let characterSection = '';
  if (bookData.characterVisualGuide && bookData.characterVisualGuide.characters.length > 0) {
    characterSection = `
MAIN CHARACTERS (if featuring characters on cover, use these EXACT descriptions):
${bookData.characterVisualGuide.characters.slice(0, 2).map(c =>
  `- ${c.name}: ${c.physicalDescription}. Wearing: ${c.clothing}. Distinctive: ${c.distinctiveFeatures}. Colors: ${c.colorPalette}`
).join('\n')}
`;
  }

  // Build style consistency section
  let styleConsistencySection = '';
  if (bookData.visualStyleGuide) {
    styleConsistencySection = `
STYLE CONSISTENCY (match interior illustrations):
- Overall Style: ${bookData.visualStyleGuide.overallStyle}
- Color Palette: ${bookData.visualStyleGuide.colorPalette}
- Lighting: ${bookData.visualStyleGuide.lightingStyle}
- Mood: ${bookData.visualStyleGuide.moodAndAtmosphere}
`;
  }

  const prompt = `Create a detailed image generation prompt for a professional book cover.

BOOK DETAILS:
- Title: "${bookData.title}"
- Author: "${bookData.authorName}"
- Genre: ${bookData.genre}
- Type: ${bookData.bookType}
- Premise: ${bookData.premise}
${styleInstruction}
${characterSection}
${styleConsistencySection}

Create a prompt for generating a book cover that:
1. Visually represents the book's theme and genre
2. Is professional and suitable for Amazon KDP (1600x2560 portrait)
3. Works well at thumbnail size
4. Has appropriate visual hierarchy
${bookData.artStylePrompt ? `5. Uses the ${bookData.artStyle} art style CONSISTENTLY with interior illustrations` : ''}
${bookData.visualStyleGuide ? '6. Matches the color palette and mood of the interior illustrations' : ''}

The cover MUST include:
- The title "${bookData.title}" prominently displayed
- The author name "${bookData.authorName}" at the bottom

The cover must NOT include:
- Any other text besides title and author name
- Faces with unclear features
- Copyright-infringing elements

${bookData.bookType === 'non-fiction' ? 'For this non-fiction book, a subtitle may be appropriate if it helps convey the value proposition.' : 'This is fiction - focus on mood, atmosphere, and genre conventions.'}

CRITICAL: If this is an illustrated book, the cover art style MUST match the interior illustrations.

Output ONLY the image generation prompt, nothing else.`;

  const result = await getGeminiFlash().generateContent(prompt);
  return result.response.text();
}

// Generate illustration prompts for a chapter
export async function generateIllustrationPrompts(data: {
  chapterNumber: number;
  chapterTitle: string;
  chapterContent: string;
  characters: { name: string; description: string }[];
  artStyle: string;
  illustrationsCount: number;
  bookTitle: string;
}): Promise<Array<{
  scene: string;
  description: string;
  characters: string[];
  emotion: string;
}>> {
  const prompt = `You are an illustrator planning illustrations for a book chapter.

BOOK: "${data.bookTitle}"
CHAPTER ${data.chapterNumber}: "${data.chapterTitle}"

CHARACTERS:
${data.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

ART STYLE: ${data.artStyle}

CHAPTER CONTENT:
${data.chapterContent.substring(0, 3000)}...

Create ${data.illustrationsCount} illustration descriptions for key moments in this chapter.

For each illustration, identify:
1. A specific scene/moment to illustrate
2. A detailed visual description (what to draw, composition, lighting)
3. Which characters appear in the scene
4. The emotional tone

IMPORTANT: The illustrations will NOT have any text. Describe only visual elements.

Output ONLY valid JSON:
{
  "illustrations": [
    {
      "scene": "Brief scene identifier (3-5 words)",
      "description": "Detailed visual description for the artist (50-100 words)",
      "characters": ["character names that appear"],
      "emotion": "primary emotion (joyful, tense, mysterious, etc.)"
    }
  ]
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    const parsed = parseJSONFromResponse(response) as { illustrations: Array<{
      scene: string;
      description: string;
      characters: string[];
      emotion: string;
    }> };
    return parsed.illustrations;
  } catch {
    // Return a single default illustration if parsing fails
    return [{
      scene: `Chapter ${data.chapterNumber} scene`,
      description: `An illustration capturing the essence of chapter ${data.chapterNumber}: ${data.chapterTitle}`,
      characters: data.characters.map(c => c.name),
      emotion: 'engaging',
    }];
  }
}

// Generate illustration for children's book (more detailed, scene-focused)
export async function generateChildrensIllustrationPrompts(data: {
  pageNumber: number;
  pageText: string;
  characters: { name: string; description: string }[];
  setting: string;
  artStyle: string;
  bookTitle: string;
}): Promise<{
  scene: string;
  visualDescription: string;
  characterPositions: string;
  backgroundDetails: string;
  colorMood: string;
}> {
  const prompt = `You are a children's book illustrator planning a full-page illustration.

BOOK: "${data.bookTitle}"
PAGE ${data.pageNumber}

PAGE TEXT:
"${data.pageText}"

CHARACTERS:
${data.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

SETTING: ${data.setting}
ART STYLE: ${data.artStyle}

Create a detailed illustration plan for this page. Children's book illustrations should:
- Be visually engaging and age-appropriate
- Support the text without duplicating it
- Show characters with expressive faces and body language
- Have clear, readable compositions
- Use the full page effectively

CRITICAL: NO TEXT should appear in the illustration. The text will be added separately.

Output ONLY valid JSON:
{
  "scene": "Brief description of the moment (5-10 words)",
  "visualDescription": "Detailed description of what to draw (100+ words)",
  "characterPositions": "Where each character is positioned and what they're doing",
  "backgroundDetails": "Setting elements, objects, environmental details",
  "colorMood": "Color palette and emotional mood (warm, cool, vibrant, etc.)"
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    return parseJSONFromResponse(response) as {
      scene: string;
      visualDescription: string;
      characterPositions: string;
      backgroundDetails: string;
      colorMood: string;
    };
  } catch {
    return {
      scene: `Page ${data.pageNumber} illustration`,
      visualDescription: `A charming illustration for page ${data.pageNumber} showing the scene described in the text`,
      characterPositions: 'Characters centered in the scene',
      backgroundDetails: data.setting,
      colorMood: 'warm and inviting',
    };
  }
}

// Build illustration prompt from scene description (for parallel generation)
export function buildIllustrationPromptFromScene(
  scene: SceneDescription,
  artStylePrompt: string,
  characterVisualGuide?: {
    characters: Array<{
      name: string;
      physicalDescription: string;
      clothing: string;
      distinctiveFeatures: string;
      colorPalette: string;
    }>;
    styleNotes: string;
  },
  visualStyleGuide?: {
    overallStyle: string;
    colorPalette: string;
    lightingStyle: string;
    moodAndAtmosphere: string;
    consistencyRules: string[];
  },
  panelLayout?: PanelLayout
): string {
  // Build character descriptions for characters in this scene
  let characterDescriptions = '';
  if (characterVisualGuide) {
    const sceneCharacters = scene.characters;
    const relevantChars = characterVisualGuide.characters.filter(c =>
      sceneCharacters.some(sc => sc.toLowerCase() === c.name.toLowerCase())
    );
    if (relevantChars.length > 0) {
      characterDescriptions = relevantChars.map(c => {
        const action = scene.characterActions[c.name] || '';
        return `${c.name}: ${c.physicalDescription}, wearing ${c.clothing}, ${c.distinctiveFeatures}${action ? `. Action: ${action}` : ''}`;
      }).join('. ');
    }
  }

  // Build the prompt
  let prompt = `${artStylePrompt}. `;

  // Add location context first
  if (scene.location) {
    prompt += `Setting: ${scene.location}. `;
  }

  // Add scene description
  prompt += `${scene.description}. `;

  // Add character details
  if (characterDescriptions) {
    prompt += `Characters: ${characterDescriptions}. `;
  } else if (scene.characters.length > 0) {
    const actions = Object.entries(scene.characterActions)
      .map(([char, action]) => `${char}: ${action}`)
      .join(', ');
    prompt += `Characters in scene: ${actions}. `;
  }

  // Add background and mood
  prompt += `Environment: ${scene.background}. `;
  prompt += `Mood: ${scene.mood}. `;
  prompt += `Camera angle: ${scene.cameraAngle}. `;

  // Add style guide if available
  if (visualStyleGuide) {
    prompt += `Style: ${visualStyleGuide.overallStyle}. `;
    prompt += `Colors: ${visualStyleGuide.colorPalette}. `;
    prompt += `Lighting: ${visualStyleGuide.lightingStyle}. `;
  }

  // Add panel layout instructions for comics
  if (panelLayout && panelLayout !== 'splash') {
    const layoutInstructions: Record<PanelLayout, string> = {
      'splash': '', // Full page, no special instructions
      'two-panel': 'IMPORTANT: Draw this as a COMIC PAGE with 2 PANELS arranged vertically or horizontally. Each panel shows a different moment in the sequence described. Use clear panel borders with gutters between panels.',
      'three-panel': 'IMPORTANT: Draw this as a COMIC PAGE with 3 PANELS. Can be vertical strip, horizontal strip, or 2+1 layout. Each panel shows a sequential moment. Include clear panel borders and gutters.',
      'four-panel': 'IMPORTANT: Draw this as a COMIC PAGE with 4 PANELS in a 2x2 grid layout. Each panel shows a quick sequential moment for action pacing. Use clear panel borders and consistent gutters.',
    };
    prompt += ` ${layoutInstructions[panelLayout]} `;
  }

  // Add critical instructions
  prompt += 'NO TEXT or letters in the image. Full color illustration.';

  return prompt;
}

export async function generateCoverImage(coverPrompt: string): Promise<string> {
  const fullPrompt = `Professional book cover, high quality, 1600x2560 aspect ratio, suitable for Amazon KDP. ${coverPrompt}`;

  const result = await getGeminiImage().generateContent(fullPrompt);

  // Extract image URL or base64 from response
  const response = result.response;

  // Handle the image response based on Gemini 3 Pro Image API format
  // This may need adjustment based on actual API response structure
  if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
    const imageData = response.candidates[0].content.parts[0].inlineData;
    return `data:${imageData.mimeType};base64,${imageData.data}`;
  }

  throw new Error('Failed to generate cover image');
}

// Generate detailed visual character sheets for consistent illustrations
export async function generateCharacterVisualGuide(data: {
  title: string;
  genre: string;
  artStyle: string;
  characters: { name: string; description: string }[];
}): Promise<{
  characters: Array<{
    name: string;
    physicalDescription: string;
    clothing: string;
    distinctiveFeatures: string;
    colorPalette: string;
    expressionNotes: string;
  }>;
  styleNotes: string;
}> {
  const prompt = `You are an art director creating a character design guide for a ${data.genre} book titled "${data.title}".

The illustrations will be in ${data.artStyle} style.

CHARACTERS TO DESIGN:
${data.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}

Create DETAILED visual descriptions for each character that an illustrator can follow consistently across all illustrations. For each character provide:

1. Physical Description: Age appearance, height/build, face shape, hair (color, style, length), eye color, skin tone
2. Clothing: Their typical outfit in detail (colors, style, accessories)
3. Distinctive Features: Unique identifying marks, props they carry, signature poses/gestures
4. Color Palette: 3-4 specific colors associated with this character
5. Expression Notes: How this character typically expresses emotion, their default expression

Also provide overall style notes for maintaining consistency across illustrations.

CRITICAL: These descriptions will be used to generate AI illustrations. Be VERY specific about visual details. If a character is a child, specify apparent age. If they have a pet or companion, describe it too.

Output ONLY valid JSON:
{
  "characters": [
    {
      "name": "Character Name",
      "physicalDescription": "Detailed physical traits...",
      "clothing": "Typical outfit description...",
      "distinctiveFeatures": "Unique visual identifiers...",
      "colorPalette": "Primary colors for this character...",
      "expressionNotes": "How they show emotion..."
    }
  ],
  "styleNotes": "Overall style guidance for consistency..."
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    return parseJSONFromResponse(response) as {
      characters: Array<{
        name: string;
        physicalDescription: string;
        clothing: string;
        distinctiveFeatures: string;
        colorPalette: string;
        expressionNotes: string;
      }>;
      styleNotes: string;
    };
  } catch {
    // Return a basic guide if parsing fails
    return {
      characters: data.characters.map(c => ({
        name: c.name,
        physicalDescription: c.description,
        clothing: 'Appropriate attire for the story setting',
        distinctiveFeatures: 'As described in character description',
        colorPalette: 'Warm, inviting colors',
        expressionNotes: 'Natural, story-appropriate expressions',
      })),
      styleNotes: `Maintain consistent ${data.artStyle} style throughout all illustrations.`,
    };
  }
}

// Generate a visual style guide for the book's illustrations
export async function generateVisualStyleGuide(data: {
  title: string;
  genre: string;
  artStyle: string;
  artStylePrompt: string;
  premise: string;
  bookFormat: string;
}): Promise<{
  overallStyle: string;
  colorPalette: string;
  lightingStyle: string;
  lineWeight: string;
  backgroundTreatment: string;
  moodAndAtmosphere: string;
  consistencyRules: string[];
}> {
  const prompt = `You are an art director creating a visual style guide for illustrated book.

BOOK DETAILS:
- Title: "${data.title}"
- Genre: ${data.genre}
- Art Style: ${data.artStyle} (${data.artStylePrompt})
- Format: ${data.bookFormat}
- Premise: ${data.premise}

Create a comprehensive style guide that ensures ALL illustrations in this book look like they belong together.

Define:
1. Overall Style: How the ${data.artStyle} style should be interpreted for this specific book
2. Color Palette: Primary, secondary, and accent colors to use throughout
3. Lighting Style: How light and shadow should be rendered
4. Line Weight: Thick/thin lines, outline style, edge treatment
5. Background Treatment: How backgrounds should be handled
6. Mood & Atmosphere: The emotional tone all illustrations should convey
7. Consistency Rules: 5-7 specific rules to maintain visual consistency

Output ONLY valid JSON:
{
  "overallStyle": "Description of the overall visual approach...",
  "colorPalette": "Specific colors and their usage...",
  "lightingStyle": "How to handle light and shadow...",
  "lineWeight": "Line treatment approach...",
  "backgroundTreatment": "How to handle backgrounds...",
  "moodAndAtmosphere": "Emotional tone...",
  "consistencyRules": ["Rule 1", "Rule 2", "Rule 3", "Rule 4", "Rule 5"]
}`;

  const result = await getGeminiFlash().generateContent(prompt);
  const response = result.response.text();

  try {
    return parseJSONFromResponse(response) as {
      overallStyle: string;
      colorPalette: string;
      lightingStyle: string;
      lineWeight: string;
      backgroundTreatment: string;
      moodAndAtmosphere: string;
      consistencyRules: string[];
    };
  } catch {
    return {
      overallStyle: `${data.artStyle} style illustration`,
      colorPalette: 'Harmonious colors appropriate for the genre',
      lightingStyle: 'Natural, consistent lighting',
      lineWeight: 'Medium line weight with clean edges',
      backgroundTreatment: 'Detailed but not distracting backgrounds',
      moodAndAtmosphere: `Appropriate for ${data.genre}`,
      consistencyRules: [
        'Maintain consistent character proportions',
        'Use the same color palette throughout',
        'Keep lighting direction consistent within scenes',
        `Apply ${data.artStyle} style consistently`,
        'Ensure all characters are recognizable across illustrations',
      ],
    };
  }
}
