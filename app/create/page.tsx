'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeft, ArrowRight, Sparkles, Loader2 } from 'lucide-react';
import { BOOK_PRESETS, ART_STYLES, GENRES, DIALOGUE_STYLES, type BookPresetKey, type ArtStyleKey, type DialogueStyleKey } from '@/lib/constants';

// Map art style keys to image filenames
const ART_STYLE_IMAGES: Record<ArtStyleKey, string> = {
  watercolor: '/images/illustrations/watercolor.png',
  cartoon: '/images/illustrations/cartoon.png',
  storybook: '/images/illustrations/classicstory.png',
  modern: '/images/illustrations/modernminimal.png',
  realistic: '/images/illustrations/realistic.png',
  manga: '/images/illustrations/mangaanime.png',
  vintage: '/images/illustrations/vintage.png',
  fantasy: '/images/illustrations/fantasy.png',
};

export default function CreateBook() {
  const router = useRouter();
  const [step, setStep] = useState<'type' | 'idea' | 'style'>('type');
  const [selectedPreset, setSelectedPreset] = useState<BookPresetKey | null>(null);
  const [selectedArtStyle, setSelectedArtStyle] = useState<ArtStyleKey | null>(null);
  const [selectedDialogueStyle, setSelectedDialogueStyle] = useState<DialogueStyleKey | null>(null);
  const [idea, setIdea] = useState('');
  const [hasIdeaFromHomepage, setHasIdeaFromHomepage] = useState(false);
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Check if coming from homepage with an idea
  useEffect(() => {
    const savedIdea = sessionStorage.getItem('bookIdea') || sessionStorage.getItem('originalIdea');
    if (savedIdea) {
      setIdea(savedIdea);
      setHasIdeaFromHomepage(true);
      sessionStorage.removeItem('bookIdea');
      sessionStorage.removeItem('originalIdea');
    }
  }, []);

  const handleGenerateIdea = async () => {
    setIsGeneratingIdea(true);
    setError('');
    try {
      const response = await fetch('/api/generate-idea', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to generate idea');
      const data = await response.json();
      setIdea(data.idea);
    } catch {
      setError('Failed to generate idea. Please try again.');
    } finally {
      setIsGeneratingIdea(false);
    }
  };

  const handleSelectPreset = (key: BookPresetKey) => {
    setSelectedPreset(key);
    const preset = BOOK_PRESETS[key];

    // Set default art style for illustrated books
    if (preset.artStyle) {
      setSelectedArtStyle(preset.artStyle as ArtStyleKey);
    } else {
      setSelectedArtStyle(null);
    }

    // Set default dialogue style (prose vs bubbles) for visual books
    if (preset.dialogueStyle) {
      setSelectedDialogueStyle(preset.dialogueStyle as DialogueStyleKey);
    } else {
      setSelectedDialogueStyle(null);
    }

    // If idea already exists from homepage, skip the idea step
    if (hasIdeaFromHomepage && idea.trim().length >= 20) {
      if (preset.format !== 'text_only') {
        // Illustrated book: go to art style selection
        setStep('style');
      } else {
        // Text-only book: submit directly
        setSelectedPreset(key);
        // Need to wait for state update, then submit
        setTimeout(() => handleSubmitWithPreset(key), 0);
      }
    } else {
      setStep('idea');
    }
  };

  // Separate submit function that takes preset key directly (for immediate submission)
  const handleSubmitWithPreset = async (presetKey: BookPresetKey) => {
    if (!idea.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const preset = BOOK_PRESETS[presetKey];
      const genre = GENRES[preset.defaultGenre as keyof typeof GENRES];

      const expandResponse = await fetch('/api/expand-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          bookType: preset.format === 'picture_book' ? 'childrens' : genre?.type || 'fiction',
          isIllustrated: preset.format !== 'text_only',
        }),
      });

      if (!expandResponse.ok) throw new Error('Failed to expand idea');
      const bookPlan = await expandResponse.json();

      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookPlan,
          bookPreset: presetKey,
          bookFormat: preset.format,
          artStyle: preset.artStyle,
          dialogueStyle: preset.dialogueStyle || null,
          targetWords: preset.targetWords,
          targetChapters: preset.chapters,
        }),
      });

      if (!response.ok) throw new Error('Failed to create book');

      const { bookId } = await response.json();
      router.push(`/review?bookId=${bookId}`);
    } catch (err) {
      console.error('Error:', err);
      setError('Something went wrong. Please try again.');
      setStep('idea'); // Fall back to idea step on error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (!selectedPreset) return;
    const preset = BOOK_PRESETS[selectedPreset];

    // If it's an illustrated book, show art style selection
    if (preset.format !== 'text_only' && step === 'idea') {
      setStep('style');
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!selectedPreset || !idea.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const preset = BOOK_PRESETS[selectedPreset];
      const genre = GENRES[preset.defaultGenre as keyof typeof GENRES];

      // First expand the idea using AI
      const expandResponse = await fetch('/api/expand-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          bookType: preset.format === 'picture_book' ? 'childrens' : genre?.type || 'fiction',
          isIllustrated: preset.format !== 'text_only',
        }),
      });

      if (!expandResponse.ok) throw new Error('Failed to expand idea');
      const bookPlan = await expandResponse.json();

      // Create the book
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookPlan,
          bookPreset: selectedPreset,
          bookFormat: preset.format,
          artStyle: selectedArtStyle,
          dialogueStyle: selectedDialogueStyle,
          targetWords: preset.targetWords,
          targetChapters: preset.chapters,
        }),
      });

      if (!response.ok) throw new Error('Failed to create book');

      const { bookId } = await response.json();
      router.push(`/review?bookId=${bookId}`);
    } catch (err) {
      console.error('Error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const preset = selectedPreset ? BOOK_PRESETS[selectedPreset] : null;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <main className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Choose Book Type */}
          {step === 'type' && (
            <>
              {isSubmitting ? (
                <div className="text-center py-20">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-900" />
                  <h2 className="text-xl font-semibold mb-2">Creating your book...</h2>
                  <p className="text-neutral-600">We&apos;re expanding your idea into a full outline</p>
                </div>
              ) : (
                <>
                  <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                      What would you like to create?
                    </h1>
                    <p className="text-lg text-neutral-600">
                      Choose a format and we&apos;ll help you bring your idea to life
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(Object.entries(BOOK_PRESETS) as [BookPresetKey, typeof BOOK_PRESETS[BookPresetKey]][]).map(([key, preset]) => (
                      <button
                        key={key}
                        onClick={() => handleSelectPreset(key)}
                        className="group p-6 bg-white rounded-2xl border border-neutral-200 hover:border-neutral-400 hover:shadow-lg transition-all text-left"
                      >
                        <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                          {preset.label}
                        </h3>
                        <p className="text-sm text-neutral-600 mb-4">
                          {preset.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold">{preset.priceDisplay}</span>
                          {preset.format !== 'text_only' && (
                            <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full">
                              Illustrated
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 2: Write Your Idea */}
          {step === 'idea' && preset && (
            <>
              <button
                onClick={() => setStep('type')}
                className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-8 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" /> Back to book types
              </button>

              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-neutral-100 px-4 py-2 rounded-full text-sm mb-4">
                  <span>{preset.label}</span>
                  <span className="text-neutral-400">•</span>
                  <span className="font-semibold">{preset.priceDisplay}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                  Describe your {preset.format === 'picture_book' ? 'story' : 'book'} idea
                </h1>
                <p className="text-lg text-neutral-600">
                  {preset.format === 'picture_book'
                    ? "Tell us about your children's story - the characters, setting, and message"
                    : "Share your concept and we'll expand it into a full outline"}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200 p-6 md:p-8">
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder={
                    preset.format === 'picture_book'
                      ? "A curious little fox named Pip who discovers that the stars in the sky are actually sleeping fireflies, and embarks on an adventure to wake them up..."
                      : "A mystery novel about a detective who discovers her own name in a cold case file from 1985..."
                  }
                  rows={6}
                  className="w-full px-4 py-4 text-lg bg-neutral-50 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none resize-none transition-colors"
                  disabled={isSubmitting}
                />

                <div className="flex items-center justify-between mt-4">
                  <button
                    type="button"
                    onClick={handleGenerateIdea}
                    disabled={isGeneratingIdea || isSubmitting}
                    className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 disabled:opacity-50 px-3 py-2 rounded-lg hover:bg-neutral-100 transition-colors"
                  >
                    {isGeneratingIdea ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {isGeneratingIdea ? 'Generating...' : 'Surprise me'}
                  </button>

                  <span className="text-sm text-neutral-500">
                    {idea.length} characters
                  </span>
                </div>

                {error && (
                  <p className="text-red-600 text-sm mt-4 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
                )}

                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleContinue}
                    disabled={idea.trim().length < 20 || isSubmitting}
                    className="flex items-center gap-2 px-8 py-4 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 disabled:opacity-50 font-medium transition-all hover:scale-105"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Creating your book...
                      </>
                    ) : preset.format !== 'text_only' ? (
                      <>
                        Choose Art Style <ArrowRight className="h-5 w-5" />
                      </>
                    ) : (
                      <>
                        Create Book <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Art Style (for illustrated books) */}
          {step === 'style' && preset && (
            <>
              <button
                onClick={() => setStep(hasIdeaFromHomepage ? 'type' : 'idea')}
                className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-8 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" /> {hasIdeaFromHomepage ? 'Back to book types' : 'Back to idea'}
              </button>

              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                  Choose your art style
                </h1>
                <p className="text-lg text-neutral-600">
                  This style will be used for all illustrations and the cover
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {(Object.entries(ART_STYLES) as [ArtStyleKey, typeof ART_STYLES[ArtStyleKey]][]).map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedArtStyle(key)}
                    className={`group rounded-2xl border-2 transition-all overflow-hidden ${
                      selectedArtStyle === key
                        ? 'border-neutral-900 ring-2 ring-neutral-900 ring-offset-2'
                        : 'border-neutral-200 hover:border-neutral-400 bg-white'
                    }`}
                  >
                    <div className="relative aspect-square">
                      <Image
                        src={ART_STYLE_IMAGES[key]}
                        alt={style.label}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {selectedArtStyle === key && (
                        <div className="absolute inset-0 bg-neutral-900/10" />
                      )}
                    </div>
                    <div className="p-3 bg-white text-left">
                      <h3 className="font-semibold text-sm mb-0.5">{style.label}</h3>
                      <p className="text-xs text-neutral-500 line-clamp-1">{style.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-red-600 text-sm mb-4 bg-red-50 px-4 py-2 rounded-lg text-center">{error}</p>
              )}

              <div className="flex justify-center">
                <button
                  onClick={handleSubmit}
                  disabled={!selectedArtStyle || isSubmitting}
                  className="flex items-center gap-2 px-8 py-4 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 disabled:opacity-50 font-medium transition-all hover:scale-105"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating your book...
                    </>
                  ) : (
                    <>
                      Create {preset.label} <ArrowRight className="h-5 w-5" />
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
