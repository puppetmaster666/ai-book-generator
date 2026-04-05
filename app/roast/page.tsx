'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowRight, ArrowLeft, Upload, X, Loader2, Sparkles } from 'lucide-react';
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
  4: { label: 'Nuclear', emoji: '☢️', description: 'Absolutely unhinged, nothing is off limits' },
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

      const severityPrompt = severity === 1
        ? 'Keep it light and playful. Gentle teasing only.'
        : severity === 2
          ? 'Make it embarrassing and spicy but still funny. Push boundaries a little.'
          : severity === 3
            ? 'Full roast mode. No mercy. Make it brutal and hilarious. Dark humor welcome.'
            : 'Absolutely unhinged. Nothing is off limits. Maximum vulgarity, maximum embarrassment. Think comedy roast meets Hangover movie. Adult humor, crude jokes, humiliating situations.';

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
          targetChapters: 12, // Shorter, punchier
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

              <div className="flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-4 bg-yellow-400 text-neutral-900 rounded-full font-bold hover:bg-yellow-300 disabled:opacity-50 transition-all hover:scale-105"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Cooking the roast...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generate Roast
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
