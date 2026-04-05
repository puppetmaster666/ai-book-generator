'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, ArrowLeft, Upload, X, Loader2, Sparkles, Clock } from 'lucide-react';

const ROAST_LOADING_MESSAGES = [
  'Writing insults...',
  'Studying their worst angles...',
  'Consulting the burn unit...',
  'Loading embarrassing scenarios...',
  'Drafting apology letters in advance...',
  'Calibrating the cringe meter...',
  'Sharpening the roast knives...',
  'Finding their most unflattering poses...',
  'Warming up the comedy writers...',
  'Preparing emotional damage...',
  'Gathering blackmail material...',
  'Turning up the heat...',
  'Almost ready to ruin friendships...',
  'Illustrating their downfall...',
  'Making art out of their suffering...',
];
import type { Metadata } from 'next';

const PERSONALITY_TAGS = [
  'The Loud One',
  'The Cheap One',
  'The Gym Bro',
  'The Ladies Man',
  'The Nerd',
  'The Party Animal',
  'The Liar',
  'The Lazy One',
  'The Know-It-All',
  'The Drama Queen',
  'The Fuckboy',
  'The Hot Mess',
];

const SEVERITY_LABELS: Record<number, { label: string; emoji: string; description: string }> = {
  1: { label: 'Friendly', emoji: '😄', description: 'Light teasing, nothing mean' },
  2: { label: 'Spicy', emoji: '🌶️', description: 'Embarrassing but still funny' },
  3: { label: 'Brutal', emoji: '💀', description: 'No mercy, real roast energy' },
  4: { label: 'Nuclear', emoji: '☢️', description: 'Comedy Central Roast level. They will never forgive you.' },
};

const ART_STYLES = [
  { key: 'shonen', label: 'Shonen Anime' },
  { key: 'animated', label: 'Western Animation' },
  { key: 'realistic', label: 'Realistic' },
  { key: 'puppet', label: 'Puppet / Doll' },
];

interface RoastCharacter {
  name: string;
  photo: string | null;
  personality: string;
}

export default function RoastPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [characters, setCharacters] = useState<RoastCharacter[]>([
    { name: '', photo: null, personality: '' },
  ]);
  const [severity, setSeverity] = useState(2);
  const [scenario, setScenario] = useState('');
  const [artStyle, setArtStyle] = useState('shonen');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const msgRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isSubmitting) {
      setElapsedSeconds(0);
      setLoadingMsgIndex(0);
      timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
      msgRef.current = setInterval(() => {
        setLoadingMsgIndex(i => (i + 1) % ROAST_LOADING_MESSAGES.length);
      }, 3000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (msgRef.current) clearInterval(msgRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (msgRef.current) clearInterval(msgRef.current);
    };
  }, [isSubmitting]);

  const addCharacter = () => {
    if (characters.length < 4) {
      setCharacters([...characters, { name: '', photo: null, personality: '' }]);
    }
  };

  const removeCharacter = (index: number) => {
    if (characters.length > 1) {
      setCharacters(characters.filter((_, i) => i !== index));
    }
  };

  const updateCharacter = (index: number, field: keyof RoastCharacter, value: string | null) => {
    const updated = [...characters];
    (updated[index] as any)[field] = value;
    setCharacters(updated);
  };

  const handleSubmit = async () => {
    const namedChars = characters.filter(c => c.name.trim());
    if (namedChars.length === 0) {
      setError('Add at least one character name');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const severityInfo = SEVERITY_LABELS[severity];
      const charDescriptions = namedChars.map((c, i) => {
        const parts = [c.name.trim()];
        if (c.personality) parts.push(`personality: ${c.personality}`);
        return `${i + 1}. ${parts.join(', ')}`;
      }).join('\n');

      const nuclearPrompt = `NUCLEAR ROAST MODE. Channel the energy of Jeff Ross, Greg Giraldo, Anthony Jeselnik, and Nikki Glaser at their absolute cruelest. This must be the kind of roast that makes people gasp before they laugh.

ROAST WRITING RULES:
1. SPECIFICITY OVER GENERALITY: Every roast line must feel custom-built for THIS person. Never write a joke that could apply to anyone. Use their name, their personality traits, their habits.
2. ATTACK THE IDENTITY, NOT THE SURFACE: The meanest roasts target how someone sees themselves. Reframe their achievements as failures. Question their confidence. Imply their friends are pretending to like them.
3. ZERO SOFTENING: Never write "just kidding," "but seriously," or any hedge. Every line is delivered as absolute truth. No safety net. No winks.
4. STACK HITS ON THE SAME WOUND: Do not roast one thing and move on. Hit it, then hit it again from a different angle, then a third time. The repetition says "this is not a joke, this is just the truth."
5. USE COMPLIMENT STRUCTURE: The cruelest roasts sound nice on the surface. "I admire your confidence" is devastating in context. "You are genuinely the most interesting person in any room where you are the only person."
6. BE FORENSIC: Write as if you have studied the target's entire life, apartment, search history, and dating profile. The invasion of privacy is what stings.
7. ESCALATE WITHIN EACH SECTION: Each joke must be meaner than the last. The first opens the wound, the second pours salt, the third lights it on fire.
8. CREATE VIVID IMAGES: "You look like a thumb with a LinkedIn profile" beats "you are boring." Visual insults stick.
9. USE THE GENEROUS INTERPRETATION TRICK: Give them every benefit of the doubt and make it STILL devastating. "You are doing the best you can. And the fact that THIS is the best you can is... remarkable."
10. TARGET THE GAP between self-image and reality. Expose the distance between how they see themselves and how the world sees them.

TECHNIQUES TO USE:
- The Compliment Bomb: Start with genuine praise, then detonate. "You are one of the nicest people I know. And I mean that in the saddest way possible."
- The False Defense: "Everyone is being so mean. Leave them alone. It is not their fault they peaked in sixth grade."
- The Comparison Kill: "You dress like your outfit was described to a police sketch artist." "You have the energy of a Craigslist couch listed as 'still good.'"
- The Future Forecast: Predict a bleak future with comedic specificity.
- The Obituary: "When they die, the priest at their funeral will struggle. He will say 'they were... present. Definitely present in a lot of rooms.'"
- The Confidence Autopsy: Attack their right to feel good about themselves. "The amount of confidence you have is one of the great mysteries of our time."
- The Dating Profile Demolition: "You are the kind of person people settle for after their therapist convinces them their standards are too high."
- The Life Summary: "If your life was a movie, it would go straight to DVD. Not streaming. Physical DVD. At a gas station."

Make every chapter a multi-hit assault. No mercy. No redemption arc. Maximum vulgarity, maximum embarrassment. Adult humor, crude jokes, humiliating situations. The goal: jokes they will think about at 3 AM.`;

      const friendlyPrompt = `FRIENDLY ROAST MODE. Think best man speech energy. You love this person, and that is exactly why you are qualified to tease them.

TONE: Warm, affectionate, "we love you BUT..." Every joke should make the target laugh, not wince.

ROAST WRITING RULES:
1. INSIDE JOKE ENERGY: Write jokes that feel like they come from someone who genuinely knows and loves this person. Reference their quirks and habits with affection.
2. LIGHT TEASING ONLY: Target harmless things like their taste in music, their cooking, their texting habits, how long they take to get ready. Never anything that could actually hurt.
3. ALWAYS END ON LOVE: Every roast section should land on "but we love you anyway" energy. The warmth is what makes the teasing work.
4. THE GENTLE CALLOUT: "We all know you think you can cook. We have all tasted your food. We just love you too much to say anything."
5. PLAYFUL EXAGGERATION: Take a small quirk and blow it up to absurd proportions. "You take so long to reply to texts that archaeologists have started carbon-dating your messages."
6. KEEP IT CLEAN: No vulgarity, no crude humor. This should be something you could read at a family dinner and everyone laughs.

Make it feel like a toast that accidentally became a roast. Funny, specific to them, but ultimately a love letter disguised as jokes.`;

      const spicyPrompt = `SPICY ROAST MODE. Think comedy roast but you still have to see this person at Thanksgiving. Push boundaries, make them blush, but keep it funny.

TONE: Embarrassing, cringe-inducing, "I cannot believe you just said that" energy. The target should be laughing but also covering their face.

ROAST WRITING RULES:
1. EMBARRASSING STORIES: Build scenarios around their most cringe personality traits. If they are clumsy, put them in a situation where it costs them. If they are vain, have a mirror betray them.
2. BACKHANDED COMPLIMENTS: "You are honestly so brave for wearing that." "I admire that you just do not care what people think. Clearly."
3. THE AWKWARD TRUTH: Say the thing everyone thinks but nobody says out loud. "We all pretend to like your playlist at parties. We do not."
4. DATING LIFE TEASING: Their love life, their exes, their taste in partners, their flirting skills. All fair game. "Your type is basically anyone who makes eye contact for more than two seconds."
5. SOCIAL MEDIA ROAST: Their selfie angles, their captions, their stories nobody watches, their LinkedIn flexing.
6. PUSH BUT DO NOT SHOVE: You can make them uncomfortable, but not hurt. The goal is blush-laughing, not silence.
7. SPECIFICITY: Use their personality traits as ammunition. Generic jokes are weak. "You specifically" jokes hit different.

Make every page something they would screenshot and send to their friends saying "I am being ATTACKED." But they are laughing while they type it.`;

      const brutalPrompt = `BRUTAL ROAST MODE. Think Comedy Central Roast energy. The gloves are off. You are not here to be nice, you are here to be funny, and funny means mean.

TONE: Savage, unapologetic, "did they really just say that" energy. The audience gasps, then laughs. The target laughs because the alternative is crying.

ROAST WRITING RULES:
1. GO FOR THE JUGULAR: Target their insecurities, their failed ambitions, their questionable life choices. Nothing is sacred.
2. THE COMPARISON KILL: "You look like [devastating comparison]." "You dress like [brutal visual]." "Your apartment looks like [unflattering place]." Make comparisons so specific and vivid they become impossible to forget.
3. THE RESUME ROAST: Take their proudest accomplishments and reframe them as embarrassments. "You say you are an entrepreneur. You sold candles on Etsy for three months and quit."
4. STACK YOUR HITS: Do not roast one thing and move on. Hit it twice, three times. Each angle worse than the last.
5. THE THIRD-PARTY ROAST: Roast them through other people. "Your mom still introduces you as 'my child who is figuring things out.' You are 34."
6. CONFIDENCE DESTRUCTION: "The gap between your confidence and your abilities is genuinely inspiring. Delusional, but inspiring."
7. DARK HUMOR WELCOME: Death jokes, failure jokes, loneliness jokes. If it is funny, it is fair game.
8. NO SOFTENING: Do not write "just kidding" or "but seriously." Commit to every line like it is a fact, not a joke.
9. THE DATING DEMOLITION: Their love life is an open target. Past relationships, current dry spells, questionable choices. All of it.
10. ESCALATE: Start mean, get meaner. Every page should be worse than the last. Build to a crescendo of destruction.

TECHNIQUES TO USE:
- The Hypothetical Murder: "If you went missing, the search party would take a lunch break and just not come back."
- The Life Movie: "If your life was a movie, it would be straight to DVD. At a gas station. In the discount bin."
- The Future Forecast: "In ten years you will be the person at the reunion everyone is nice to out of pity."
- The Scientific Observation: "You are not ugly. You are just aggressively plain. Dermatologists could use your face as a control group."

Make it sting. Make them question their life choices. Make their friends cry-laugh. No mercy, no redemption arc, just relentless, hilarious destruction.`;

      const severityPrompt = severity === 1
        ? friendlyPrompt
        : severity === 2
          ? spicyPrompt
          : severity === 3
            ? brutalPrompt
            : nuclearPrompt;

      const idea = scenario.trim()
        ? `ROAST COMIC: ${scenario.trim()}\n\nSeverity level: ${severityInfo.label} (${severityInfo.description})\n${severityPrompt}\n\nCharacters (these are real people being roasted, make it personal and funny):\n${charDescriptions}`
        : `ROAST COMIC: Create a hilarious and ${severityInfo.label.toLowerCase()} roast comic about these people. Put them in the most embarrassing, ridiculous situations possible. Make it a story that their friends would die laughing at.\n\nSeverity level: ${severityInfo.label} (${severityInfo.description})\n${severityPrompt}\n\nCharacters (these are real people being roasted, make it personal based on their personalities):\n${charDescriptions}`;

      // Expand idea
      const expandRes = await fetch('/api/expand-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          bookType: 'fiction',
          isIllustrated: true,
        }),
      });

      if (!expandRes.ok) throw new Error('Failed to create roast story');
      const bookPlan = await expandRes.json();

      // Override AI defaults for roast format (12 panels, not 20-24)
      delete bookPlan.targetChapters;
      delete bookPlan.targetWords;

      // Create book
      const bookRes = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookPlan,
          bookPreset: 'comic_story',
          bookFormat: 'picture_book',
          artStyle,
          dialogueStyle: 'bubbles',
          targetWords: 600,
          targetChapters: 12,
          userId: (session?.user as any)?.id || null,
          contentRating: severity >= 3 ? 'mature' : 'general',
        }),
      });

      if (!bookRes.ok) throw new Error('Failed to create book');
      const { bookId } = await bookRes.json();

      // Upload first character photo if provided
      const firstPhoto = namedChars.find(c => c.photo);
      if (firstPhoto?.photo) {
        try {
          const base64 = firstPhoto.photo.includes(',') ? firstPhoto.photo.split(',')[1] : firstPhoto.photo;
          const mimeMatch = firstPhoto.photo.match(/data:([^;]+);/);
          await fetch(`/api/books/${bookId}/stylize-protagonist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64,
              mimeType: mimeMatch?.[1] || 'image/jpeg',
            }),
          });
        } catch {
          // Non-fatal
        }
      }

      router.push(`/review?bookId=${bookId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-12 px-6">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-yellow-400 text-neutral-900 px-4 py-1.5 rounded-full text-sm font-bold mb-4">
              🔥 Roast Mode
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
              Roast Your Friend
            </h1>
            <p className="text-neutral-600">
              Upload their face. Choose how mean. Let AI do the rest.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-400'
                }`}>
                  {s}
                </div>
                {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-neutral-900' : 'bg-neutral-200'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Characters */}
          {step === 1 && (
            <>
              <div className="space-y-5">
                {characters.map((char, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                        {i === 0 ? 'The Victim' : `Friend ${i + 1}`}
                      </p>
                      {i > 0 && (
                        <button onClick={() => removeCharacter(i)} className="text-neutral-400 hover:text-neutral-600">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-4">
                      {/* Photo upload */}
                      <label className="flex-shrink-0 w-20 h-20 border-2 border-dashed border-neutral-200 rounded-xl cursor-pointer hover:border-neutral-400 transition-colors overflow-hidden">
                        {char.photo ? (
                          <img src={char.photo} alt={char.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
                            <Upload className="h-5 w-5" />
                            <span className="text-[9px] mt-0.5">Photo</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => updateCharacter(i, 'photo', reader.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={char.name}
                          onChange={(e) => updateCharacter(i, 'name', e.target.value)}
                          placeholder="Their name"
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:border-neutral-900 focus:outline-none"
                        />
                        <select
                          value={char.personality}
                          onChange={(e) => updateCharacter(i, 'personality', e.target.value)}
                          className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white focus:border-neutral-900 focus:outline-none text-neutral-700"
                        >
                          <option value="">Personality type...</option>
                          {PERSONALITY_TAGS.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                {characters.length < 4 && (
                  <button
                    onClick={addCharacter}
                    className="w-full py-3 border-2 border-dashed border-neutral-200 rounded-2xl text-sm text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
                  >
                    + Add another victim
                  </button>
                )}
              </div>

              <div className="flex justify-end mt-8">
                <button
                  onClick={() => setStep(2)}
                  disabled={!characters.some(c => c.name.trim())}
                  className="flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full font-medium hover:bg-neutral-800 disabled:opacity-50 transition-all"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}

          {/* Step 2: The Roast */}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              {/* Severity slider */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 mb-5">
                <h3 className="font-semibold text-neutral-900 mb-4">How mean?</h3>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={severity}
                  onChange={(e) => setSeverity(parseInt(e.target.value))}
                  className="w-full h-2 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-900"
                />
                <div className="flex justify-between mt-2">
                  {Object.entries(SEVERITY_LABELS).map(([key, val]) => (
                    <span key={key} className={`text-xs ${parseInt(key) === severity ? 'text-neutral-900 font-bold' : 'text-neutral-400'}`}>
                      {val.emoji} {val.label}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-neutral-500 mt-3 text-center">
                  {SEVERITY_LABELS[severity].description}
                </p>
              </div>

              {/* Scenario */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 mb-5">
                <h3 className="font-semibold text-neutral-900 mb-1">Scenario</h3>
                <p className="text-sm text-neutral-500 mb-3">Describe a situation or leave empty for a random roast</p>
                <textarea
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="e.g. He goes to Thailand after his divorce and falls in love on the first night..."
                  rows={4}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm focus:border-neutral-900 focus:outline-none resize-none"
                />
              </div>

              {/* Art style */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 mb-5">
                <h3 className="font-semibold text-neutral-900 mb-3">Art Style</h3>
                <div className="grid grid-cols-4 gap-2">
                  {ART_STYLES.map(style => (
                    <button
                      key={style.key}
                      onClick={() => setArtStyle(style.key)}
                      className={`py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        artStyle === style.key
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-red-600 text-sm text-center mb-4">{error}</p>}

              {isSubmitting ? (
                <div className="flex flex-col items-center gap-6 py-8">
                  {/* Spinner + funny message */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-4 border-neutral-200 border-t-yellow-400 animate-spin" />
                    <span className="absolute inset-0 flex items-center justify-center text-2xl">
                      {SEVERITY_LABELS[severity]?.emoji || '🔥'}
                    </span>
                  </div>

                  <p className="text-lg font-bold text-neutral-900 transition-all duration-300">
                    {ROAST_LOADING_MESSAGES[loadingMsgIndex]}
                  </p>

                  {/* Timer */}
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <Clock className="h-4 w-4" />
                    <span className="font-mono tabular-nums">
                      {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Patience notice */}
                  <div className="bg-neutral-100 rounded-xl px-6 py-3 text-center max-w-sm">
                    <p className="text-sm text-neutral-600">
                      This usually takes 2-4 minutes. We are writing the story, drawing every panel, and making sure your friend looks ridiculous. Hang tight.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmit}
                    className="flex items-center gap-2 px-8 py-4 bg-yellow-400 text-neutral-900 rounded-full font-bold hover:bg-yellow-300 transition-all hover:scale-105"
                  >
                    <Sparkles className="h-5 w-5" />
                    Generate Roast
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
