'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ArrowLeft, ArrowRight, Sparkles, Loader2, BookOpen, Palette, Layers, ChevronDown, GraduationCap, Film, Upload, FileText, X, Clock, Skull, Tv, Check } from 'lucide-react';
import {
  BOOK_PRESETS,
  ART_STYLES,
  GENRES,
  type BookPresetKey,
  type ArtStyleKey,
} from '@/lib/constants';

// Main category types
type CategoryType = 'text' | 'image' | 'screenplay';

// Category definitions
const CATEGORIES: { value: CategoryType; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'text', label: 'Text Book', description: 'Novels, non-fiction, guides', icon: BookOpen },
  { value: 'image', label: 'Image Book', description: 'Comics, picture books', icon: Palette },
  { value: 'screenplay', label: 'Screenplay', description: 'Movies, TV pilots, episodes', icon: Film },
];

// Presets grouped by category
const CATEGORY_PRESETS: Record<CategoryType, BookPresetKey[]> = {
  text: ['short_novel', 'novel', 'epic_novel', 'lead_magnet', 'nonfiction'],
  image: ['childrens_picture', 'comic_story', 'adult_comic'],
  screenplay: ['short_screenplay', 'screenplay', 'epic_screenplay', 'tv_pilot_comedy', 'tv_pilot_drama', 'tv_episode'],
};

// Idea categories for the Surprise Me feature
type IdeaCategory = 'random' | 'novel' | 'childrens' | 'comic' | 'nonfiction' | 'adult_comic' | 'screenplay';

const IDEA_CATEGORIES: { value: IdeaCategory; label: string; emoji: string }[] = [
  { value: 'random', label: 'Surprise Me', emoji: '🎲' },
  { value: 'novel', label: 'Novel', emoji: '📖' },
  { value: 'childrens', label: "Children's", emoji: '🧒' },
  { value: 'comic', label: 'Comic', emoji: '💥' },
  { value: 'screenplay', label: 'Movie Script', emoji: '🎬' },
  { value: 'nonfiction', label: 'Non-Fiction', emoji: '📚' },
  { value: 'adult_comic', label: 'Adult Comic (18+)', emoji: '🔥' },
];

// Icons for book types
const PRESET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  short_novel: BookOpen,
  novel: BookOpen,
  epic_novel: BookOpen,
  childrens_picture: Palette,
  comic_story: Layers,
  adult_comic: Skull,
  lead_magnet: FileText,
  nonfiction: GraduationCap,
  short_screenplay: Film,
  screenplay: Film,
  epic_screenplay: Film,
  tv_pilot_comedy: Tv,
  tv_pilot_drama: Tv,
  tv_episode: Tv,
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
  const [step, setStep] = useState<'category' | 'subtype' | 'idea' | 'style'>('category');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<BookPresetKey | null>(null);
  const [selectingCategory, setSelectingCategory] = useState<CategoryType | null>(null);
  const [selectingPreset, setSelectingPreset] = useState<BookPresetKey | null>(null);
  const [selectedArtStyle, setSelectedArtStyle] = useState<ArtStyleKey | null>(null);
  const [idea, setIdea] = useState('');
  const [hasIdeaFromHomepage, setHasIdeaFromHomepage] = useState(false);
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ideaCategory, setIdeaCategory] = useState<IdeaCategory>('random');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isParsingFile, setIsParsingFile] = useState(false);

  // Get user ID from session if logged in
  const userId = (session?.user as { id?: string })?.id;

  // Storage key for form state
  const FORM_STATE_KEY = 'createBookFormState';

  // Load saved form state on mount
  useEffect(() => {
    // First check for homepage idea (don't remove it - keep for back navigation)
    const savedIdea = sessionStorage.getItem('bookIdea') || sessionStorage.getItem('originalIdea');
    if (savedIdea) {
      setIdea(savedIdea);
      setHasIdeaFromHomepage(true);
      return;
    }

    // Otherwise, restore saved form state (for back navigation)
    const savedState = sessionStorage.getItem(FORM_STATE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.idea) setIdea(state.idea);
        if (state.selectedCategory) setSelectedCategory(state.selectedCategory);
        if (state.selectedPreset) setSelectedPreset(state.selectedPreset);
        if (state.selectedArtStyle) setSelectedArtStyle(state.selectedArtStyle);
        if (state.ideaCategory) setIdeaCategory(state.ideaCategory);

        // Only restore step if the required state for that step exists
        // This prevents blank pages when state is incomplete
        if (state.step) {
          if (state.step === 'subtype' && state.selectedCategory) {
            setStep('subtype');
          } else if (state.step === 'idea' && state.selectedPreset) {
            setStep('idea');
          } else if (state.step === 'style' && state.selectedPreset) {
            setStep('style');
          }
          // Otherwise stay on 'category' (the default)
        }
      } catch (e) {
        console.error('Failed to restore form state:', e);
      }
    }
  }, []);

  // Save form state when values change
  useEffect(() => {
    // Only save if we have meaningful state
    if (idea || selectedCategory || selectedPreset || selectedArtStyle) {
      const state = {
        idea,
        selectedCategory,
        selectedPreset,
        selectedArtStyle,
        step,
        ideaCategory,
      };
      sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify(state));
    }
  }, [idea, selectedCategory, selectedPreset, selectedArtStyle, step, ideaCategory]);

  // Clear form state when navigating away after successful submission
  const clearFormState = () => {
    sessionStorage.removeItem(FORM_STATE_KEY);
    sessionStorage.removeItem('bookIdea');
    sessionStorage.removeItem('originalIdea');
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

  // File parsing for drag and drop / upload
  const parseFileContent = async (file: File): Promise<string> => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'txt' || extension === 'md') {
      return await file.text();
    }

    if (extension === 'docx') {
      try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
      } catch {
        throw new Error('Could not parse DOCX file. Please try copying the text directly.');
      }
    }

    if (extension === 'pdf') {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => ('str' in item ? (item as { str: string }).str : ''))
            .filter(Boolean)
            .join(' ');
          fullText += pageText + '\n\n';
        }
        return fullText.trim();
      } catch {
        throw new Error('Could not parse PDF file. Please try copying the text directly.');
      }
    }

    throw new Error(`Unsupported file type: .${extension}. Please use .txt, .md, .docx, or .pdf`);
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    await processFile(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await processFile(file);
    e.target.value = '';
  };

  const processFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.');
      return;
    }

    setIsParsingFile(true);
    setError('');

    try {
      const content = await parseFileContent(file);
      const trimmedContent = content.slice(0, 120000);
      setIdea(trimmedContent);
      setUploadedFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const clearUploadedFile = () => {
    setUploadedFileName(null);
    setIdea('');
  };

  const handleSelectCategory = (category: CategoryType) => {
    setSelectingCategory(category);

    setTimeout(() => {
      setSelectedCategory(category);
      setStep('subtype');
      setSelectingCategory(null);
    }, 300);
  };

  const handleSelectPreset = (key: BookPresetKey) => {
    setSelectingPreset(key);

    setTimeout(() => {
      setSelectedPreset(key);
      const preset = BOOK_PRESETS[key];

      // Set default art style for illustrated books
      if (preset.artStyle) {
        setSelectedArtStyle(preset.artStyle as ArtStyleKey);
      } else {
        setSelectedArtStyle(null);
      }

      // Go to idea step
      setStep('idea');
      setSelectingPreset(null);
    }, 400);
  };

  // Get target words and chapters from the preset
  const getTargetFromPreset = () => {
    if (!selectedPreset) return { targetWords: 60000, targetChapters: 20 };

    const preset = BOOK_PRESETS[selectedPreset];

    // Screenplays use targetPages and sequences
    if (preset.format === 'screenplay') {
      const pages = 'targetPages' in preset ? (preset.targetPages as number) : 100;
      const sequences = 'sequences' in preset ? (preset.sequences as number) : 8;
      return { targetWords: pages * 250, targetChapters: sequences };
    }

    // Text and visual books use targetWords and chapters
    return { targetWords: preset.targetWords as number, targetChapters: preset.chapters as number };
  };

  const handleContinue = () => {
    if (!selectedPreset) return;
    const preset = BOOK_PRESETS[selectedPreset];

    // Only image books need the style step
    const needsStyleStep = selectedCategory === 'image';
    if (needsStyleStep && step === 'idea') {
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

      // Determine book type based on preset format
      let bookType = genre?.type || 'fiction';
      if (selectedPreset === 'nonfiction' || selectedPreset === 'lead_magnet') {
        bookType = 'non-fiction';
      } else if (preset.format === 'screenplay') {
        bookType = 'fiction';
      }

      // Check if this is an illustrated book
      const isIllustrated = preset.format !== 'text_only' && preset.format !== 'screenplay';

      const expandResponse = await fetch('/api/expand-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          bookType,
          isIllustrated,
          isScreenplay: preset.format === 'screenplay',
        }),
      });

      if (!expandResponse.ok) throw new Error('Failed to expand idea');
      const bookPlan = await expandResponse.json();

      // Get target words and chapters from preset
      const { targetWords, targetChapters } = getTargetFromPreset();

      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookPlan,
          bookPreset: selectedPreset,
          bookFormat: preset.format,
          artStyle: selectedArtStyle,
          dialogueStyle: preset.dialogueStyle || null,
          targetWords,
          targetChapters,
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

  // Get estimated time from preset
  const getEstimatedTime = () => {
    if (!selectedPreset) return null;
    const preset = BOOK_PRESETS[selectedPreset];
    return 'estimatedTime' in preset ? (preset.estimatedTime as string) : null;
  };

  // Get category label
  const getCategoryLabel = () => {
    if (!selectedCategory) return '';
    return CATEGORIES.find(c => c.value === selectedCategory)?.label || '';
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Choose Category */}
          {step === 'category' && (
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
                    {CATEGORIES.map((category) => {
                      const IconComponent = category.icon;
                      const isSelecting = selectingCategory === category.value;
                      return (
                        <button
                          key={category.value}
                          onClick={() => handleSelectCategory(category.value)}
                          disabled={selectingCategory !== null}
                          className={`group p-8 rounded-2xl border-2 transition-all text-center ${
                            isSelecting
                              ? 'bg-neutral-900 border-neutral-900 scale-[0.98]'
                              : 'bg-white border-neutral-200 hover:border-neutral-400 hover:shadow-xl'
                          } ${selectingCategory !== null && !isSelecting ? 'opacity-50' : ''}`}
                        >
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors ${
                            isSelecting
                              ? 'bg-white/20'
                              : 'bg-neutral-100 group-hover:bg-neutral-200'
                          }`}>
                            {isSelecting ? (
                              <Loader2 className="h-8 w-8 text-white animate-spin" />
                            ) : (
                              <IconComponent className={`h-8 w-8 ${isSelecting ? 'text-white' : 'text-neutral-700'}`} />
                            )}
                          </div>
                          <h3 className={`text-xl font-semibold mb-2 ${isSelecting ? 'text-white' : ''}`} style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                            {category.label}
                          </h3>
                          <p className={`text-sm ${isSelecting ? 'text-neutral-300' : 'text-neutral-600'}`}>
                            {category.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 2: Choose Specific Type */}
          {step === 'subtype' && selectedCategory && (
            <>
              <button
                onClick={() => {
                  setStep('category');
                  setSelectedCategory(null);
                }}
                className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-8 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" /> Back
              </button>

              <div className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                  {selectedCategory === 'text' && 'Choose your book type'}
                  {selectedCategory === 'image' && 'Choose your visual style'}
                  {selectedCategory === 'screenplay' && 'Choose your format'}
                </h1>
                <p className="text-lg text-neutral-600">
                  {selectedCategory === 'text' && 'Select the length and type of book you want to create'}
                  {selectedCategory === 'image' && 'Select the type of illustrated book'}
                  {selectedCategory === 'screenplay' && 'Film, TV pilot, or series episode'}
                </p>
              </div>

              <div className={`grid gap-4 ${
                selectedCategory === 'text' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5' :
                selectedCategory === 'image' ? 'grid-cols-1 md:grid-cols-3' :
                'grid-cols-2 md:grid-cols-3'
              }`}>
                {CATEGORY_PRESETS[selectedCategory].map((key) => {
                  const presetItem = BOOK_PRESETS[key];
                  const IconComponent = PRESET_ICONS[key] || BookOpen;
                  const isSelecting = selectingPreset === key;

                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectPreset(key)}
                      disabled={selectingPreset !== null}
                      className={`group p-5 rounded-2xl border transition-all text-left ${
                        isSelecting
                          ? 'bg-neutral-900 border-neutral-900 scale-[0.98]'
                          : 'bg-white border-neutral-200 hover:border-neutral-400 hover:shadow-lg'
                      } ${selectingPreset !== null && !isSelecting ? 'opacity-50' : ''}`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${
                        isSelecting
                          ? 'bg-white/20'
                          : 'bg-neutral-100 group-hover:bg-neutral-200'
                      }`}>
                        {isSelecting ? (
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                          <IconComponent className={`h-5 w-5 ${isSelecting ? 'text-white' : 'text-neutral-700'}`} />
                        )}
                      </div>
                      <h3 className={`text-base font-semibold mb-1 ${isSelecting ? 'text-white' : ''}`} style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                        {presetItem.label}
                      </h3>
                      <p className={`text-xs mb-3 line-clamp-2 ${isSelecting ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        {presetItem.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`text-lg font-bold ${isSelecting ? 'text-white' : ''}`}>{presetItem.priceDisplay}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          isSelecting
                            ? 'bg-white/20 text-white'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {presetItem.downloadFormat.toUpperCase()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 3: Write Your Idea */}
          {step === 'idea' && preset && (
            <>
              <button
                onClick={() => {
                  setStep('subtype');
                  setSelectedPreset(null);
                }}
                className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-8 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" /> Back to {getCategoryLabel().toLowerCase()} options
              </button>

              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-neutral-100 px-4 py-2 rounded-full text-sm mb-4">
                  <span>{preset.label}</span>
                  <span className="text-neutral-400">•</span>
                  <span className="font-semibold">{preset.priceDisplay}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                  Describe your {preset.format === 'picture_book' ? 'story' : preset.format === 'screenplay' ? 'movie' : 'book'} idea
                </h1>
                <p className="text-lg text-neutral-600">
                  {selectedPreset === 'comic_story' || selectedPreset === 'adult_comic'
                    ? "Tell us about your comic story - the characters, action, and setting"
                    : selectedPreset === 'nonfiction' || selectedPreset === 'lead_magnet'
                    ? "Tell us what you want to teach - the main topic, key lessons, and target audience"
                    : preset.format === 'screenplay'
                    ? "Tell us about your story - the premise, main characters, and genre"
                    : preset.format === 'picture_book'
                    ? "Tell us about your children's story - the characters, setting, and message"
                    : "Share your concept and we'll expand it into a full outline"}
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200 p-6 md:p-8">
                {/* Uploaded file indicator */}
                {uploadedFileName && (
                  <div className="flex items-center justify-between bg-neutral-100 px-4 py-2 rounded-lg mb-4">
                    <div className="flex items-center gap-2 text-sm text-neutral-700">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">{uploadedFileName}</span>
                      <span className="text-neutral-500">uploaded</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearUploadedFile}
                      className="text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Drag and drop zone */}
                <div
                  className="relative"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleFileDrop}
                >
                  <textarea
                    value={idea}
                    onChange={(e) => {
                      setIdea(e.target.value);
                      if (uploadedFileName) setUploadedFileName(null);
                    }}
                    placeholder={
                      selectedPreset === 'comic_story' || selectedPreset === 'adult_comic'
                        ? "A noir detective story set in a rainy city where a private eye investigates a series of mysterious disappearances..."
                        : selectedPreset === 'nonfiction' || selectedPreset === 'lead_magnet'
                        ? "A comprehensive guide to becoming a successful screenwriter, covering everything from story structure to pitching your scripts to studios..."
                        : preset.format === 'screenplay'
                        ? "A psychological thriller about a detective who discovers her own name in a cold case file from 1985, leading her down a rabbit hole of conspiracy..."
                        : preset.format === 'picture_book'
                        ? "A curious little fox named Pip who discovers that the stars in the sky are actually sleeping fireflies..."
                        : "A mystery novel about a detective who discovers her own name in a cold case file from 1985..."
                    }
                    rows={8}
                    className={`w-full px-4 py-4 text-lg bg-neutral-50 border rounded-xl focus:border-neutral-900 focus:outline-none resize-none transition-colors ${
                      isDragging ? 'border-neutral-900 bg-neutral-100' : 'border-neutral-200'
                    }`}
                    disabled={isSubmitting || isParsingFile}
                  />

                  {/* Drag overlay */}
                  {isDragging && (
                    <div className="absolute inset-0 bg-neutral-900/10 rounded-xl flex items-center justify-center border-2 border-dashed border-neutral-900 pointer-events-none">
                      <div className="bg-white px-6 py-4 rounded-xl shadow-lg flex items-center gap-3">
                        <Upload className="h-6 w-6 text-neutral-700" />
                        <span className="font-medium text-neutral-900">Drop your file here</span>
                      </div>
                    </div>
                  )}

                  {/* Parsing overlay */}
                  {isParsingFile && (
                    <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-neutral-700" />
                        <span className="font-medium text-neutral-900">Reading file...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Helper text and surprise me button */}
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

                    {/* File upload link */}
                    <label className="text-xs text-neutral-400 hover:text-neutral-600 cursor-pointer flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      upload (.pdf/.txt, up to 120k chars)
                      <input
                        type="file"
                        accept=".txt,.md,.docx,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isSubmitting || isParsingFile}
                      />
                    </label>
                  </div>

                  <span className={`text-sm ${idea.trim().split(/\s+/).filter(w => w).length > 1000 ? 'text-amber-600' : 'text-neutral-500'}`}>
                    {idea.trim() ? idea.trim().split(/\s+/).filter(w => w).length : 0} words
                  </span>
                </div>

                {/* Estimated time display */}
                {getEstimatedTime() && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
                    <Clock className="h-4 w-4" />
                    <span>Estimated generation time: {getEstimatedTime()}</span>
                  </div>
                )}

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
                    ) : selectedCategory === 'image' ? (
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

          {/* Step 4: Art Style (for image books only) */}
          {step === 'style' && preset && (
            <>
              <button
                onClick={() => setStep('idea')}
                className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-8 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" /> Back to idea
              </button>

              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ fontFamily: 'FoundersGrotesk, system-ui' }}>
                  Choose your art style
                </h1>
                <p className="text-lg text-neutral-600">
                  {selectedPreset === 'comic_story' || selectedPreset === 'adult_comic'
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
                        <div className="absolute inset-0 bg-neutral-900/10 flex items-center justify-center">
                          <div className="bg-neutral-900 rounded-full p-2">
                            <Check className="h-5 w-5 text-white" />
                          </div>
                        </div>
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
