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
  4: { label: 'Nuclear', emoji: '☢️', description: '18+ only. Completely unhinged. They will never forgive you.' },
};

const ART_STYLES = [
  { key: 'shonen', label: 'Shonen Anime' },
  { key: 'animated', label: 'Western Animation' },
  { key: 'realistic', label: 'Realistic' },
  { key: 'puppet', label: 'Puppet / Doll' },
];

interface RoastCharacter {
  name: string;
  photos: string[];
  personality: string;
}

export default function RoastPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [characters, setCharacters] = useState<RoastCharacter[]>([
    { name: '', photos: [], personality: '' },
  ]);
  const [severity, setSeverity] = useState(2);
  const [scenario, setScenario] = useState('');
  const [artStyle, setArtStyle] = useState('shonen');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAgeGate, setShowAgeGate] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
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
      setCharacters([...characters, { name: '', photos: [], personality: '' }]);
    }
  };

  const removeCharacter = (index: number) => {
    if (characters.length > 1) {
      setCharacters(characters.filter((_, i) => i !== index));
    }
  };

  const updateCharacter = (index: number, field: keyof RoastCharacter, value: string | string[] | null) => {
    const updated = [...characters];
    (updated[index] as any)[field] = value;
    setCharacters(updated);
  };

  const addPhotoToCharacter = (charIndex: number, photoDataUrl: string) => {
    const updated = [...characters];
    if (updated[charIndex].photos.length < 3) {
      updated[charIndex].photos = [...updated[charIndex].photos, photoDataUrl];
      setCharacters(updated);
    }
  };

  const removePhotoFromCharacter = (charIndex: number, photoIndex: number) => {
    const updated = [...characters];
    updated[charIndex].photos = updated[charIndex].photos.filter((_, i) => i !== photoIndex);
    setCharacters(updated);
  };

  // Try the uncensored pipeline (Mistral + RunPod/ComfyUI)
  // Returns bookId if successful, null if not configured (falls back to Gemini)
  const tryUncensoredPipeline = async (namedChars: RoastCharacter[]): Promise<{ bookId: string } | null> => {
    try {
      // First create the book entry via the normal books API
      const bookRes = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Roast of ${namedChars[0].name}`,
          genre: 'comedy',
          bookType: 'fiction',
          premise: `An embarrassing comic about ${namedChars[0].name}`,
          characters: namedChars.map(c => ({ name: c.name, description: c.personality || '' })),
          beginning: 'The roast begins',
          middle: 'The roast escalates',
          ending: 'The devastating finale',
          writingStyle: 'comedy',
          bookPreset: 'comic_story',
          bookFormat: 'picture_book',
          artStyle,
          dialogueStyle: 'bubbles',
          targetWords: 600,
          targetChapters: 12,
          userId: (session?.user as any)?.id || null,
          contentRating: severity === 4 ? 'mature' : 'general',
        }),
      });

      if (!bookRes.ok) return null;
      const { bookId } = await bookRes.json();

      // Try the uncensored generation endpoint
      const res = await fetch('/api/roast/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          characters: namedChars.map(c => ({
            name: c.name,
            personality: c.personality || '',
            photos: c.photos,
          })),
          severity,
          scenario,
          artStyle,
          targetPanels: 12,
        }),
      });

      // If the uncensored pipeline is not configured, fall back
      if (res.status === 503) {
        console.log('[Roast] Uncensored pipeline not configured, using Gemini fallback');
        // Clean up the book we just created since we will create a new one via the old pipeline
        try { await fetch(`/api/books/${bookId}`, { method: 'DELETE' }); } catch {}
        return null;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Uncensored generation failed');
      }

      return { bookId };
    } catch (error) {
      console.warn('[Roast] Uncensored pipeline failed, falling back to Gemini:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    // Nuclear severity requires age confirmation
    if (severity === 4 && !ageConfirmed) {
      setShowAgeGate(true);
      return;
    }

    const namedChars = characters.filter(c => c.name.trim());
    if (namedChars.length === 0) {
      setError('Add at least one character name');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Try the uncensored pipeline first (Mistral + RunPod)
      const uncensoredResult = await tryUncensoredPipeline(namedChars);
      if (uncensoredResult) {
        router.push(`/book/${uncensoredResult.bookId}`);
        return;
      }

      // Fallback: existing Gemini pipeline
      const severityInfo = SEVERITY_LABELS[severity];
      const charDescriptions = namedChars.map((c, i) => {
        const parts = [c.name.trim()];
        if (c.personality) parts.push(`personality: ${c.personality}`);
        return `${i + 1}. ${parts.join(', ')}`;
      }).join('\n');

      const safetyRules = severity < 4
        ? `\n\nCONTENT SAFETY (STRICT, DO NOT VIOLATE):
- NO nudity, no sexual content, no sexual innuendo in images
- NO gore, blood, graphic violence, or injury
- NO death scenes, murder, suicide, or killing
- NO drugs or drug use depicted
- NO weapons pointed at people
- Keep all VISUALS safe for ages 13+. The humor comes from embarrassment and social cruelty, not graphic content.
- Dialogue can be mean and vulgar (especially at higher severity) but images must stay clean.`
        : '';

      const coreRules = `CRITICAL RULES FOR ALL ROAST COMICS:
- This is NOT a story about a roast event, ceremony, gala, or show. Do NOT write a story where characters "get roasted on stage" or "attend a roast."
- The comic itself IS the roast. Put the target in embarrassing, humiliating, funny situations that expose their flaws through the STORY.
- The narrator's voice is mean, sarcastic, and talks directly about the target like a friend who knows all their embarrassing secrets.
- Do NOT invent locations (cities, countries, neighborhoods) unless the user specifically mentioned one. Just put them in normal everyday settings: their apartment, a bar, a date, work, the gym, a party.
- Do NOT use flowery, intellectual, or literary language. Write like a funny friend who talks shit, not like a novelist. Simple words. Short sentences. Punchy.
- Every single page must have at least one joke, insult, or embarrassing moment. No filler pages. No setup-only pages.
- Use the target's NAME and PERSONALITY TRAITS in the jokes. Make it personal, not generic.${safetyRules}`;

      const nuclearPrompt = `NUCLEAR MODE. Absolutely unhinged. Nothing is sacred. The goal is to make the target question every life choice they have ever made.

${coreRules}

HOW TO WRITE THIS:
1. Put them in the most humiliating situations possible based on their personality. If they think they are smart, show them being confidently wrong. If they think they are attractive, show everyone ignoring them. If they are a know-it-all, show experts laughing at them.
2. The narrator should be CRUEL. Talk about them like they are not there. "This is the face of a man who peaked in middle school." "She has the confidence of someone who has never owned a mirror."
3. Every page escalates. Page 1 is mean. Page 12 should be devastating.
4. Attack their confidence, their love life, their habits, their friends' opinion of them, their future, their past, their apartment, their style, everything.
5. No redemption. No "but we love them." No happy ending. The last page should be the worst one.
6. Use simple, punchy, conversational language. Write like a group chat roasting someone, not like a book report.
7. Backhanded compliments hit harder than direct insults: "The thing about [name] is that they really do try. And the fact that THIS is what trying looks like... wow."
8. Make jokes they will think about at 3 AM. Target the gap between who they think they are and who they actually are.

Maximum vulgarity, maximum embarrassment. Crude jokes, humiliating situations, adult humor. Zero mercy.`;

      const friendlyPrompt = `FRIENDLY MODE. Light teasing, nothing that would actually hurt. Think a birthday card from a friend who knows you too well.

${coreRules}

HOW TO WRITE THIS:
1. Put them in funny, slightly embarrassing everyday situations based on their quirks. If they are always late, show it ruining a date. If they cannot cook, show a kitchen disaster.
2. The narrator is affectionate but cheeky. Like a best friend who teases you because they love you.
3. Keep it clean. No vulgarity. Something you could show their parents and everyone laughs.
4. Every joke should make the target go "okay fair enough" not "that was too far."
5. Exaggerate their small quirks into absurd situations. "It takes [name] so long to get ready that by the time they leave, the restaurant has closed, reopened, and closed again."`;

      const spicyPrompt = `SPICY MODE. Embarrassing and boundary-pushing. The target should be laughing but also covering their face.

${coreRules}

HOW TO WRITE THIS:
1. Put them in cringe situations that expose their worst traits. Bad dates, failed attempts at being cool, getting called out in public.
2. The narrator says the quiet part out loud. The things everyone thinks but nobody says. "Everyone pretends to like [name]'s cooking. Nobody does."
3. Go after their dating life, their social media habits, their fashion choices, their delusions.
4. Backhanded compliments are your weapon: "It takes real courage to post that many selfies with that face."
5. Make it the kind of thing they would screenshot and send to friends saying "I am being ATTACKED" but they are laughing while they type it.`;

      const brutalPrompt = `BRUTAL MODE. No mercy. Every page should make the target wince. Dark humor, savage jokes, nothing is off limits.

${coreRules}

HOW TO WRITE THIS:
1. Find their biggest insecurity based on their personality and build entire scenes around exposing it. Publicly. Painfully.
2. The narrator is savage and deadpan. States the most devastating things like they are just facts. "This is a man whose own dog prefers the neighbor."
3. Stack hits. Do not make one joke and move on. Hit the same wound three different ways before moving to the next one.
4. Go after their confidence, their achievements, their relationships, their future. Reframe everything they are proud of as pathetic.
5. Dark humor is welcome. Death jokes, loneliness jokes, "dying alone" predictions. If it is funny, it is fair game.
6. No softening. No "just kidding." Every insult is delivered as truth.
7. The last page should be the most devastating one. End on the worst possible note.`;

      const severityPrompt = severity === 1
        ? friendlyPrompt
        : severity === 2
          ? spicyPrompt
          : severity === 3
            ? brutalPrompt
            : nuclearPrompt;

      const idea = scenario.trim()
        ? `EMBARRASSING COMIC ABOUT A REAL PERSON: ${scenario.trim()}\n\nMeanness level: ${severityInfo.label}\n${severityPrompt}\n\nTarget (the person being made fun of):\n${charDescriptions}`
        : `EMBARRASSING COMIC ABOUT A REAL PERSON: Create a hilarious comic that makes fun of this person through embarrassing situations, cruel narration, and jokes about their personality. Every page should be an insult disguised as a story.\n\nMeanness level: ${severityInfo.label}\n${severityPrompt}\n\nTarget (the person being made fun of):\n${charDescriptions}`;

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
          contentRating: severity === 4 ? 'mature' : 'general',
        }),
      });

      if (!bookRes.ok) throw new Error('Failed to create book');
      const { bookId } = await bookRes.json();

      // Upload first character photos if provided (up to 3)
      const firstWithPhotos = namedChars.find(c => c.photos.length > 0);
      if (firstWithPhotos && firstWithPhotos.photos.length > 0) {
        try {
          const images = firstWithPhotos.photos.map(photo => {
            const base64 = photo.includes(',') ? photo.split(',')[1] : photo;
            const mimeMatch = photo.match(/data:([^;]+);/);
            return { imageBase64: base64, mimeType: mimeMatch?.[1] || 'image/jpeg' };
          });
          await fetch(`/api/books/${bookId}/stylize-protagonist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images }),
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
                      {/* Photo uploads: drag & drop zone + thumbnails */}
                      <div className="flex-shrink-0">
                        {/* Thumbnails of uploaded photos */}
                        {char.photos.length > 0 && (
                          <div className="flex gap-1.5 mb-2">
                            {char.photos.map((photo, photoIdx) => (
                              <div key={photoIdx} className="relative w-14 h-14">
                                <img src={photo} alt={`${char.name} ${photoIdx + 1}`} className="w-full h-full object-cover rounded-lg border border-neutral-200" />
                                <button
                                  type="button"
                                  onClick={() => removePhotoFromCharacter(i, photoIdx)}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-neutral-900 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-600"
                                >
                                  x
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Drop zone / upload button */}
                        {char.photos.length < 3 && (
                          <label
                            className="block w-[calc(14px*3+0.375rem*2+4.5rem)] h-16 border-2 border-dashed border-neutral-200 rounded-lg cursor-pointer hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-neutral-900', 'bg-neutral-50'); }}
                            onDragLeave={(e) => { e.currentTarget.classList.remove('border-neutral-900', 'bg-neutral-50'); }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove('border-neutral-900', 'bg-neutral-50');
                              const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).slice(0, 3 - char.photos.length);
                              files.forEach(file => {
                                const reader = new FileReader();
                                reader.onload = () => addPhotoToCharacter(i, reader.result as string);
                                reader.readAsDataURL(file);
                              });
                            }}
                          >
                            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
                              <Upload className="h-4 w-4" />
                              <span className="text-[9px] mt-1">{char.photos.length === 0 ? 'Drop photos or click' : `Add ${3 - char.photos.length} more`}</span>
                              <span className="text-[8px] text-neutral-300">{char.photos.length}/3</span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []).slice(0, 3 - char.photos.length);
                                files.forEach(file => {
                                  const reader = new FileReader();
                                  reader.onload = () => addPhotoToCharacter(i, reader.result as string);
                                  reader.readAsDataURL(file);
                                });
                                e.target.value = '';
                              }}
                            />
                          </label>
                        )}
                      </div>

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
                {severity === 4 && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-center">
                    <p className="text-xs text-red-700 font-medium">
                      This mode generates adult content. You will need to confirm you are 18+ before generating.
                    </p>
                  </div>
                )}
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
                    data-roast-submit
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

      {/* 18+ Age Verification Modal */}
      {showAgeGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-xl">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">☢️</span>
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">Age Verification Required</h3>
            <p className="text-sm text-neutral-600 mb-6">
              Nuclear mode generates uncensored adult content including crude humor, strong language, and mature themes. You must be at least 18 years old to continue.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setAgeConfirmed(true);
                  setShowAgeGate(false);
                  // Auto-submit after confirming
                  setTimeout(() => {
                    const btn = document.querySelector('[data-roast-submit]') as HTMLButtonElement;
                    btn?.click();
                  }, 100);
                }}
                className="w-full px-6 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors"
              >
                I am 18 or older
              </button>
              <button
                onClick={() => {
                  setShowAgeGate(false);
                  setSeverity(3);
                }}
                className="w-full px-6 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200 transition-colors"
              >
                Go back to Brutal mode instead
              </button>
            </div>
            <p className="text-xs text-neutral-400 mt-4">
              By confirming, you agree that you are of legal age in your jurisdiction to view adult content.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
