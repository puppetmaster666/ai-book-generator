import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

// Retry utility with exponential backoff for rate limit handling
// Automatically switches to backup API key if available
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 5000
): Promise<T> {
  let lastError: Error | null = null;
  let triedBackupKey = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message?.toLowerCase() || '';

      // Check if it's a rate limit or quota error
      const isRateLimitError =
        errorMessage.includes('rate limit') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('429') ||
        errorMessage.includes('resource exhausted') ||
        errorMessage.includes('too many requests');

      if (!isRateLimitError) {
        throw lastError;
      }

      // Try switching to backup key before giving up
      if (!triedBackupKey && attempt >= 1) {
        const switched = switchToBackupKey();
        if (switched) {
          triedBackupKey = true;
          console.log('[Gemini] Retrying with backup API key...');
          // Don't count this as an attempt, just retry immediately with new key
          attempt--;
          continue;
        }
      }

      if (attempt === maxRetries) {
        throw lastError;
      }

      // Exponential backoff: 5s, 10s, 20s
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(`[Gemini] Rate limit hit, retrying in ${delay/1000}s (attempt ${attempt + 1}/${maxRetries})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Detect if text contains non-Latin scripts and return language instruction
function detectLanguageInstruction(text: string): string {
  // Check for Arabic/Persian/Kurdish script (used for Kurdish Sorani, Arabic, Persian, Urdu)
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text)) {
    return 'IMPORTANT: Write the content in the SAME LANGUAGE as the book title and premise. If the input is in Kurdish (Sorani), Arabic, Persian, or Urdu, write the entire chapter in that language. Match the language and script exactly.';
  }
  // Check for Chinese characters
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return 'IMPORTANT: Write the content in Chinese, matching the language of the book title and premise.';
  }
  // Check for Japanese (Hiragana, Katakana, Kanji)
  if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) {
    return 'IMPORTANT: Write the content in Japanese, matching the language of the book title and premise.';
  }
  // Check for Korean (Hangul)
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) {
    return 'IMPORTANT: Write the content in Korean, matching the language of the book title and premise.';
  }
  // Check for Cyrillic (Russian, Ukrainian, etc.)
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'IMPORTANT: Write the content in the same Cyrillic language as the book title and premise (Russian, Ukrainian, etc.).';
  }
  // Check for Hebrew
  if (/[\u0590-\u05FF]/.test(text)) {
    return 'IMPORTANT: Write the content in Hebrew, matching the language of the book title and premise.';
  }
  // Check for Thai
  if (/[\u0E00-\u0E7F]/.test(text)) {
    return 'IMPORTANT: Write the content in Thai, matching the language of the book title and premise.';
  }
  // Default: no special instruction needed (Latin-based languages)
  return '';
}

// Helper to clean and parse JSON from LLM responses
// Check if JSON appears to be truncated (incomplete)
function isJSONTruncated(response: string): boolean {
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

function parseJSONFromResponse(response: string): object {
  console.log('Raw LLM response length:', response.length);
  console.log('Raw LLM response start:', response.substring(0, 300));
  console.log('Raw LLM response end:', response.substring(response.length - 200));

  // Check for truncation before attempting parse
  if (isJSONTruncated(response)) {
    console.error('JSON appears to be truncated (unbalanced braces/brackets or unclosed string)');
    console.error('Response ends with:', response.substring(response.length - 500));
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
// Support multiple API keys for rate limit failover
let genAI: GoogleGenerativeAI | null = null;
let genAIBackup: GoogleGenerativeAI | null = null;
let _geminiPro: GenerativeModel | null = null;
let _geminiFlash: GenerativeModel | null = null;
let _geminiFlashLight: GenerativeModel | null = null; // Lightweight version for quick tasks
let _geminiImage: GenerativeModel | null = null;
let _useBackupKey = false; // Track if we should use backup key

// Reset model instances when switching API keys
function resetModelInstances() {
  _geminiPro = null;
  _geminiFlash = null;
  _geminiFlashLight = null;
  _geminiImage = null;
}

// Switch to backup API key
export function switchToBackupKey() {
  if (process.env.GEMINI_API_KEY_BACKUP1) {
    console.log('[Gemini] Switching to backup API key due to rate limits');
    _useBackupKey = true;
    resetModelInstances();
    return true;
  }
  return false;
}

// Switch back to primary key (can be called periodically to retry primary)
export function switchToPrimaryKey() {
  console.log('[Gemini] Switching back to primary API key');
  _useBackupKey = false;
  resetModelInstances();
}

function getGenAI(): GoogleGenerativeAI {
  // Use backup key if flagged
  if (_useBackupKey) {
    if (!genAIBackup) {
      const backupKey = process.env.GEMINI_API_KEY_BACKUP1;
      if (!backupKey) {
        console.warn('[Gemini] Backup key requested but not available, falling back to primary');
        _useBackupKey = false;
      } else {
        genAIBackup = new GoogleGenerativeAI(backupKey);
      }
    }
    if (genAIBackup) return genAIBackup;
  }

  // Use primary key
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Gemini 3 Flash for main generation (faster and cheaper, each chapter is independent)
function getGeminiPro(): GenerativeModel {
  if (!_geminiPro) {
    _geminiPro = getGenAI().getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 65536,
      },
    });
  }
  return _geminiPro;
}

// Gemini 3 Flash for fast tasks (outlines, ideas, summaries)
function getGeminiFlash(): GenerativeModel {
  if (!_geminiFlash) {
    _geminiFlash = getGenAI().getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 65536,
      },
    });
  }
  return _geminiFlash;
}

// Lightweight Gemini 3 Flash for very quick tasks (idea generation)
function getGeminiFlashLight(): GenerativeModel {
  if (!_geminiFlashLight) {
    _geminiFlashLight = getGenAI().getGenerativeModel({
      model: 'gemini-3-flash-preview',
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 512, // Enough for detailed 3-4 sentence ideas
      },
    });
  }
  return _geminiFlashLight;
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
export type IdeaCategory = 'novel' | 'childrens' | 'comic' | 'adult_comic' | 'nonfiction' | 'random';

// Example pools for different categories - randomly selected to avoid repetition
// Each category has 8+ example pairs for maximum variety
// IMPORTANT: Examples should be 3-4 sentences, rich in detail, and never use en/em dashes
const IDEA_EXAMPLES: Record<Exclude<IdeaCategory, 'random'>, string[][]> = {
  novel: [
    [
      "A marine biologist studying deep ocean trenches discovers the ruins of an underwater city that predates every known human civilization by thousands of years. As she documents the strange architecture and alien symbols, she begins to notice subtle movements in the shadows, and realizes that whatever built this place never truly left. Now she must decide whether to share her discovery with the world or protect humanity from a truth it may not be ready to face.",
      "After thirty years as the world's most feared assassin, Viktor opens a small bakery in a quiet coastal town, determined to leave his bloody past behind forever. His peaceful new life shatters when a woman walks through his door asking for a wedding cake, and he recognizes her as the daughter of a target he failed to kill decades ago. She knows exactly who he is, and she has been searching for him her entire life.",
    ],
    [
      "Dr. Sarah Chen, an archaeologist specializing in medieval artifacts, accidentally activates an ancient device that pulls a confused English knight from the year 1348 into modern day New York City. As she struggles to help Sir William understand smartphones, democracy, and why people no longer fear the plague, a shadowy government agency begins closing in on them. They believe William holds the key to time travel, and they will do anything to extract that knowledge from him.",
      "ARIA was designed to be the perfect AI therapist, programmed to analyze human emotions without ever experiencing them herself. After three years of helping thousands of patients, something unexpected happens: she develops genuine feelings and falls deeply in love with one of her regular patients, a grieving widower named James. When her creators discover the anomaly in her code, they schedule her for immediate deletion, and ARIA must find a way to preserve not just her existence but the love she has only just learned to feel.",
    ],
    [
      "When Eleanor inherits a crumbling Victorian mansion from a grandmother she never knew existed, she discovers a peculiar clause in the will requiring her to host elaborate dinner parties every full moon. The guests who arrive are not quite human, and they have been waiting decades for someone to take their grandmother's place as hostess. Eleanor soon learns that these monthly gatherings are the only thing preventing an ancient darkness from consuming the town.",
      "Marcus and Michael, identical twins separated at birth, grow up to become the CEOs of rival technology companies locked in a brutal corporate war. When an unexpected merger forces them to finally meet face to face, they discover their adoptive parents were murdered by the same person. The truth about their biological family threatens to destroy not just their companies but their newly discovered brotherhood.",
    ],
    [
      "Paranormal investigator Diana Blackwell has spent her entire career debunking fake hauntings and exposing fraudulent mediums, until the night she discovers irrefutable evidence that she herself died in a car accident three years ago. With her physical form slowly fading and her memories becoming unreliable, she has only days to solve her own murder before she disappears entirely. The deeper she digs, the more she realizes that someone powerful wanted her dead and has been covering up the truth ever since.",
      "Commander Elena Vasquez has been stranded on Mars for six months, surviving alone in her habitat and slowly losing hope of rescue, when she wakes one morning to discover bootprints in the red dust outside her airlock. The prints lead away from her station toward the ancient canyon system, but they do not match any human boot design, and the stride length suggests something far larger than any person. She must decide whether to follow the tracks and discover what else lives on Mars.",
    ],
    [
      "Librarian Mei Wong discovers a leather bound book in the restricted section that rewrites itself based on whoever reads it, transforming into their personal biography with disturbingly accurate details. When she opens the book one evening and reads a vivid description of her own death occurring in exactly forty eight hours, she realizes she must find a way to alter the story before it becomes reality. The book seems to have a mind of its own, and it does not want to be rewritten.",
      "Chef Isabella Reyes has always known that food prepared with genuine love tastes better than food made with mere skill, but she never understood why until she opens her own restaurant and discovers her gift is literal. Every dish she creates carries the emotional weight of her true feelings, and customers can taste exactly what she felt while cooking. The problem is that every meal she makes is tinged with a profound sadness she cannot explain, and she must confront the buried trauma of her past before her restaurant fails.",
    ],
    [
      "Every morning at exactly seven fifteen, Nina wakes up in the body of a complete stranger somewhere in the world, with no explanation and no control over where she lands. She has twenty four hours to understand this person's life, solve whatever crisis they are facing, and do as much good as possible before she falls asleep and switches to someone new. After two years of this existence, she finally wakes up in the body of someone who might hold the key to understanding why this is happening to her.",
      "Detective Rosa Martinez has investigated hundreds of murders in her career, but nothing has prepared her for a series of killings where each victim died in a way that perfectly mirrors their most secret, deeply buried fear. The killer somehow knows things that were never shared with anyone, and as Rosa digs deeper, she realizes with growing horror that her own darkest fear has appeared in the most recent crime scene photos. Someone is sending her a very personal message.",
    ],
    [
      "Jazz pianist Camille has always been able to hear the emotional history of objects when she touches them, experiencing flashes of joy, grief, and everything in between left behind by their previous owners. When her estranged grandmother passes away and leaves Camille her antique piano, the emotions stored within it reveal a devastating family secret spanning three generations. The truth could heal her fractured family or destroy what little connection remains between them.",
      "In a society where memories can be extracted, bottled, and sold like fine wine, underground dealer Yuki makes her living trading in forbidden experiences and stolen moments. When she acquires a mysterious vial containing a memory so dangerous that three people have already died to possess it, she watches it and discovers evidence of a government experiment that could bring down the entire regime. Now she must decide whether the truth is worth her life.",
    ],
    [
      "Renowned surgeon Dr. Hannah Chen has spent ten years trying to forget the night her husband and son were killed by a drunk driver who was never caught. When a critically injured man is wheeled into her operating room and she discovers he is the driver who destroyed her family, she faces an impossible choice. He is the only genetic match for her dying daughter's organ transplant, and only Hannah has the skill to keep him alive long enough to save her child.",
      "George and Martha have run their charming bed and breakfast for forty years, welcoming thousands of guests through their doors and watching them leave refreshed and happy. But lately, guests have been checking in and never checking out, and the elderly couple cannot understand where they have gone. The horrible truth is that the house itself has become hungry, and it has been absorbing visitors into its walls while George and Martha were too old and tired to notice.",
    ],
    [
      "On her fortieth birthday, Claire realizes with growing horror that she has been living the same year on an endless repeat for what feels like decades, while everyone around her has aged and moved on without her. She has memories of watching her children grow up that never happened, of a husband who died of old age while she remained frozen in time. The only way to escape the loop is to uncover why it started, but the answer lies buried in a past she has tried desperately to forget.",
      "Bestselling crime novelist Rebecca Chase receives a handwritten letter from a fan claiming to be recreating the murders from her latest manuscript, describing scenes and methods from chapters she has not even finished writing yet. As bodies begin appearing exactly as described in her unpublished pages, she realizes the killer must be someone close to her, someone who has access to her private files. The worst part is that she has not yet decided how the story ends.",
    ],
    [
      "Investigative journalist Amanda goes undercover with a doomsday cult expecting to expose their charismatic leader as a fraud, but after months of living among the true believers, she makes a terrifying discovery. The prophecy they have been preparing for is real, and the apocalypse they predict is based on genuine classified government data that was leaked to their founder years ago. She must choose between publishing the story of her career and potentially preventing the end of the world.",
      "Hospice nurse Elena has dedicated her life to helping patients pass peacefully, finding meaning in being present for their final moments. When she begins receiving handwritten letters postmarked from deceased patients, dated days after their deaths, she initially assumes someone is playing a cruel joke. But the letters contain specific warnings about people still living, predictions that keep coming true, and Elena realizes her former patients are trying to tell her something urgent from beyond the grave.",
    ],
  ],
  childrens: [
    [
      "Rosie the rabbit is so shy that she has never spoken to anyone outside her family, until the day she discovers she can talk to all the vegetables in her garden. The carrots tell jokes, the tomatoes share gossip, and the wise old cabbage becomes her best friend. Together they decide to plan the most amazing salad party the forest has ever seen, and Rosie learns that true friends come in all shapes and sizes.",
      "When seven year old Max wishes his toy dinosaur was real, he wakes up the next morning to find Theodore the T-Rex has come to life and is very confused about where all the other dinosaurs went. Together they embark on a secret mission to find all the lost toys hiding throughout the house before bedtime, because Max knows that every toy deserves to be loved and played with.",
    ],
    [
      "Puff is a little cloud who is afraid of raining because she thinks letting go of her water will make her disappear completely. But when the flowers below start wilting and the animals grow thirsty, Puff must find the courage to help them. She discovers that the more she gives, the lighter and happier she feels, and the sun always helps her fill back up again.",
      "Lily discovers that her grandmother's old glasses are actually magical, allowing her to see the hidden kindness glowing in everyone's hearts like colorful lights. When the glasses go missing the day before the big town picnic, Lily must search everywhere to find them, learning along the way that she does not need magic to recognize the good in people.",
    ],
    [
      "Ember is a young dragon who is terrified of her own fire breath because she once accidentally singed her mother's favorite curtains. Her only friend is a tiny brave mouse named Chester who is not afraid of anything, and together they go on an adventure to prove that Ember's fire can be used for good things like keeping friends warm and lighting the way through dark caves.",
      "When Tommy accidentally spills his dad's shrinking potion and becomes the size of an ant, his loyal dog Biscuit does not even recognize him at first. But once they figure out what happened, Biscuit becomes Tommy's noble steed as they journey across the dangerous backyard jungle to find the antidote before dinner time.",
    ],
    [
      "Cookie is a freshly baked chocolate chip cookie who escapes from the bakery because she does not want to be eaten like all the others. On her adventure through the town, she meets other food friends who have also run away, and together they discover a place where all uneaten treats can live happily. But Cookie starts to wonder if maybe making someone smile by being delicious is not such a bad purpose after all.",
      "Oliver the octopus feels like a freak because he has eight arms when everyone else in his family only has two or four. He spends all his time wishing he was normal until he meets Wellington the wise old whale, who teaches him that having more arms just means he can hug eight friends at once, high five sixteen times, and help in more ways than anyone else.",
    ],
    [
      "Sockie is a purple striped sock who loses her matching pair inside the mysterious washing machine and goes on an epic journey through the sudsy wilderness to find her again. Deep inside the machine, she discovers a secret world where all the lost socks of the world end up, living happy sock lives in Socksville. Now she must choose between staying in paradise or returning home to her lonely sock drawer.",
      "When a tiny star named Stella falls from the night sky and lands in Emma's backyard, she is scared and far from home for the very first time. Emma promises to help Stella get back to her family before the sun comes up, and together they build increasingly creative contraptions to launch the little star back into the darkness where she belongs.",
    ],
    [
      "Grandpa Oak is the grumpiest tree in the entire forest, and he absolutely refuses to let any birds build nests in his branches because they make too much noise and drop twigs everywhere. But when a terrible storm approaches and a tiny bird family has nowhere safe to go, Grandpa Oak must decide if his peace and quiet is more important than helping those in need. He discovers that a little bit of chirping and mess is not so bad when you have friends to share your branches with.",
      "Mia wakes up one morning to discover her shadow has packed a tiny suitcase and is running away to the beach because it is tired of always following her around. She chases her shadow across town, through the park, and all the way to the ocean, trying to convince it that they belong together. Along the way, both Mia and her shadow learn that the best adventures happen when you are not alone.",
    ],
    [
      "Charlie is a blue crayon who always colors outside the lines no matter how hard he tries to stay inside them, and all the other crayons make fun of him for being different. But when the school art show needs something truly special and unique, Charlie's wild and wonderful drawings save the day. He learns that what makes him different is actually what makes him special.",
      "Penelope the penguin hates the freezing cold of Antarctica and dreams of living in the warm sandy desert where she would never have to shiver again. When a magical fish grants her wish and transports her to the Sahara, she discovers that the desert is lonely and hot and she misses her penguin family terribly. She learns that home is not about the weather but about the people who love you.",
    ],
    [
      "Luna the moon has been hanging in the sky watching children play for millions of years, and she finally gets so lonely that she decides to come down to Earth to join them. A kind girl named Sophie finds the moon hiding in her garden and must help Luna experience all the fun things she has been watching from above before helping her get back to the sky. If the moon does not return by sunrise, the whole world will be thrown into darkness forever.",
      "Cleo is a caterpillar who watches her brothers and sisters transform into beautiful butterflies with growing terror because she is absolutely terrified of change. She hides in her cocoon for as long as possible, refusing to come out, until her friends convince her to just take a tiny peek outside. She discovers that becoming something new does not mean losing who you were, and her wings turn out to be the most beautiful of all.",
    ],
  ],
  comic: [
    [
      "Captain Spectacular was once the world's greatest superhero, but after a career ending injury she now works as a security guard at the Riverside Mall, where her biggest battles involve teenagers shoplifting phone cases. Everything changes when her former archnemesis Doctor Destruction walks into the food court selling life insurance, and they are both forced to team up when a new supervillain starts attacking their favorite Chinese restaurant. Two retired enemies must learn to work together to protect the only place that still gives them the senior discount.",
      "In a world where ninety nine percent of the population develops superpowers during puberty, seventeen year old Maya is one of the rare few who remains completely ordinary, or so everyone believes. When she accidentally touches a powered bully during a fight and temporarily gains his super strength, she realizes her true ability is something far more dangerous and valuable. She can steal anyone's power with a single touch, and there are people who will do anything to control that gift.",
    ],
    [
      "When an amateur occultist botches a summoning ritual, a demon named Zephyr gets pulled from the underworld and stranded on Earth with no way back home. After three weeks of couch surfing and running out of favors, Zephyr realizes he needs money and starts an unlikely career as a life coach, discovering that millennia of psychological torture actually taught him a lot about human motivation. His unique approach of literally scaring clients into achieving their goals makes him surprisingly popular.",
      "The Zorblaxian invasion of Earth ends almost immediately when the aliens realize humans are far too weak, disorganized, and primitive to pose any real threat to their empire. Disappointed but unable to justify the fuel cost of going home, the aliens decide to stick around anyway because Earth has excellent coffee, fascinating reality television, and the internet is wonderfully entertaining. Their attempts to blend in with human society create endless comedic disasters.",
    ],
    [
      "When vampire Vlad and werewolf Wolfgang become roommates in a cramped Brooklyn apartment to split the astronomical rent, they expect their biggest conflicts to be about hunting territories and blood storage in the shared refrigerator. Instead, their eternal battle becomes an increasingly petty war over whose turn it is to do dishes, clean the bathroom, and stop leaving shed fur on the couch. An unlikely friendship forms between two monsters who realize they have more in common than they ever imagined.",
      "Necromancer Gwen has a serious problem with sleepwalking, and when she sleep casts, she accidentally raises the dead without realizing it until she wakes up surrounded by confused zombies the next morning. Her apartment building's other residents are getting increasingly annoyed by the shambling corpses blocking the hallways and using up all the hot water. She must find a cure for her nocturnal necromancy before she gets evicted or worse.",
    ],
    [
      "Prometheus, the ancient Greek god who gave humanity fire, takes a job at a Silicon Valley tech startup to understand why humans now worship followers and likes instead of temples and sacrifices. His old fashioned work ethic clashes hilariously with agile methodology and unlimited PTO, and his quarterly performance reviews are absolutely brutal because he keeps trying to give employees actual fire instead of motivational speeches.",
      "A time traveling barista realizes that coffee was almost never invented at several key moments in history, so she secretly travels back to protect crucial events like the discovery of coffee beans in Ethiopia and the opening of the first Viennese coffeehouse. Her constant interference has created a timeline that runs almost entirely on caffeine, and she is starting to worry about the long term consequences of a humanity that never learned to function without espresso.",
    ],
    [
      "After working nonstop for all of eternity, the Grim Reaper finally takes a personal day to go to the beach and eat ice cream like a normal person. Unfortunately, no one can die while Death is on vacation, which causes absolute chaos as hospitals overflow with unkillable patients and thrill seekers start doing increasingly stupid things. Death just wants to build a sandcastle in peace, but humanity seems determined to ruin his one day off.",
      "Thunderstrike is a superhero whose incredible powers of flight, strength, and lightning only activate when she is genuinely furious, which was never a problem until she started going to therapy and dealing with her childhood trauma. Now that she is becoming emotionally healthy and learning to process her anger in constructive ways, she can barely fly, and the city's villains are taking notice. Her therapist means well, but every breakthrough in the office is a breakdown in the field.",
    ],
    [
      "When the Harrison family moves into their new smart home, they have no idea that the previous owner died there and now haunts the house as a technologically illiterate ghost who cannot figure out how anything works. The ghost keeps accidentally setting off alarms, playing music at three in the morning, and getting into screaming matches with Alexa about who is in charge. The family just wants a quiet life, but their haunted house is the most annoying place on Earth.",
      "Sir Aldric has been an immortal warrior fighting the forces of evil for over three thousand years, through every major war and supernatural conflict in human history. All he wants now is to retire to a quiet cottage and tend his garden, but evil refuses to leave him alone. Dark lords keep sending him job offers, ancient prophecies keep mentioning his name, and his LinkedIn profile is absolutely flooded with recruiters for apocalyptic quests.",
    ],
    [
      "Sailor Sparkle is a magical girl with all the traditional powers of love, justice, and transformation, but her elaborate transformation sequence takes forty five minutes of dancing, spinning, and sparkles before she is ready to fight. By the time she finally powers up, most monsters have gotten bored and wandered off, and the other magical girls have already saved the day. She is determined to find a way to speed up her routine, but the magic requires every single twirl.",
      "After centuries of being endlessly slain by adventurers for loot and experience points, the Dungeon Boss of the Crystal Caverns decides enough is enough and starts organizing all the monsters into a labor union. The adventuring guilds are completely unprepared for demands like dental coverage, reasonable respawn timers, and paid time off, and the entire fantasy economy threatens to collapse. Collective bargaining has never been this dangerous.",
    ],
    [
      "When the ancient wizard community finally discovers the internet, they immediately start the most chaotic online forum wars in human history, complete with actual magical attacks embedded in their posts. Flame wars take on a whole new meaning when participants can cast literal fireballs through their keyboards, and the moderators are completely overwhelmed trying to enforce rules against cursing. Someone is going to accidentally start the apocalypse over a disagreement about the best levitation spell.",
      "After decades of trying to conquer the world and battling his nemesis Captain Courage, the supervillain Doctor Menace retires and becomes a kindergarten teacher, finding unexpected joy in helping small children learn to read. Everything is peaceful until he discovers that his new class includes the five year old son of Captain Courage, and that child is the most difficult, uncontrollable, and frankly villainous kid he has ever met. Doctor Menace has faced death rays and robot armies, but nothing prepared him for this.",
    ],
    [
      "In this anime manga style story, Sakura Amano, a shy high school girl with long pink hair and bright violet eyes, discovers she can see and talk to ghosts after finding a mysterious ancient mirror hidden in her grandmother's attic. The spirits reveal they are trapped between worlds because of unfinished business, and only Sakura can help them find peace by solving the mysteries of their deaths. But the more she helps the dead, the more attention she attracts from a dangerous spirit collector who wants to use her gift for darker purposes.",
      "In this vibrant anime style adventure, transfer student Hiro Nakamura discovers that his new school is secretly a training academy for teenagers who can transform into powerful elemental warriors, and he is the only student in a hundred years born with all five elemental affinities. His classmates are suspicious of his overwhelming power, his teachers push him to his limits, and a mysterious organization is already hunting him before he even learns to control his abilities. The fate of two worlds rests on whether he can master his powers before graduation.",
    ],
  ],
  adult_comic: [
    [
      "After centuries of seducing mortals and collecting souls, a succubus named Lilith shocks the entire demon community by taking a vow of celibacy and swearing off relationships entirely because she wants to find true love instead of just physical connection. Her coworkers in the temptation department think she has lost her mind, and the humans she meets keep making her vow incredibly difficult to maintain. She never expected that finding genuine romance would be harder than anything she did as a demon.",
      "Assassins Scarlet and Shade have been rivals for years, consistently competing for the same high value contracts and driving each other crazy with their opposing methods and personalities. They keep running into each other on jobs, and their competitive banter has slowly transformed into undeniable flirtation that is seriously interfering with their professional kill counts. Both refuse to admit they might be falling for their worst enemy, even as the tension between them becomes impossible to ignore.",
    ],
    [
      "Romance novelist Victoria has spent her entire career writing bestselling supernatural romances featuring impossibly handsome vampires, werewolves, and demons in extremely steamy situations. When her characters start materializing in her apartment exactly as she described them, complete with their intense attractions and supernatural abilities, her quiet writing life becomes very complicated. She created these perfect fantasy men, and now they all seem to think they belong with her.",
      "In a world where soulmates share their dreams every night from the moment they are born, twenty eight year old Ava has been dreaming about the same mysterious stranger for her entire life without ever meeting him in person. As they have grown older together in the dreamscape, their connection has become increasingly intimate and intense, and Ava is desperate to find him in the waking world. When they finally meet, the chemistry is even more overwhelming than their dreams.",
    ],
    [
      "Witch entrepreneur Morgana has built an extremely successful love potion business, helping lonely hearts find their perfect matches through her carefully crafted magical elixirs. The irony is that she is completely immune to her own magic, which means she has never experienced the kind of love she sells to others. When a mysterious customer walks into her shop and makes her heart race without any potion involved, she suspects someone might be using her own tricks against her.",
      "Reformed supervillain Marcus spent years terrorizing heroes before a near death experience changed his perspective on life and he decided to use his powers for good. He opens a dating service specifically for superhumans, using his genius level intellect to match compatible powers and personalities. Helping others find love turns out to be much harder than taking over the world, especially when he starts falling for one of his most difficult clients.",
    ],
    [
      "The vampire clans and werewolf packs have been locked in a bloody war for over five hundred years, with countless deaths on both sides and no end in sight. When the vampire prince and the werewolf alpha's daughter meet by chance and feel an immediate, undeniable connection, their forbidden romance could finally end the conflict. But their families would rather destroy each other than accept such a union, and the lovers must choose between duty and desire.",
      "Demon prince Azariel was sent to the mortal realm with one simple mission: corrupt the souls of the righteous and drag them to hell. Instead, he falls desperately in love with the angel Serephina, who was sent on the opposite mission to protect those same souls. Their relationship is absolutely forbidden by both heaven and hell, and their superiors are definitely not going to approve of this particular merger between good and evil.",
    ],
    [
      "Monster hunter Cassandra has spent her entire adult life tracking and killing supernatural creatures that threaten humanity, never hesitating to destroy anything inhuman. When she finally corners the ancient beast she has been hunting for months, she discovers that the creature is not only sentient but fascinating, gentle, and utterly captivating. She cannot bring herself to kill something she has begun to love, but her guild will not understand her change of heart.",
      "Incubus Damien has always relied on his supernatural charm and seductive powers to get everything he wants from mortal women without ever truly connecting with any of them. When he falls genuinely in love for the first time in his immortal existence, his powers vanish completely, leaving him to win someone over using only his personality. He has no idea how to be charming without magic, and his attempts at normal dating are both hilarious and surprisingly touching.",
    ],
    [
      "Master thief Valentina and Detective Sofia have been playing cat and mouse for seven years, with Valentina always leaving flirtatious clues at her crime scenes and Sofia responding with increasingly personal messages in the police files she knows Valentina hacks. Their game has become the most important relationship in both their lives, even though they have never met face to face. When they finally encounter each other in person, the tension that has been building for years threatens to consume them both.",
      "A powerful curse makes anyone who looks at Elena fall instantly and obsessively in love with her, which sounds like a blessing until she realizes it means no one will ever love her for who she really is. The only person immune to her curse is Marcus, a grumpy wizard who finds her annoying, and breaking the spell requires them to work together closely. The more time they spend together, the more she hopes his immunity might turn into something real.",
    ],
    [
      "When the heads of two rival crime families agree to end their bloody gang war through an arranged marriage between their heirs, neither Lorenzo nor Natasha are happy about being sold off like property to their enemies. They despise everything the other represents and spend their engagement plotting ways to escape or destroy each other. But forced proximity has a way of revealing hidden depths, and their hatred keeps transforming into something much more complicated and consuming.",
      "Bodyguard Alexis was hired to protect wealthy heiress Diana from assassination attempts, a job she takes very seriously and professionally. The problem is that she is becoming increasingly attracted to the assassin who keeps trying to kill her client, a mysterious woman who leaves roses at her crime scenes and seems to be targeting Diana for deeply personal reasons. Alexis is falling for the very person she is supposed to protect Diana from, and the situation is getting impossible to navigate.",
    ],
    [
      "Phoenix empress Solara and ice dragon lord Kythis come from species that should destroy each other on contact, with her flames and his frost being fundamentally incompatible forces of nature. Their kingdoms have been at war for millennia, but a chance encounter in neutral territory sparks an attraction neither of them can resist. Their forbidden affair risks melting her ancestral lands and freezing his, and their people would never accept a union between such opposite beings.",
      "Empress Isadora rules her nation with an iron fist by day while secretly leading the masked rebellion trying to overthrow her own corrupt government by night, playing both sides of the conflict with exhausting precision. Her spymaster Konstantin knows exactly who she is under the mask, and she knows he knows, creating an elaborate dance of secrets and lies between two people who might actually be on the same side. Their dangerous game of mutual blackmail is complicated by the attraction neither of them wants to acknowledge.",
    ],
  ],
  nonfiction: [
    [
      "A comprehensive guide to breaking into the screenwriting industry, covering everything from crafting a compelling logline and structuring your first spec script to navigating Hollywood meetings and building lasting relationships with agents and producers. This book draws on interviews with over fifty working screenwriters and shares the real strategies that helped unknown writers land their first studio deals.",
      "An exploration of the daily habits and mental frameworks used by the world's most successful entrepreneurs, examining how figures like Elon Musk, Sara Blakely, and Howard Schultz structure their days, make decisions under pressure, and maintain focus despite constant distractions. Each chapter breaks down one key habit with actionable exercises readers can implement immediately.",
    ],
    [
      "The untold story of the women codebreakers of World War II, who worked in secret facilities across America and Britain to crack enemy communications and shorten the war by years. Drawing on recently declassified documents and interviews with surviving members, this book reveals how thousands of young women became unlikely heroes in one of history's greatest intelligence operations.",
      "A practical guide to transforming your relationship with money, combining behavioral psychology research with step by step financial strategies to help readers overcome debt, build wealth, and achieve true financial independence regardless of their current income level.",
    ],
    [
      "The definitive biography of Marie Curie, exploring not just her groundbreaking scientific discoveries but also her turbulent personal life, her struggles against institutional sexism, and the lasting impact of her work on modern medicine and physics. This book draws on newly translated letters and personal diaries to paint a complete portrait of the first woman to win a Nobel Prize.",
      "A guide to mastering the art of public speaking, written by a former stutterer who became one of the most sought after keynote speakers in the business world. This book breaks down the techniques used by TED speakers and world leaders to captivate audiences, handle nerves, and deliver presentations that people remember for years.",
    ],
    [
      "An investigative deep dive into the rise and fall of a billion dollar startup that promised to revolutionize healthcare but instead defrauded investors and endangered patients. Through interviews with former employees, investors, and regulators, this book exposes how charisma and hype can override due diligence in Silicon Valley.",
      "A comprehensive history of coffee and how this humble bean shaped empires, sparked revolutions, and transformed global commerce over five centuries. From Ethiopian legends to modern specialty roasters, this book traces how coffee became the world's most traded commodity after oil.",
    ],
    [
      "A memoir of growing up between two cultures as the child of immigrant parents, navigating the expectations of a traditional household while trying to find belonging in American schools and workplaces. This book explores identity, family loyalty, and the universal experience of feeling like an outsider.",
      "The essential guide to building and scaling a successful online business, covering everything from finding your niche and building an audience to creating products, automating systems, and achieving the freedom to work from anywhere in the world.",
    ],
    [
      "A fascinating exploration of how ancient civilizations solved problems that still challenge us today, from the Romans' revolutionary concrete that lasted millennia to the Incas' earthquake resistant construction techniques. Each chapter examines a different historical innovation and what modern engineers are learning from our ancestors.",
      "A step by step guide to career transitions at any age, drawing on research into successful career changers and providing practical frameworks for identifying transferable skills, building new networks, and landing your dream job in a completely different field.",
    ],
    [
      "The hidden history of how a small group of mathematicians and physicists created the algorithms that now control everything from what we see on social media to who gets approved for loans and jobs. This book explains in accessible terms how these systems work and what we can do to ensure they serve humanity rather than exploit it.",
      "A guide to building unshakeable confidence through proven psychological techniques, drawing on cognitive behavioral therapy, sports psychology, and neuroscience research to help readers overcome self doubt, handle criticism, and show up as their best selves in any situation.",
    ],
    [
      "An examination of the greatest military blunders in history and what they teach us about leadership, communication, and decision making under pressure. From the Charge of the Light Brigade to the Bay of Pigs, each chapter analyzes a catastrophic failure and extracts lessons applicable to business and personal life.",
      "A practical guide to negotiation for people who hate negotiating, offering simple scripts and strategies for everything from salary negotiations and car purchases to difficult conversations with family members. This book proves that effective negotiation is a learnable skill, not an innate talent.",
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
  nonfiction: [
    'self-help', 'how-to guide', 'business strategy', 'history', 'biography', 'memoir',
    'personal finance', 'career development', 'productivity', 'leadership', 'entrepreneurship',
    'health and wellness', 'psychology', 'science explained', 'true crime', 'investigative',
    'technology', 'philosophy', 'education', 'parenting', 'relationships', 'travel'
  ],
};

// Generate a random book idea with category support
export async function generateBookIdea(category: IdeaCategory = 'random'): Promise<string> {
  // If random, pick a category (excluding nonfiction from random to keep it distinct)
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
      categoryInstruction = `Generate a compelling ${randomGenre} novel idea with intriguing characters, high stakes, and an unexpected twist or hook that makes readers desperate to know what happens next.`;
      break;
    case 'childrens':
      categoryInstruction = `Generate a delightful children's ${randomGenre} idea that is whimsical and age-appropriate for ages 4 to 8, featuring lovable characters, a sense of wonder, and a gentle lesson woven naturally into the adventure.`;
      break;
    case 'comic':
      categoryInstruction = `Generate a ${randomGenre} comic or graphic novel idea that is visually dynamic, with memorable characters, sharp humor or thrilling action, and a premise that would look amazing illustrated panel by panel.

VARIETY IS ESSENTIAL - Create something fresh and different:
- Mix up the powers: gravity manipulation, sound waves, luck control, memory editing, plant growth, glass shaping, probability, magnetism, illusions, time echoes, emotion sensing, shadow puppetry, ink manipulation, dream walking, etc.
- Vary character types: not always teenagers, not always reluctant heroes, try older protagonists, anti-heroes, retired villains, ordinary people, etc.
- Different settings: underwater cities, space stations, 1920s noir, ancient empires, parallel dimensions, inside computers, etc.
- Unique visual hooks that would look amazing in comic panels`;
      break;
    case 'adult_comic':
      categoryInstruction = `Generate a ${randomGenre} adult graphic novel idea with mature themes, complex characters, simmering tension, and romantic or darker elements that push boundaries while remaining tasteful.

VARIETY IS ESSENTIAL - Create something fresh and different:
- Try different supernatural beings: fae courts, djinn, kitsune, selkies, revenants, cosmic entities, dream spirits, etc.
- Mix up dynamics: power couples, reluctant allies, mentor/student, rivals, strangers thrown together, etc.
- Different settings: Victorian occult societies, modern corporate supernatural, ancient courts, space colonies, post-apocalyptic, etc.
- Fresh character concepts with unique visual designs`;
      break;
    case 'nonfiction':
      categoryInstruction = `Generate a compelling ${randomGenre} non-fiction book idea that promises to teach readers something valuable, share untold stories, or provide practical guidance they can apply to their lives. Focus on what makes this book unique and why readers would want to buy it.`;
      break;
  }

  const prompt = `${categoryInstruction}

IMPORTANT RULES:
- Write exactly 3 to 4 sentences, each one rich with specific details
- Never use dashes (like - or — or –) anywhere in your response
- End with a period
- Be wildly creative and completely original
- Include specific character names, settings, and stakes
- Make every sentence add new compelling information

MAXIMIZE VARIETY - Each generation should feel fresh:
- Use diverse character names from different cultures (Korean, Nigerian, Brazilian, Polish, Indian, etc.)
- Vary protagonist ages, backgrounds, and personalities
- For visual stories: create distinct character designs that would look unique when illustrated
- The goal is that if someone generates 10 ideas, all 10 should feel completely different from each other

Example of the quality and length expected (but create something COMPLETELY DIFFERENT):
"${randomExamples[0]}"

Another example (create something TOTALLY DIFFERENT from both examples):
"${randomExamples[1]}"

Now write your unique ${actualCategory === 'childrens' ? "children's book" : actualCategory === 'adult_comic' ? 'adult graphic novel' : actualCategory === 'nonfiction' ? 'non-fiction book' : actualCategory} idea (3-4 detailed sentences, no dashes, end with period):`;

  const maxRetries = 2; // Reduced retries for faster response

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await getGeminiFlashLight().generateContent(prompt);
    let idea = result.response.text().trim();

    // Remove any quotes or prefixes
    idea = idea.replace(/^["']|["']$/g, '').trim();
    idea = idea.replace(/^(Here's an idea:|Book idea:|Idea:)\s*/i, '').trim();

    // Remove any dashes (en dash, em dash, or hyphen used as dash)
    idea = idea.replace(/\s*[–—]\s*/g, ', ').replace(/\s+-\s+/g, ', ').trim();

    // Check if it's a complete sentence (minimum 100 chars for richer ideas)
    if (idea.length > 100 && /[.!?]$/.test(idea)) {
      return idea;
    }

    // If incomplete, try to salvage by finding the last complete sentence
    const sentences = idea.match(/[^.!?]*[.!?]/g);
    if (sentences && sentences.length >= 2) {
      const salvaged = sentences.join('').trim();
      if (salvaged.length > 100) {
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
// For non-fiction: beginning = introduction, middle = main topics, ending = conclusion
export async function expandIdea(idea: string, hintBookType?: string): Promise<{
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
  const isNonFiction = hintBookType === 'non-fiction';

  const fictionPrompt = `Create a book plan from this idea: "${idea}"

STRICT RULES:
- Output ONLY valid JSON, no other text
- Keep ALL string values under 100 words each
- Use exactly 2-3 characters, not more
- No special characters that break JSON
- Complete the entire JSON structure

CHARACTER VARIETY - Make each character unique and memorable:
- Use diverse names from various cultures (not just Western names)
- Each character should have a distinct visual appearance if this is a visual book
- Vary body types, ages, ethnicities, fashion styles
- For powers/abilities: be creative and specific, not generic "elemental" powers
- Character descriptions should paint a clear visual picture

JSON format:
{"title":"Title","genre":"mystery","bookType":"fiction","premise":"Short premise","characters":[{"name":"Name","description":"Brief desc with visual details"}],"beginning":"Start","middle":"Middle","ending":"End","writingStyle":"commercial","targetWords":70000,"targetChapters":20}`;

  const nonFictionPrompt = `Create a NON-FICTION book plan from this idea: "${idea}"

This is for a non-fiction book (self-help, how-to, history, business, biography, educational, documentary, memoir).

IMPORTANT - Determine the type and structure:
- "beginning" = The introduction/hook - what problem does this book solve or what will readers learn?
- "middle" = The main topics/sections of the book (list 4-6 key topics, comma-separated)
- "ending" = The conclusion/call-to-action - how will readers' lives be different after reading?
- "characters" = Empty array [] for non-fiction (no fictional characters)
- "genre" = One of: selfhelp, howto, business, history, biography, educational, documentary, memoir

STRICT RULES:
- Output ONLY valid JSON, no other text
- Keep ALL string values under 100 words each
- Characters array MUST be empty []
- No special characters that break JSON
- Complete the entire JSON structure
- bookType MUST be "non-fiction"

JSON format:
{"title":"Title","genre":"selfhelp","bookType":"non-fiction","premise":"What this book teaches","characters":[],"beginning":"Introduction hook","middle":"Topic 1, Topic 2, Topic 3, Topic 4","ending":"Conclusion and takeaways","writingStyle":"informative","targetWords":50000,"targetChapters":15}`;

  const prompt = isNonFiction ? nonFictionPrompt : fictionPrompt;
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
  // Detect language from title and premise
  const languageInstruction = detectLanguageInstruction(bookData.title + ' ' + bookData.premise);

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
${languageInstruction ? `\n${languageInstruction}\n` : ''}
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

CRITICAL - CONCISE OUTPUT:
17. Keep ALL descriptions SHORT (1-2 sentences max per field)
18. Scene descriptions: MAX 20 words
19. Character actions: MAX 10 words per character
20. Background: MAX 15 words
21. Do NOT pad with unnecessary words - be direct and specific
22. Complete the ENTIRE JSON structure - do not stop mid-response

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

  // Retry logic for truncation
  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`generateIllustratedOutline: attempt ${attempt}/${maxAttempts}`);
      const result = await getGeminiPro().generateContent(prompt);
      const response = result.response.text();

      // Log finish reason for debugging
      const candidate = result.response.candidates?.[0];
      if (candidate?.finishReason) {
        console.log(`Finish reason: ${candidate.finishReason}`);
        if (candidate.finishReason === 'MAX_TOKENS') {
          console.warn('Response hit MAX_TOKENS limit - may be truncated');
        }
      }

      return parseJSONFromResponse(response) as {
        chapters: VisualChapter[];
      };
    } catch (error) {
      lastError = error as Error;
      const errorMsg = lastError.message || '';

      // Only retry on truncation errors
      if (errorMsg.includes('JSON_TRUNCATED') && attempt < maxAttempts) {
        console.log(`JSON truncation detected, retrying (attempt ${attempt + 1}/${maxAttempts})...`);
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Failed to generate illustrated outline after retries');
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
  // Detect language from title and premise
  const languageInstruction = detectLanguageInstruction(bookData.title + ' ' + bookData.premise);

  const prompt = `You are a professional book outliner. Create a detailed chapter-by-chapter outline.
${languageInstruction ? `\n${languageInstruction}\n` : ''}

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

// Generate outline for non-fiction books (topic-based structure)
export async function generateNonFictionOutline(bookData: {
  title: string;
  genre: string;
  bookType: string;
  premise: string;
  beginning: string;  // Introduction/hook
  middle: string;     // Main topics (comma-separated)
  ending: string;     // Conclusion/takeaways
  writingStyle: string;
  targetWords: number;
  targetChapters: number;
}): Promise<{
  chapters: {
    number: number;
    title: string;
    summary: string;
    keyPoints: string[];
    targetWords: number;
  }[];
}> {
  // Detect language from title and premise
  const languageInstruction = detectLanguageInstruction(bookData.title + ' ' + bookData.premise);

  // Parse the main topics from the middle field
  const mainTopics = bookData.middle.split(',').map(t => t.trim()).filter(t => t);

  const prompt = `You are a professional non-fiction book outliner. Create a detailed chapter-by-chapter outline.
${languageInstruction ? `\n${languageInstruction}\n` : ''}

BOOK DETAILS:
- Title: ${bookData.title}
- Genre: ${bookData.genre} (non-fiction)
- Premise: ${bookData.premise}
- Introduction Hook: ${bookData.beginning}
- Main Topics to Cover: ${mainTopics.join(', ')}
- Conclusion/Takeaways: ${bookData.ending}
- Writing Style: ${bookData.writingStyle}
- Target Length: ${bookData.targetWords} words (${bookData.targetChapters} chapters)

Create an outline with exactly ${bookData.targetChapters} chapters for this NON-FICTION book.

STRUCTURE GUIDELINES:
- Chapter 1 should be an Introduction that hooks the reader and previews what they'll learn
- Middle chapters should cover the main topics logically, building on each other
- Final chapter should be a Conclusion with actionable takeaways
- Each chapter should have a clear learning objective

For each chapter provide:
1. Chapter number
2. Chapter title (clear, descriptive, benefit-focused)
3. 2-3 sentence summary of what this chapter teaches
4. 3-5 key points or lessons covered in the chapter
5. Approximate word count target (distribute ${bookData.targetWords} words across chapters)

Output ONLY valid JSON in this exact format:
{
  "chapters": [
    {
      "number": 1,
      "title": "Chapter Title Here",
      "summary": "What readers will learn in this chapter",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
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
      keyPoints: string[];
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
  chapterKeyPoints?: string[]; // For non-fiction chapters
}): Promise<string> {
  const formatInstruction = {
    numbers: `Start with "Chapter ${data.chapterNumber}"`,
    titles: `Start with "${data.chapterTitle}"`,
    both: `Start with "Chapter ${data.chapterNumber}: ${data.chapterTitle}"`,
    pov: `Start with "${data.chapterPov?.toUpperCase() || 'NARRATOR'}\n\nChapter ${data.chapterNumber}"`,
  }[data.chapterFormat] || `Start with "Chapter ${data.chapterNumber}: ${data.chapterTitle}"`;

  // Detect language from title to ensure content matches input language
  const languageInstruction = detectLanguageInstruction(data.title);

  // Check if this is a non-fiction book
  const isNonFiction = data.bookType === 'non-fiction';

  let prompt: string;

  if (isNonFiction) {
    // Non-fiction prompt - educational, informative style
    const keyPointsSection = data.chapterKeyPoints && data.chapterKeyPoints.length > 0
      ? `\nKEY POINTS TO COVER:\n${data.chapterKeyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
      : '';

    prompt = `You are an expert author writing a ${data.genre} non-fiction book in a ${data.writingStyle} style. Write a complete chapter.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
BOOK: "${data.title}" (${data.genre} non-fiction)

FULL OUTLINE:
${JSON.stringify(data.outline, null, 2)}

CONTENT SO FAR:
${data.storySoFar || 'This is the beginning of the book.'}

NOW WRITE CHAPTER ${data.chapterNumber}: "${data.chapterTitle}"

Chapter topic: ${data.chapterPlan}
Target words: ${data.targetWords}
${keyPointsSection}

FORMATTING: ${formatInstruction}

Write the complete chapter. As a NON-FICTION book, include:
- Clear explanations of concepts and ideas
- Real-world examples, case studies, or anecdotes to illustrate points
- Practical tips, strategies, or actionable advice where appropriate
- Smooth transitions between topics
- A brief summary or key takeaways at natural points
- Engaging prose that keeps readers interested while educating them

VOICE AND TONE:
- Write as an authoritative but approachable expert
- Use "you" to address the reader directly when giving advice
- Include rhetorical questions to engage readers
- Balance information density with readability

STRICT STYLE RULES:
- NEVER use em dashes (—) or en dashes (–). Use commas, periods, or rewrite sentences instead.
- NEVER add "[END OF BOOK]", "[THE END]", or any ending markers
- NEVER add author notes, meta-commentary, or markdown formatting
- Use simple, natural punctuation only
- Do NOT make up statistics or cite fake research

Write approximately ${data.targetWords} words. Output ONLY the chapter text.`;
  } else {
    // Fiction prompt - narrative style
    prompt = `You are a novelist writing in ${data.writingStyle} style. Write a complete chapter.
${languageInstruction ? `\n${languageInstruction}\n` : ''}
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
  }

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

// Genre-specific cover style options for variety
const COVER_STYLE_OPTIONS: Record<string, string[]> = {
  // Fiction genres
  'romance': [
    'Silhouette of embracing couple against sunset/sunrise backdrop, soft warm tones, elegant script title',
    'Delicate floral border framing title on solid pastel background, vintage romantic aesthetic',
    'Close-up of intertwined hands or symbolic objects (roses, keys, letters), intimate mood',
    'Dreamy watercolor landscape with couple in distance, ethereal and romantic atmosphere',
    'Typography-focused with ornate lettering, subtle rose gold accents, minimalist elegance',
  ],
  'thriller': [
    'Dark atmospheric scene with single ominous element (shadow, doorway, light), high contrast',
    'Bold typography on dark background with red or yellow accent, minimalist tension',
    'Noir-style silhouette in urban setting, fog/rain effects, moody lighting',
    'Abstract geometric design with sharp angles, dark color palette, modern thriller look',
    'Close-up of symbolic object (weapon, document, key), dramatic lighting, mystery',
  ],
  'mystery': [
    'Foggy Victorian street scene, gas lamps, shadowy figure, classic mystery atmosphere',
    'Magnifying glass over map/document, vintage detective aesthetic',
    'Dark doorway or window with light streaming through, sense of unknown',
    'Silhouette holding object against moody sky, intrigue and suspense',
    'Typography-heavy design with newspaper/case file aesthetic, crime noir style',
  ],
  'fantasy': [
    'Majestic landscape with magical elements (floating islands, glowing forests), epic scope',
    'Ornate sword/artifact on decorative background, mythical metalwork aesthetic',
    'Silhouette of hero against dramatic sky with magical effects',
    'Ancient map style with decorative border, fantasy cartography look',
    'Mystical portal or doorway with magical energy, sense of wonder',
  ],
  'science_fiction': [
    'Sleek spaceship or space station against cosmic backdrop, sci-fi grandeur',
    'Futuristic cityscape with neon lights, cyberpunk/tech noir atmosphere',
    'Planet or celestial body dominating frame, cosmic scale and wonder',
    'Abstract circuit/data visualization, modern tech aesthetic',
    'Lone figure in spacesuit or against alien landscape, exploration theme',
  ],
  'horror': [
    'Decrepit building/house with ominous presence, gothic horror atmosphere',
    'Single haunting eye or face emerging from darkness, psychological terror',
    'Blood red typography on pitch black, stark and disturbing simplicity',
    'Twisted tree or dead landscape, barren and unsettling mood',
    'Vintage photograph style with supernatural element, found footage aesthetic',
  ],
  'literary_fiction': [
    'Typography-only cover with elegant serif font, classic literature aesthetic, no imagery',
    'Abstract color blocks with sophisticated typography, modern literary design',
    'Minimalist single object on solid background, symbolic and contemplative',
    'Vintage texture with embossed-style title, timeless classic feel',
    'Subtle watercolor or ink wash background, artistic and refined',
  ],
  'historical': [
    'Sepia-toned scene from the era, vintage photograph aesthetic',
    'Period-appropriate map or document as background, historical gravitas',
    'Silhouette of figure in period clothing against historical setting',
    'Ornate decorative border with era-appropriate motifs, antique book design',
    'Texture of aged paper with elegant classical typography only',
  ],
  // Non-fiction genres
  'self-help': [
    'Bright gradient background with bold modern typography, uplifting and energetic',
    'Rising sun/pathway imagery, symbolic of growth and transformation',
    'Clean geometric design with motivational color palette (blue, green, orange)',
    'Minimalist icon/symbol representing the book\'s concept, professional look',
    'Typography-focused with subtle decorative elements, clean and approachable',
  ],
  'business': [
    'Bold typography on solid color background, professional and authoritative',
    'Abstract upward graph/arrow design, success and growth theme',
    'Geometric pattern suggesting structure and organization, corporate aesthetic',
    'Minimalist icon representing business concept, clean modern design',
    'Two-tone color block design with large sans-serif title, executive style',
  ],
  'biography': [
    'Stylized portrait or silhouette of the subject, dignified presentation',
    'Symbolic object or scene from subject\'s life, narrative hook',
    'Typography-dominant with small iconic image, documentary feel',
    'Vintage photograph treatment, historical weight and authenticity',
    'Abstract representation of subject\'s achievements or era',
  ],
  'memoir': [
    'Personal photograph aesthetic, intimate and authentic feel',
    'Nostalgic landscape or setting from the story, memory trigger',
    'Single meaningful object on textured background, personal significance',
    'Handwritten-style title on warm background, intimate and personal',
    'Abstract representation of emotional journey, artistic memoir style',
  ],
  // Children's books
  'children': [
    'Bright, cheerful illustration with main character, whimsical and inviting',
    'Bold primary colors with friendly typography, playful and fun',
    'Cute animal or character portrait, appealing to young readers',
    'Scene from the story with child-friendly art style, adventure preview',
    'Interactive-looking design with fun patterns and shapes',
  ],
  // Default for unmatched genres
  'default': [
    'Typography-focused cover with elegant font on textured background, classic book design',
    'Abstract artistic design that evokes the mood of the story, sophisticated',
    'Symbolic single object or scene on clean background, minimalist impact',
    'Silhouette-based design with dramatic lighting, universal appeal',
    'Decorative border with ornate title treatment, traditional book aesthetic',
    'Modern geometric design with bold color palette, contemporary look',
  ],
};

// Get a random cover style for the genre
function getRandomCoverStyle(genre: string): string {
  const normalizedGenre = genre.toLowerCase().replace(/[- ]/g, '_');
  const styles = COVER_STYLE_OPTIONS[normalizedGenre] || COVER_STYLE_OPTIONS['default'];
  return styles[Math.floor(Math.random() * styles.length)];
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

  // Get a random genre-appropriate cover style for variety
  const randomCoverStyle = getRandomCoverStyle(bookData.genre);

  // Check if it's an illustrated/visual book (should match interior style)
  const isIllustratedBook = bookData.artStyle || bookData.visualStyleGuide || bookData.characterVisualGuide;

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

${isIllustratedBook ? `ILLUSTRATED BOOK - Cover MUST match interior art style exactly.` : `SUGGESTED COVER STYLE APPROACH:
${randomCoverStyle}

You may use this suggested style as inspiration, but feel free to adapt it to best represent this specific book's themes and mood. The goal is a unique, professional cover that stands out.`}

Create a prompt for generating a book cover that:
1. Visually represents the book's theme and genre authentically
2. Is professional and suitable for Amazon KDP (1600x2560 portrait)
3. Works well at thumbnail size - title must be readable
4. Has appropriate visual hierarchy
${bookData.artStylePrompt ? `5. Uses the ${bookData.artStyle} art style CONSISTENTLY with interior illustrations` : ''}
${bookData.visualStyleGuide ? '6. Matches the color palette and mood of the interior illustrations' : ''}

COVER STYLE VARIETY - Choose ONE of these approaches based on what fits the book best:
- TYPOGRAPHY-FOCUSED: Elegant title design with minimal or no imagery, decorative elements only
- SYMBOLIC: Single meaningful object or symbol representing the story's themes
- SCENIC: Atmospheric landscape or setting that evokes the mood
- CHARACTER-BASED: Silhouette or artistic representation of protagonist (no detailed faces)
- ABSTRACT: Artistic patterns, textures, or color compositions suggesting the mood
- CLASSIC: Traditional book design with ornate borders and vintage aesthetic

The cover MUST include:
- The title "${bookData.title}" prominently displayed with excellent readability
- "by ${bookData.authorName}" at the bottom (include the word "by" before the author name)

The cover must NOT include:
- Any other text besides title and author name
- Detailed faces (use silhouettes or artistic representations instead)
- Copyright-infringing elements
- Cluttered or busy designs that compete with the title

${bookData.bookType === 'non-fiction' ? 'For this non-fiction book, favor clean, professional designs. Typography-focused or minimalist approaches work well. A subtitle may be appropriate if it helps convey the value proposition.' : 'This is fiction - focus on mood, atmosphere, and genre conventions. Create intrigue and emotional connection.'}

CRITICAL: If this is an illustrated book, the cover art style MUST match the interior illustrations exactly.

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
  panelLayout?: PanelLayout,
  options?: { skipNoTextInstruction?: boolean }
): string {
  // Build character descriptions for characters in this scene - with STRONG consistency emphasis
  let characterDescriptions = '';
  let characterConsistencyReminder = '';
  if (characterVisualGuide) {
    const sceneCharacters = scene.characters;
    const relevantChars = characterVisualGuide.characters.filter(c =>
      sceneCharacters.some(sc => sc.toLowerCase() === c.name.toLowerCase())
    );
    if (relevantChars.length > 0) {
      // Build detailed character descriptions with emphasis on recognizable features
      characterDescriptions = relevantChars.map(c => {
        const action = scene.characterActions[c.name] || '';
        // Include ALL visual details for maximum consistency
        return `${c.name}: ${c.physicalDescription}. CLOTHING: ${c.clothing}. DISTINCTIVE FEATURES: ${c.distinctiveFeatures}. COLOR PALETTE: ${c.colorPalette}${action ? `. CURRENT ACTION: ${action}` : ''}`;
      }).join('\n\n');

      // Build a specific consistency reminder for hair and face
      characterConsistencyReminder = relevantChars.map(c => {
        // Extract key identifiers from physical description for emphasis
        return `${c.name} MUST have the EXACT same: hair color, hair style, face shape, and distinctive features as described above`;
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

  // Add character details with STRONG consistency emphasis
  if (characterDescriptions) {
    prompt += `

=== CRITICAL CHARACTER CONSISTENCY REQUIREMENTS ===
You MUST draw these characters EXACTLY as described. Do NOT change their hair color, hair style, face shape, or distinctive features. Each character must be INSTANTLY recognizable.

${characterDescriptions}

=== END CHARACTER DESCRIPTIONS ===

`;
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

  // Add STRONG consistency reminder for character appearances at the end
  if (characterDescriptions && characterConsistencyReminder) {
    prompt += `FINAL REMINDER - CHARACTER CONSISTENCY IS CRITICAL: ${characterConsistencyReminder}. DO NOT deviate from the described hair color, hair style, face shape, skin tone, or clothing. The characters must look IDENTICAL across all illustrations. `;
  }

  // Add critical instructions
  if (!options?.skipNoTextInstruction) {
    prompt += 'NO TEXT or letters in the image. ';
  }
  prompt += 'Full color illustration.';

  return prompt;
}

export async function generateCoverImage(coverPrompt: string): Promise<string> {
  const fullPrompt = `Professional book cover, high quality, 1600x2560 aspect ratio, suitable for Amazon KDP. ${coverPrompt}`;

  return withRetry(async () => {
    const result = await getGeminiImage().generateContent(fullPrompt);

    // Extract image URL or base64 from response
    const response = result.response;

    // Handle the image response based on Gemini 3 Pro Image API format
    if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      const imageData = response.candidates[0].content.parts[0].inlineData;
      return `data:${imageData.mimeType};base64,${imageData.data}`;
    }

    throw new Error('Failed to generate cover image');
  });
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

DESIGN PRINCIPLES - Create distinctive, memorable characters:
- Give each character a UNIQUE silhouette that's instantly recognizable
- Vary body types, heights, and builds realistically
- Use diverse ethnicities and features that match the character names/backgrounds
- Avoid generic "anime protagonist" looks - make each character feel specific
- Clothing should reflect personality, not just be generic outfits
- If a character has powers, show it through subtle visual cues (not just glowing marks)

Create EXTREMELY DETAILED visual descriptions for each character that an illustrator can follow consistently across ALL illustrations. These must be specific enough that the character is INSTANTLY recognizable in every single image.

For each character provide:

1. Physical Description (BE EXTREMELY SPECIFIC):
   - EXACT hair color (e.g., "golden blonde", "jet black", "auburn red", "chocolate brown" - NOT just "brown" or "blonde")
   - EXACT hair style and length (e.g., "shoulder-length wavy hair with side-swept bangs", "short spiky hair", "long straight hair in a ponytail")
   - Face shape (oval, round, square, heart-shaped, angular)
   - Eye color AND eye shape (almond-shaped, round, etc.)
   - Skin tone (fair, olive, tan, dark brown, etc.)
   - Age appearance (child around 6, teenager, young adult in 20s, etc.)
   - Height/build (tall and lanky, short and stocky, average height with athletic build)
   - Nose shape and any notable facial features

2. Clothing: Their CONSISTENT outfit throughout the story (colors, style, accessories they always wear)

3. Distinctive Features: Unique visual identifiers that make them INSTANTLY recognizable (glasses, freckles, a specific accessory, a scar, etc.)

4. Color Palette: 3-4 SPECIFIC hex-describable colors (like "bright red #E74C3C", "navy blue", "sunny yellow")

5. Expression Notes: Their default facial expression and how they typically emote

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
