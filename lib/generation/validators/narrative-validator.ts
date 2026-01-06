/**
 * Narrative Validator - The Math Engine
 *
 * Uses math, not AI, to validate writing quality.
 * This is the core "Building Inspector" that catches AI patterns
 * that AI itself cannot detect.
 *
 * Key metrics:
 * - Sentence Variance: Gary Provost rhythm check (stdDev > 4.2 = human-like)
 * - Name Density: Names per 100 words (target: < 2.5)
 * - Staccato Detection: Too many same-length sentences (robotic pattern)
 * - Loop Detection: Jaccard similarity with previous content
 */

export interface ValidationReport {
  isValid: boolean;
  sentenceVariance: number;           // Standard deviation of sentence lengths
  isStaccato: boolean;                // Too many same-length sentences (5-12 words)
  staccatoRatio: number;              // Percentage of staccato sentences
  nameDensity: number;                // Names per 100 words
  nameDensityExceeded: boolean;
  totalNameCount: number;             // Absolute count of names found
  wordCount: number;                  // Total words in text
  bannedPhrasesFound: string[];       // AI-telltale phrases detected
  loopDetected: boolean;              // Repeating previous content
  loopSimilarity: number;             // Jaccard similarity score
  sentenceLengths: number[];          // Word counts per sentence (for debugging)
  sensoryGrounding: SensoryGroundingReport;  // 4+1 Sensory Rule check
  corrections: string[];              // Surgical feedback for retry prompt
}

/**
 * Sensory Grounding Report (4+1 Sensory Rule)
 *
 * AI writing over-relies on VISUAL descriptions (seeing, looking, watching).
 * Human writing grounds scenes in ALL senses.
 *
 * The Rule: Every 300-word beat MUST contain at least one non-visual sensory word.
 */
export interface SensoryGroundingReport {
  hasGrounding: boolean;              // At least one non-visual sensory word found
  smellWords: string[];               // Detected smell words
  touchWords: string[];               // Detected touch/texture words
  temperatureWords: string[];         // Detected temperature words
  soundWords: string[];               // Detected sound words (non-visual)
  totalNonVisual: number;             // Total count of non-visual sensory words
}

export interface ValidationThresholds {
  minSentenceVariance: number;        // Default: 4.2
  maxNameDensity: number;             // Default: 2.5 per 100 words
  maxStaccatoRatio: number;           // Default: 0.6 (60%)
  maxLoopSimilarity: number;          // Default: 0.4 (40% keyword overlap)
}

const DEFAULT_THRESHOLDS: ValidationThresholds = {
  minSentenceVariance: 4.2,
  maxNameDensity: 2.5,
  maxStaccatoRatio: 0.6,
  maxLoopSimilarity: 0.4,
};

// Common AI-telltale phrases to detect
const BANNED_PHRASES = [
  'a sense of',
  'couldn\'t help but',
  'a mixture of',
  'a wave of',
  'sent a shiver',
  'couldn\'t shake',
  'washed over',
  'settled over',
  'hung in the air',
  'pierced the',
  'cut through the',
  'etched with',
  'a testament to',
  'betrayed no',
  'seemed to',
  'appeared to',
  'managed to',
  'found himself',
  'found herself',
  'couldn\'t deny',
  'the weight of',
  'in that moment',
  'at that moment',
  'for what felt like',
  'time seemed to',
  'the silence stretched',
  'something shifted',
  'a flicker of',
  'a hint of',
  'a trace of',
  'a ghost of a smile',
  'raised an eyebrow',
  'let out a breath',
  'released a breath',
  'held his breath',
  'held her breath',
  'eyes widened',
  'heart pounded',
  'heart raced',
  'pulse quickened',
  'stomach churned',
  'blood ran cold',
  'a chill ran down',
  'electricity coursed',
  'something primal',
];

// Stop words to exclude from keyword extraction
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'what', 'which', 'who', 'whom', 'whose', 'where', 'when',
  'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
  'once', 'her', 'his', 'their', 'our', 'your', 'its', 'him', 'them', 'us',
  'me', 'my', 'mine', 'your', 'yours', 'hers', 'ours', 'theirs', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'under', 'again', 'further', 'while', 'about', 'against', 'until',
  'because', 'although', 'though', 'even', 'still', 'already', 'yet',
  'over', 'back', 'away', 'down', 'out', 'off', 'up', 'around', 'along',
]);

// =============================================================================
// 4+1 SENSORY RULE - Non-Visual Sensory Word Lists
// =============================================================================
// AI writing is 90% visual ("looked", "saw", "watched"). Human writing uses
// all senses. These word lists detect non-visual sensory grounding.

const SMELL_WORDS = new Set([
  // Direct smell references
  'smell', 'smelled', 'smelling', 'smells', 'scent', 'scented', 'odor', 'odour',
  'aroma', 'fragrance', 'stench', 'stink', 'stank', 'reek', 'reeked', 'reeking',
  'whiff', 'sniff', 'sniffed', 'sniffing', 'nose', 'nostrils',
  // Smell descriptors
  'musty', 'musky', 'pungent', 'acrid', 'rancid', 'fetid', 'putrid', 'foul',
  'fragrant', 'perfumed', 'aromatic', 'earthy', 'smoky', 'burnt', 'charred',
  'sour', 'sweet-smelling', 'metallic', 'coppery', 'sulfurous', 'ammonia',
  // Common smells
  'gasoline', 'diesel', 'exhaust', 'smoke', 'tobacco', 'cigarette', 'cigar',
  'coffee', 'bacon', 'bread', 'cooking', 'baking', 'roasting', 'frying',
  'sweat', 'blood', 'rot', 'decay', 'mold', 'mildew', 'chlorine', 'bleach',
  'perfume', 'cologne', 'aftershave', 'shampoo', 'soap', 'detergent',
  'flowers', 'roses', 'lavender', 'pine', 'cedar', 'oak', 'leather',
  'rain', 'petrichor', 'ocean', 'salt', 'seaweed', 'fish',
]);

const TOUCH_WORDS = new Set([
  // Direct touch actions
  'touch', 'touched', 'touching', 'feel', 'felt', 'feeling', 'feels',
  'stroke', 'stroked', 'stroking', 'caress', 'caressed', 'caressing',
  'brush', 'brushed', 'brushing', 'graze', 'grazed', 'grazing',
  'rub', 'rubbed', 'rubbing', 'scratch', 'scratched', 'scratching',
  'grip', 'gripped', 'gripping', 'squeeze', 'squeezed', 'squeezing',
  'press', 'pressed', 'pressing', 'push', 'pushed', 'pull', 'pulled',
  // Texture words
  'rough', 'smooth', 'soft', 'hard', 'silky', 'velvety', 'fuzzy', 'furry',
  'coarse', 'grainy', 'gritty', 'sandy', 'slimy', 'sticky', 'tacky',
  'slick', 'slippery', 'wet', 'damp', 'moist', 'dry', 'parched',
  'leathery', 'papery', 'waxy', 'greasy', 'oily', 'dusty', 'powdery',
  'prickly', 'thorny', 'spiky', 'bristly', 'bumpy', 'lumpy', 'knobby',
  // Physical sensations
  'tingle', 'tingled', 'tingling', 'itch', 'itched', 'itching', 'itchy',
  'ache', 'ached', 'aching', 'throb', 'throbbed', 'throbbing',
  'sting', 'stung', 'stinging', 'burn', 'burned', 'burning',
  'numb', 'numbed', 'numbing', 'numbness', 'prickle', 'prickled',
  'cramp', 'cramped', 'cramping', 'twinge', 'spasm',
  'goosebumps', 'gooseflesh', 'shiver', 'shivered', 'shivering',
  // Body awareness
  'skin', 'fingertips', 'palms', 'calluses', 'callused', 'blisters',
  'sweat', 'sweaty', 'sweating', 'clammy', 'perspiration',
]);

const TEMPERATURE_WORDS = new Set([
  // Cold
  'cold', 'colder', 'coldest', 'cool', 'cooler', 'coolest', 'cooling',
  'chilly', 'chilled', 'chilling', 'freezing', 'frozen', 'frost', 'frosty',
  'icy', 'ice-cold', 'frigid', 'arctic', 'bitter', 'biting', 'crisp',
  'numb', 'numbing', 'shiver', 'shivered', 'shivering', 'goosebumps',
  // Hot
  'hot', 'hotter', 'hottest', 'warm', 'warmer', 'warmest', 'warming',
  'heated', 'heat', 'sweltering', 'scorching', 'scalding', 'burning',
  'searing', 'blistering', 'boiling', 'steaming', 'steamy', 'humid',
  'muggy', 'stuffy', 'stifling', 'oppressive', 'tropical',
  'sweat', 'sweaty', 'sweating', 'perspiring', 'flushed',
  // Temperature transitions
  'draft', 'drafty', 'breeze', 'breezy', 'wind', 'windy', 'gust', 'gusty',
  'chill', 'thaw', 'thawed', 'thawing', 'melt', 'melted', 'melting',
]);

const SOUND_WORDS = new Set([
  // Hearing verbs
  'hear', 'heard', 'hearing', 'hears', 'listen', 'listened', 'listening',
  'sound', 'sounded', 'sounding', 'sounds', 'echo', 'echoed', 'echoing',
  // Volume descriptors
  'loud', 'louder', 'loudest', 'quiet', 'quieter', 'quietest', 'silent',
  'silence', 'silently', 'soft', 'softer', 'muffled', 'muted', 'faint',
  'deafening', 'thunderous', 'piercing', 'shrill', 'blaring',
  // Human sounds
  'whisper', 'whispered', 'whispering', 'murmur', 'murmured', 'murmuring',
  'mumble', 'mumbled', 'mumbling', 'mutter', 'muttered', 'muttering',
  'shout', 'shouted', 'shouting', 'yell', 'yelled', 'yelling',
  'scream', 'screamed', 'screaming', 'shriek', 'shrieked', 'shrieking',
  'groan', 'groaned', 'groaning', 'moan', 'moaned', 'moaning',
  'sigh', 'sighed', 'sighing', 'gasp', 'gasped', 'gasping',
  'laugh', 'laughed', 'laughing', 'giggle', 'giggled', 'giggling',
  'sob', 'sobbed', 'sobbing', 'cry', 'cried', 'crying', 'weep', 'wept',
  'cough', 'coughed', 'coughing', 'sneeze', 'sneezed', 'sneezing',
  'snore', 'snored', 'snoring', 'breathe', 'breathed', 'breathing', 'breath',
  // Mechanical sounds
  'click', 'clicked', 'clicking', 'clack', 'clacked', 'clacking',
  'tick', 'ticked', 'ticking', 'tock', 'buzz', 'buzzed', 'buzzing',
  'hum', 'hummed', 'humming', 'whir', 'whirred', 'whirring',
  'beep', 'beeped', 'beeping', 'ring', 'rang', 'ringing',
  'creak', 'creaked', 'creaking', 'squeak', 'squeaked', 'squeaking',
  'rattle', 'rattled', 'rattling', 'clatter', 'clattered', 'clattering',
  'bang', 'banged', 'banging', 'crash', 'crashed', 'crashing',
  'thud', 'thudded', 'thudding', 'thump', 'thumped', 'thumping',
  'slam', 'slammed', 'slamming', 'snap', 'snapped', 'snapping',
  // Nature sounds
  'rustle', 'rustled', 'rustling', 'whistle', 'whistled', 'whistling',
  'howl', 'howled', 'howling', 'roar', 'roared', 'roaring',
  'thunder', 'thundered', 'thundering', 'rumble', 'rumbled', 'rumbling',
  'patter', 'pattered', 'pattering', 'drip', 'dripped', 'dripping',
  'splash', 'splashed', 'splashing', 'gurgle', 'gurgled', 'gurgling',
  'chirp', 'chirped', 'chirping', 'tweet', 'tweeted', 'tweeting',
  'bark', 'barked', 'barking', 'growl', 'growled', 'growling',
  // Footsteps and movement
  'footsteps', 'footstep', 'step', 'steps', 'stomp', 'stomped', 'stomping',
  'shuffle', 'shuffled', 'shuffling', 'scrape', 'scraped', 'scraping',
]);

export class NarrativeValidator {
  /**
   * Gary Provost Rhythm Check
   *
   * Calculates the standard deviation of sentence lengths.
   * Human writing has high variance (short punchy + long flowing sentences).
   * AI writing tends to be uniform (all 8-12 word sentences).
   *
   * Target: stdDev > 4.2 for human-like flow
   * AI typically hits 1.5 - 3.0 (too uniform)
   */
  static calculateSentenceVariance(text: string): { variance: number; lengths: number[] } {
    // Split on sentence-ending punctuation
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 5); // Ignore very short fragments

    if (sentences.length < 3) {
      return { variance: 0, lengths: [] };
    }

    const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const squaredDiffs = lengths.map(len => Math.pow(len - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    return { variance: stdDev, lengths };
  }

  /**
   * Name Density Check
   *
   * Counts how often character names appear per 100 words.
   * AI overuses names; humans use pronouns when context is clear.
   *
   * Target: < 2.5 names per 100 words
   * AI typically hits 4-5 (name spam)
   */
  static checkNameDensity(text: string, names: string[]): { density: number; count: number; wordCount: number } {
    if (names.length === 0) {
      return { density: 0, count: 0, wordCount: 0 };
    }

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;

    if (wordCount === 0) {
      return { density: 0, count: 0, wordCount: 0 };
    }

    let nameCount = 0;
    for (const name of names) {
      // Match whole word only, case insensitive
      const regex = new RegExp(`\\b${this.escapeRegex(name)}\\b`, 'gi');
      const matches = text.match(regex);
      nameCount += matches ? matches.length : 0;
    }

    const density = (nameCount / wordCount) * 100;
    return { density, count: nameCount, wordCount };
  }

  /**
   * Staccato Detection
   *
   * Detects robotic rhythm: too many sentences of similar length (5-12 words).
   * This creates a choppy, mechanical feel.
   *
   * Flag if > 60% of sentences are in the 5-12 word range.
   */
  static detectStaccato(text: string): { isStaccato: boolean; ratio: number } {
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length < 3) {
      return { isStaccato: false, ratio: 0 };
    }

    const lengths = sentences.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
    const staccatoCount = lengths.filter(len => len >= 5 && len <= 12).length;
    const ratio = staccatoCount / lengths.length;

    return {
      isStaccato: ratio > 0.6,
      ratio,
    };
  }

  /**
   * Loop Detection
   *
   * Detects if the new beat is repeating content from previous beats.
   * Uses Jaccard similarity on significant keywords.
   *
   * Flag if > 40% keyword overlap (likely looping/resetting).
   */
  static detectLoop(
    newText: string,
    previousText: string
  ): { isLoop: boolean; similarity: number; repeatedKeywords: string[] } {
    if (!previousText || previousText.length < 50) {
      return { isLoop: false, similarity: 0, repeatedKeywords: [] };
    }

    const newKeywords = this.extractSignificantKeywords(newText);
    const prevKeywords = this.extractSignificantKeywords(previousText);

    if (newKeywords.length === 0 || prevKeywords.length === 0) {
      return { isLoop: false, similarity: 0, repeatedKeywords: [] };
    }

    const newSet = new Set(newKeywords);
    const prevSet = new Set(prevKeywords);

    // Jaccard similarity: intersection / union
    const intersection = newKeywords.filter(k => prevSet.has(k));
    const unionSize = new Set([...newKeywords, ...prevKeywords]).size;
    const similarity = intersection.length / unionSize;

    return {
      isLoop: similarity > 0.4,
      similarity,
      repeatedKeywords: intersection,
    };
  }

  /**
   * Banned Phrase Detection
   *
   * Finds AI-telltale phrases that signal machine-generated text.
   */
  static detectBannedPhrases(text: string): string[] {
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const phrase of BANNED_PHRASES) {
      if (lowerText.includes(phrase.toLowerCase())) {
        found.push(phrase);
      }
    }

    return found;
  }

  /**
   * Consecutive Same-Starter Detection
   *
   * Counts how many consecutive sentences start with the same word.
   * Human writing rarely has more than 2 in a row.
   */
  static detectConsecutiveSameStarter(text: string): { maxConsecutive: number; word: string } {
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length < 2) {
      return { maxConsecutive: 0, word: '' };
    }

    let maxConsecutive = 1;
    let currentConsecutive = 1;
    let maxWord = '';
    let currentWord = '';

    const starters = sentences.map(s => {
      const firstWord = s.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') || '';
      return firstWord;
    });

    for (let i = 1; i < starters.length; i++) {
      if (starters[i] === starters[i - 1] && starters[i].length > 0) {
        currentConsecutive++;
        currentWord = starters[i];
        if (currentConsecutive > maxConsecutive) {
          maxConsecutive = currentConsecutive;
          maxWord = currentWord;
        }
      } else {
        currentConsecutive = 1;
      }
    }

    return { maxConsecutive, word: maxWord };
  }

  /**
   * Sensory Grounding Detection (4+1 Rule)
   *
   * AI writing is overwhelmingly VISUAL (looked, saw, watched, noticed).
   * Human writing engages all senses. This check ensures beats include
   * at least one non-visual sensory anchor.
   *
   * The Rule: Every ~300 word beat must have smell, touch, temperature, OR sound.
   * If all four are zero, reject the beat.
   */
  static detectSensoryGrounding(text: string): SensoryGroundingReport {
    const lowerText = text.toLowerCase();
    const words = lowerText.match(/\b[a-z]+(?:-[a-z]+)?\b/g) || [];

    const smellWords: string[] = [];
    const touchWords: string[] = [];
    const temperatureWords: string[] = [];
    const soundWords: string[] = [];

    for (const word of words) {
      if (SMELL_WORDS.has(word) && !smellWords.includes(word)) {
        smellWords.push(word);
      }
      if (TOUCH_WORDS.has(word) && !touchWords.includes(word)) {
        touchWords.push(word);
      }
      if (TEMPERATURE_WORDS.has(word) && !temperatureWords.includes(word)) {
        temperatureWords.push(word);
      }
      if (SOUND_WORDS.has(word) && !soundWords.includes(word)) {
        soundWords.push(word);
      }
    }

    const totalNonVisual = smellWords.length + touchWords.length +
                          temperatureWords.length + soundWords.length;

    return {
      hasGrounding: totalNonVisual > 0,
      smellWords,
      touchWords,
      temperatureWords,
      soundWords,
      totalNonVisual,
    };
  }

  /**
   * Full Validation
   *
   * Runs all checks and returns a comprehensive report with surgical feedback.
   */
  static validate(
    text: string,
    names: string[],
    previousText?: string,
    thresholds: Partial<ValidationThresholds> = {}
  ): ValidationReport {
    const config = { ...DEFAULT_THRESHOLDS, ...thresholds };
    const corrections: string[] = [];

    // 1. Sentence variance (Gary Provost rhythm)
    const { variance, lengths } = this.calculateSentenceVariance(text);
    if (variance < config.minSentenceVariance) {
      corrections.push(
        `RHYTHM FAILURE: Sentence variance is ${variance.toFixed(1)} (needs > ${config.minSentenceVariance}). ` +
        `Combine short sentences using 'while', 'although', 'because'. ` +
        `Create one long flowing sentence (20+ words) per paragraph. ` +
        `Add one punchy short sentence (3-5 words) for impact.`
      );
    }

    // 2. Name density
    const { density, count, wordCount } = this.checkNameDensity(text, names);
    if (density > config.maxNameDensity) {
      corrections.push(
        `NAME OVERUSE: ${density.toFixed(1)} names per 100 words (needs < ${config.maxNameDensity}). ` +
        `Found ${count} name mentions in ${wordCount} words. ` +
        `Replace 50% of character names with pronouns or descriptions ` +
        `('the detective', 'the older woman', 'he', 'she').`
      );
    }

    // 3. Staccato detection
    const { isStaccato, ratio: staccatoRatio } = this.detectStaccato(text);
    if (isStaccato) {
      corrections.push(
        `STACCATO RHYTHM: ${(staccatoRatio * 100).toFixed(0)}% of sentences are 5-12 words (max 60%). ` +
        `This sounds robotic. Vary sentence length dramatically: ` +
        `some 3-5 words, some 20-30 words. ` +
        `Use semicolons and em-dashes to create longer flowing sentences.`
      );
    }

    // 4. Loop detection
    const { isLoop, similarity, repeatedKeywords } = previousText
      ? this.detectLoop(text, previousText)
      : { isLoop: false, similarity: 0, repeatedKeywords: [] };

    if (isLoop) {
      corrections.push(
        `LOOP DETECTED: ${(similarity * 100).toFixed(0)}% keyword overlap with previous section. ` +
        `Repeated elements: ${repeatedKeywords.slice(0, 5).join(', ')}. ` +
        `Move the story FORWARD. New location, new revelation, or new conflict required. ` +
        `Do NOT recap what just happened.`
      );
    }

    // 5. Banned phrases
    const bannedPhrasesFound = this.detectBannedPhrases(text);
    if (bannedPhrasesFound.length > 2) {
      corrections.push(
        `AI PATTERNS: Found ${bannedPhrasesFound.length} AI-telltale phrases: ` +
        `"${bannedPhrasesFound.slice(0, 3).join('", "')}"... ` +
        `Rewrite these with fresh, specific language.`
      );
    }

    // 6. Consecutive same-starter
    const { maxConsecutive, word } = this.detectConsecutiveSameStarter(text);
    if (maxConsecutive > 2) {
      corrections.push(
        `REPETITIVE STARTERS: ${maxConsecutive} consecutive sentences start with "${word}". ` +
        `Maximum allowed: 2. Vary sentence openings: ` +
        `prepositional phrases, dependent clauses, object-first structures.`
      );
    }

    // 7. Sensory grounding (4+1 rule)
    const sensoryGrounding = this.detectSensoryGrounding(text);
    if (!sensoryGrounding.hasGrounding) {
      corrections.push(
        `SENSORY VOID: No non-visual sensory words found. ` +
        `AI writing is 90% visual—human writing uses ALL senses. ` +
        `Add at least ONE of these: ` +
        `SMELL (coffee, smoke, perfume, musty), ` +
        `TOUCH (rough, smooth, cold metal, sticky), ` +
        `TEMPERATURE (chilly, warm, humid, sweating), ` +
        `SOUND (click, hum, footsteps, silence). ` +
        `Ground the reader in the physical world.`
      );
    }

    const isValid = corrections.length === 0;

    return {
      isValid,
      sentenceVariance: variance,
      isStaccato,
      staccatoRatio,
      nameDensity: density,
      nameDensityExceeded: density > config.maxNameDensity,
      totalNameCount: count,
      wordCount,
      bannedPhrasesFound,
      loopDetected: isLoop,
      loopSimilarity: similarity,
      sentenceLengths: lengths,
      sensoryGrounding,
      corrections,
    };
  }

  /**
   * Quick Check (for performance)
   *
   * Runs only the most critical checks for fast validation.
   */
  static quickCheck(
    text: string,
    names: string[],
    thresholds: Partial<ValidationThresholds> = {}
  ): { isValid: boolean; primaryIssue: string | null } {
    const config = { ...DEFAULT_THRESHOLDS, ...thresholds };

    // Check variance first (most common issue)
    const { variance } = this.calculateSentenceVariance(text);
    if (variance < config.minSentenceVariance) {
      return {
        isValid: false,
        primaryIssue: `Sentence variance ${variance.toFixed(1)} < ${config.minSentenceVariance}`,
      };
    }

    // Check name density
    const { density } = this.checkNameDensity(text, names);
    if (density > config.maxNameDensity) {
      return {
        isValid: false,
        primaryIssue: `Name density ${density.toFixed(1)} > ${config.maxNameDensity}`,
      };
    }

    return { isValid: true, primaryIssue: null };
  }

  // === Helper Methods ===

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static extractSignificantKeywords(text: string): string[] {
    // Extract words 4+ characters, excluding stop words
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const filtered = words.filter(w => !STOP_WORDS.has(w));
    return [...new Set(filtered)];
  }
}

// Export default thresholds for reference
export const VALIDATION_THRESHOLDS = DEFAULT_THRESHOLDS;

// Export banned phrases for external use
export { BANNED_PHRASES };
