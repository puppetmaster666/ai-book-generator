'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeft, ArrowRight, Sparkles, Loader2, BookOpen, Palette, Layers, ChevronDown } from 'lucide-react';
import { BOOK_PRESETS, ART_STYLES, GENRES, type BookPresetKey, type ArtStyleKey } from '@/lib/constants';

// Idea categories for the Surprise Me feature
type IdeaCategory = 'random' | 'novel' | 'childrens' | 'comic' | 'adult_comic';

const IDEA_CATEGORIES: { value: IdeaCategory; label: string; emoji: string }[] = [
  { value: 'random', label: 'Surprise Me', emoji: '🎲' },
  { value: 'novel', label: 'Novel', emoji: '📖' },
  { value: 'childrens', label: "Children's", emoji: '🧒' },
  { value: 'comic', label: 'Comic', emoji: '💥' },
  { value: 'adult_comic', label: 'Adult Comic', emoji: '🔞' },
];

// Icons for book types
const PRESET_ICONS = {
  novel: BookOpen,
  childrens_picture: Palette,
  comic_story: Layers,
};

// Art style images
const ART_STYLE_IMAGES: Partial<Record<ArtStyleKey, string>> = {
  // Children's book styles
  watercolor: '/images/illustrations/watercolor.png',
  cartoon: '/images/illustrations/cartoon.png',
  storybook: '/images/illustrations/classicstory.png',
  fantasy: '/images/illustrations/fantasy.png',
  // Comic book styles
  noir: '/images/illustrations/noir.png',
  manga: '/images/illustrations/manga.png',
  superhero: '/images/illustrations/superhero.png',
  retro: '/images/illustrations/vintagecomic.png',
};

export default function CreateBook() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<'type' | 'idea' | 'style'>('type');
  const [selectedPreset, setSelectedPreset] = useState<BookPresetKey | null>(null);
  const [selectedArtStyle, setSelectedArtStyle] = useState<ArtStyleKey | null>(null);
  const [idea, setIdea] = useState('');
  const [hasIdeaFromHomepage, setHasIdeaFromHomepage] = useState(false);
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ideaCategory, setIdeaCategory] = useState<IdeaCategory>('random');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Get user ID from session if logged in
  const userId = (session?.user as { id?: string })?.id;

  // Storage key for form state
  const FORM_STATE_KEY = 'createBookFormState';

  // Load saved form state on mount
  useEffect(() => {
    // First check for homepage idea
    const savedIdea = sessionStorage.getItem('bookIdea') || sessionStorage.getItem('originalIdea');
    if (savedIdea) {
      setIdea(savedIdea);
      setHasIdeaFromHomepage(true);
      sessionStorage.removeItem('bookIdea');
      sessionStorage.removeItem('originalIdea');
      return;
    }

    // Otherwise, restore saved form state (for back navigation)
    const savedState = sessionStorage.getItem(FORM_STATE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.idea) setIdea(state.idea);
        if (state.selectedPreset) setSelectedPreset(state.selectedPreset);
        if (state.selectedArtStyle) setSelectedArtStyle(state.selectedArtStyle);
        if (state.step) setStep(state.step);
        if (state.ideaCategory) setIdeaCategory(state.ideaCategory);
      } catch (e) {
        console.error('Failed to restore form state:', e);
      }
    }
  }, []);

  // Save form state when values change
  useEffect(() => {
    // Only save if we have meaningful state
    if (idea || selectedPreset || selectedArtStyle) {
      const state = {
        idea,
        selectedPreset,
        selectedArtStyle,
        step,
        ideaCategory,
      };
      sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify(state));
    }
  }, [idea, selectedPreset, selectedArtStyle, step, ideaCategory]);

  // Clear form state when navigating away after successful submission
  const clearFormState = () => {
    sessionStorage.removeItem(FORM_STATE_KEY);
  };

  const handleGenerateIdea = async () => {
    setIsGeneratingIdea(true);
    setError('');
    try {
      const response = await fetch('/api/generate-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: ideaCategory }),
      });
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

    // If idea already exists from homepage, skip the idea step
    if (hasIdeaFromHomepage && idea.trim().length >= 20) {
      if (preset.format !== 'text_only') {
        setStep('style');
      } else {
        setTimeout(() => handleSubmitWithPreset(key), 0);
      }
    } else {
      setStep('idea');
    }
  };

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
          userId,
        }),
      });

      if (!response.ok) throw new Error('Failed to create book');

      const { bookId } = await response.json();
      clearFormState();
      router.push(`/review?bookId=${bookId}`);
    } catch (err) {
      console.error('Error:', err);
      setError('Something went wrong. Please try again.');
      setStep('idea');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (!selectedPreset) return;
    const preset = BOOK_PRESETS[selectedPreset];

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
          bookPreset: selectedPreset,
          bookFormat: preset.format,
          artStyle: selectedArtStyle,
          dialogueStyle: preset.dialogueStyle,
          targetWords: preset.targetWords,
          targetChapters: preset.chapters,
          userId,
        }),
      });

      if (!response.ok) throw new Error('Failed to create book');

      const { bookId } = await response.json();
      clearFormState();
      router.push(`/review?bookId=${bookId}`);
    } catch (err) {
      console.error('Error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const preset = selectedPreset ? BOOK_PRESETS[selectedPreset] : null;

  // Get art styles for the current book type
  const getArtStylesForPreset = () => {
    if (!selectedPreset) return [];
    const preset = BOOK_PRESETS[selectedPreset];

    // Filter art styles by category
    const category = preset.dialogueStyle === 'bubbles' ? 'comic' : 'childrens';
    return (Object.entries(ART_STYLES) as [ArtStyleKey, typeof ART_STYLES[ArtStyleKey]][])
      .filter(([, style]) => style.category === category);
  };

  return (
    <div className="min-h-screen bg-white">
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(Object.entries(BOOK_PRESETS) as [BookPresetKey, typeof BOOK_PRESETS[BookPresetKey]][]).map(([key, presetItem]) => {
                      const IconComponent = PRESET_ICONS[key as keyof typeof PRESET_ICONS] || BookOpen;
                      return (
                        <button
                          key={key}
                          onClick={() => handleSelectPreset(key)}
                          className="group p-8 bg-white rounded-2xl border border-neutral-200 hover:border-neutral-400 hover:shadow-lg transition-all text-left"
                        >
                          <div className="w-14 h-14 bg-neutral-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-neutral-200 transition-colors">
                            <IconComponent className="h-7 w-7 text-neutral-700" />
                          </div>
                          <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                            {presetItem.label}
                          </h3>
                          <p className="text-sm text-neutral-600 mb-5">
                            {presetItem.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-2xl font-bold">{presetItem.priceDisplay}</span>
                            <span className="text-xs bg-neutral-100 text-neutral-600 px-3 py-1 rounded-full">
                              {presetItem.downloadFormat.toUpperCase()}
                            </span>
                          </div>
                        </button>
                      );
                    })}
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
                  {selectedPreset === 'comic_story'
                    ? "Tell us about your comic story - the characters, action, and setting"
                    : preset.format === 'picture_book'
                    ? "Tell us about your children's story - the characters, setting, and message"
                    : "Share your concept and we'll expand it into a full outline"}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200 p-6 md:p-8">
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  placeholder={
                    selectedPreset === 'comic_story'
                      ? "A noir detective story set in a rainy city where a private eye investigates a series of mysterious disappearances..."
                      : preset.format === 'picture_book'
                      ? "A curious little fox named Pip who discovers that the stars in the sky are actually sleeping fireflies..."
                      : "A mystery novel about a detective who discovers her own name in a cold case file from 1985..."
                  }
                  rows={6}
                  className="w-full px-4 py-4 text-lg bg-neutral-50 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none resize-none transition-colors"
                  disabled={isSubmitting}
                />

                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
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

                    {/* Category Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                        className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 px-2 py-1 rounded-lg hover:bg-neutral-100 transition-colors"
                      >
                        <span>{IDEA_CATEGORIES.find(c => c.value === ideaCategory)?.emoji}</span>
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {showCategoryDropdown && (
                        <div className="absolute left-0 top-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                          {IDEA_CATEGORIES.map((cat) => (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => {
                                setIdeaCategory(cat.value);
                                setShowCategoryDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 flex items-center gap-2 ${
                                ideaCategory === cat.value ? 'bg-neutral-50 font-medium' : ''
                              }`}
                            >
                              <span>{cat.emoji}</span>
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

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
                  {selectedPreset === 'comic_story'
                    ? "Select the visual style for your comic panels"
                    : "This style will be used for all illustrations"}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {getArtStylesForPreset().map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedArtStyle(key)}
                    className={`group rounded-2xl border-2 transition-all overflow-hidden ${
                      selectedArtStyle === key
                        ? 'border-neutral-900 ring-2 ring-neutral-900 ring-offset-2'
                        : 'border-neutral-200 hover:border-neutral-400 bg-white'
                    }`}
                  >
                    <div className="relative aspect-square bg-neutral-100">
                      {ART_STYLE_IMAGES[key] ? (
                        <Image
                          src={ART_STYLE_IMAGES[key]!}
                          alt={style.label}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
                          <Palette className="h-12 w-12" />
                        </div>
                      )}
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
