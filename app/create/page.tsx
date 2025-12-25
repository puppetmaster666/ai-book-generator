'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { ArrowLeft, ArrowRight, Plus, X } from 'lucide-react';
import { GENRES, WRITING_STYLES, CHAPTER_FORMATS, FONT_STYLES } from '@/lib/constants';

type Character = { name: string; description: string };

interface BookFormData {
  title: string;
  authorName: string;
  genre: string;
  premise: string;
  characters: Character[];
  beginning: string;
  middle: string;
  ending: string;
  writingStyle: string;
  chapterFormat: string;
  fontStyle: string;
}

const STEPS = [
  { id: 1, title: 'Title & Genre' },
  { id: 2, title: 'Premise & Characters' },
  { id: 3, title: 'Plot' },
  { id: 4, title: 'Style & Format' },
  { id: 5, title: 'Review' },
];

export default function CreateBook() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    authorName: '',
    genre: '',
    premise: '',
    characters: [{ name: '', description: '' }],
    beginning: '',
    middle: '',
    ending: '',
    writingStyle: 'literary',
    chapterFormat: 'both',
    fontStyle: 'classic',
  });

  useEffect(() => {
    const savedIdea = sessionStorage.getItem('bookIdea');
    if (savedIdea) {
      setFormData(prev => ({ ...prev, premise: savedIdea }));
      sessionStorage.removeItem('bookIdea');
    }
  }, []);

  const updateField = (field: keyof BookFormData, value: string | Character[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addCharacter = () => {
    setFormData(prev => ({
      ...prev,
      characters: [...prev.characters, { name: '', description: '' }],
    }));
  };

  const updateCharacter = (index: number, field: 'name' | 'description', value: string) => {
    const newCharacters = [...formData.characters];
    newCharacters[index][field] = value;
    updateField('characters', newCharacters);
  };

  const removeCharacter = (index: number) => {
    if (formData.characters.length > 1) {
      const newCharacters = formData.characters.filter((_, i) => i !== index);
      updateField('characters', newCharacters);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.title.trim() && formData.genre;
      case 2:
        return formData.premise.trim().length >= 20 && formData.characters[0].name.trim();
      case 3:
        return formData.beginning.trim() && formData.middle.trim() && formData.ending.trim();
      case 4:
        return formData.writingStyle && formData.chapterFormat && formData.fontStyle;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create book');

      const { bookId } = await response.json();
      router.push(`/checkout?bookId=${bookId}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create book. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF8]">
      <Header />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step.id ? 'bg-[#1E3A5F] text-white' : 'bg-[#E8E4DC] text-[#4A5568]'
                  }`}>
                    {step.id}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-12 sm:w-24 h-1 mx-2 ${
                      currentStep > step.id ? 'bg-[#1E3A5F]' : 'bg-[#E8E4DC]'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 text-center">
              <span className="text-sm text-[#4A5568]">{STEPS[currentStep - 1].title}</span>
            </div>
          </div>

          {/* Form Content */}
          <div className="bg-white rounded-xl border border-[#E8E4DC] p-6 sm:p-8">
            {/* Step 1: Title & Genre */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#0F1A2A] mb-2">Book Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="Enter your book title"
                    className="w-full px-4 py-3 border border-[#E8E4DC] rounded-lg focus:border-[#1E3A5F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F1A2A] mb-2">Author Name</label>
                  <input
                    type="text"
                    value={formData.authorName}
                    onChange={(e) => updateField('authorName', e.target.value)}
                    placeholder="Your name or pen name"
                    className="w-full px-4 py-3 border border-[#E8E4DC] rounded-lg focus:border-[#1E3A5F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F1A2A] mb-2">Genre</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(GENRES).map(([key, genre]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateField('genre', key)}
                        className={`p-3 rounded-lg border text-left ${
                          formData.genre === key
                            ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                            : 'border-[#E8E4DC] hover:border-[#1E3A5F]'
                        }`}
                      >
                        <span className="font-medium text-[#0F1A2A]">{genre.label}</span>
                        <span className="block text-xs text-[#4A5568] mt-1">~{(genre.targetWords / 1000).toFixed(0)}K words</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Premise & Characters */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#0F1A2A] mb-2">Premise</label>
                  <textarea
                    value={formData.premise}
                    onChange={(e) => updateField('premise', e.target.value)}
                    placeholder="Describe your book idea in 2-3 sentences. What is the hook?"
                    rows={4}
                    className="w-full px-4 py-3 border border-[#E8E4DC] rounded-lg focus:border-[#1E3A5F] focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-[#0F1A2A]">Main Characters</label>
                    <button type="button" onClick={addCharacter} className="text-[#1E3A5F] text-sm flex items-center gap-1 hover:underline">
                      <Plus className="h-4 w-4" /> Add Character
                    </button>
                  </div>
                  <div className="space-y-4">
                    {formData.characters.map((char, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={char.name}
                            onChange={(e) => updateCharacter(index, 'name', e.target.value)}
                            placeholder="Character name"
                            className="w-full px-4 py-2 border border-[#E8E4DC] rounded-lg focus:border-[#1E3A5F] focus:outline-none"
                          />
                          <textarea
                            value={char.description}
                            onChange={(e) => updateCharacter(index, 'description', e.target.value)}
                            placeholder="Brief description (personality, role in story)"
                            rows={2}
                            className="w-full px-4 py-2 border border-[#E8E4DC] rounded-lg focus:border-[#1E3A5F] focus:outline-none resize-none"
                          />
                        </div>
                        {formData.characters.length > 1 && (
                          <button type="button" onClick={() => removeCharacter(index)} className="text-[#EF4444] self-start p-2">
                            <X className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Plot */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#0F1A2A] mb-2">Beginning</label>
                  <textarea
                    value={formData.beginning}
                    onChange={(e) => updateField('beginning', e.target.value)}
                    placeholder="How does the story open? What is the inciting incident?"
                    rows={4}
                    className="w-full px-4 py-3 border border-[#E8E4DC] rounded-lg focus:border-[#1E3A5F] focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F1A2A] mb-2">Middle / Key Plot Points</label>
                  <textarea
                    value={formData.middle}
                    onChange={(e) => updateField('middle', e.target.value)}
                    placeholder="Key events, conflicts, turning points. Be as detailed as you want."
                    rows={6}
                    className="w-full px-4 py-3 border border-[#E8E4DC] rounded-lg focus:border-[#1E3A5F] focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F1A2A] mb-2">Ending</label>
                  <textarea
                    value={formData.ending}
                    onChange={(e) => updateField('ending', e.target.value)}
                    placeholder="How does it conclude? What is the resolution?"
                    rows={4}
                    className="w-full px-4 py-3 border border-[#E8E4DC] rounded-lg focus:border-[#1E3A5F] focus:outline-none resize-none"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Style & Format */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#0F1A2A] mb-2">Writing Style</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(WRITING_STYLES).map(([key, style]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateField('writingStyle', key)}
                        className={`p-3 rounded-lg border text-left ${
                          formData.writingStyle === key
                            ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                            : 'border-[#E8E4DC] hover:border-[#1E3A5F]'
                        }`}
                      >
                        <span className="font-medium text-[#0F1A2A]">{style.label}</span>
                        <span className="block text-xs text-[#4A5568] mt-1">{style.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F1A2A] mb-2">Chapter Format</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(CHAPTER_FORMATS).map(([key, format]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateField('chapterFormat', key)}
                        className={`p-3 rounded-lg border text-left ${
                          formData.chapterFormat === key
                            ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                            : 'border-[#E8E4DC] hover:border-[#1E3A5F]'
                        }`}
                      >
                        <span className="font-medium text-[#0F1A2A]">{format.label}</span>
                        <span className="block text-xs text-[#4A5568] mt-1">{format.example}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F1A2A] mb-2">Book Font Style</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(FONT_STYLES).map(([key, style]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => updateField('fontStyle', key)}
                        className={`p-3 rounded-lg border text-left ${
                          formData.fontStyle === key
                            ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                            : 'border-[#E8E4DC] hover:border-[#1E3A5F]'
                        }`}
                      >
                        <span className="font-medium text-[#0F1A2A]">{style.label}</span>
                        <span className="block text-xs text-[#4A5568] mt-1">{style.body}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-[#0F1A2A]">Review Your Book</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-[#F7F5F0] rounded-lg">
                    <p className="text-sm text-[#4A5568]">Title</p>
                    <p className="font-medium text-[#0F1A2A]">{formData.title}</p>
                  </div>
                  <div className="p-4 bg-[#F7F5F0] rounded-lg">
                    <p className="text-sm text-[#4A5568]">Author</p>
                    <p className="font-medium text-[#0F1A2A]">{formData.authorName || 'Anonymous'}</p>
                  </div>
                  <div className="p-4 bg-[#F7F5F0] rounded-lg">
                    <p className="text-sm text-[#4A5568]">Genre</p>
                    <p className="font-medium text-[#0F1A2A]">{GENRES[formData.genre as keyof typeof GENRES]?.label}</p>
                    <p className="text-sm text-[#4A5568]">~{(GENRES[formData.genre as keyof typeof GENRES]?.targetWords / 1000).toFixed(0)}K words, {GENRES[formData.genre as keyof typeof GENRES]?.chapters} chapters</p>
                  </div>
                  <div className="p-4 bg-[#F7F5F0] rounded-lg">
                    <p className="text-sm text-[#4A5568]">Premise</p>
                    <p className="font-medium text-[#0F1A2A]">{formData.premise}</p>
                  </div>
                  <div className="p-4 bg-[#F7F5F0] rounded-lg">
                    <p className="text-sm text-[#4A5568]">Characters</p>
                    {formData.characters.map((char, i) => (
                      <p key={i} className="font-medium text-[#0F1A2A]">{char.name}: {char.description}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-4 py-2 text-[#4A5568] hover:text-[#0F1A2A] disabled:opacity-50"
              >
                <ArrowLeft className="h-5 w-5" /> Back
              </button>
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceed()}
                  className="flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D4A73] disabled:opacity-50"
                >
                  Continue <ArrowRight className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 bg-[#1E3A5F] text-white rounded-lg hover:bg-[#2D4A73] disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Proceed to Checkout'} <ArrowRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
