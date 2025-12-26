'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { Loader2, Download, Check, X, Image as ImageIcon } from 'lucide-react';

const ADMIN_EMAIL = 'lhllparis@gmail.com';

const ART_STYLE_PROMPTS: Record<string, string> = {
  watercolor: 'A cozy fox reading a book under a tree in autumn, soft watercolor illustration style, flowing washes of warm orange and golden colors, gentle wet-on-wet technique, dreamy atmosphere, delicate brushstrokes, artistic hand-painted look, no text',
  cartoon: 'A cheerful rabbit character jumping with joy, cartoon illustration style, bold black outlines, vibrant saturated colors, expressive face with big eyes, smooth cel-shading, playful animated look, clean vector-like finish, no text',
  storybook: 'A child walking through an enchanted forest with glowing mushrooms, classic storybook illustration, warm golden lighting, gentle watercolor and gouache textures, whimsical fairy tale aesthetic, nostalgic 1950s children\'s book style, no text',
  modern: 'A cat sitting on a geometric windowsill with a plant, modern minimalist illustration, clean simple lines, limited color palette of 3-4 muted tones, flat design with subtle shadows, contemporary Scandinavian aesthetic, no text',
  realistic: 'A majestic owl perched on a branch at twilight, realistic detailed illustration, lifelike feather textures, rich atmospheric lighting, photorealistic rendering, nature documentary quality, cinematic depth, no text',
  manga: 'A young adventurer with determined expression looking at the horizon, manga anime illustration style, large expressive eyes, dynamic hair movement, Japanese comic aesthetic, clean line art with cel shading, shounen energy, no text',
  vintage: 'A bicycle leaning against a quaint European cafe, vintage retro illustration, muted sepia and dusty rose colors, mid-century modern aesthetic, aged paper texture, 1960s travel poster style, nostalgic charm, no text',
  fantasy: 'A dragon flying over a mystical castle at sunset, epic fantasy art illustration, magical golden hour lighting, detailed otherworldly architecture, rich jewel tones, painterly brushwork, enchanting atmosphere, no text',
};

const ASPECT_RATIOS = {
  '1:1': { width: 1024, height: 1024, label: 'Square (1:1)' },
  '16:9': { width: 1024, height: 576, label: 'Landscape (16:9)' },
  '9:16': { width: 576, height: 1024, label: 'Portrait (9:16)' },
  '4:3': { width: 1024, height: 768, label: 'Standard (4:3)' },
  '3:2': { width: 1024, height: 683, label: 'Photo (3:2)' },
};

interface GeneratedImage {
  style: string;
  aspectRatio: string;
  imageUrl: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  error?: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');

  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedRatio, setSelectedRatio] = useState<string>('1:1');
  const [customPrompt, setCustomPrompt] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);

  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.toLowerCase() === ADMIN_EMAIL) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Access denied. Admin only.');
    }
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev =>
      prev.includes(style)
        ? prev.filter(s => s !== style)
        : [...prev, style]
    );
  };

  const selectAllStyles = () => {
    setSelectedStyles(Object.keys(ART_STYLE_PROMPTS));
  };

  const clearSelection = () => {
    setSelectedStyles([]);
  };

  const generateImages = async () => {
    if (selectedStyles.length === 0 && !useCustomPrompt) return;

    setIsGenerating(true);

    const stylesToGenerate = useCustomPrompt
      ? [{ style: 'custom', prompt: customPrompt }]
      : selectedStyles.map(style => ({ style, prompt: ART_STYLE_PROMPTS[style] }));

    // Initialize all as pending
    const initialImages: GeneratedImage[] = stylesToGenerate.map(({ style }) => ({
      style,
      aspectRatio: selectedRatio,
      imageUrl: '',
      status: 'pending',
    }));
    setGeneratedImages(initialImages);

    // Generate each image
    for (let i = 0; i < stylesToGenerate.length; i++) {
      const { style, prompt } = stylesToGenerate[i];

      // Update status to generating
      setGeneratedImages(prev => prev.map((img, idx) =>
        idx === i ? { ...img, status: 'generating' } : img
      ));

      try {
        const response = await fetch('/api/admin/generate-style-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            aspectRatio: selectedRatio,
            style,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate');
        }

        const data = await response.json();

        setGeneratedImages(prev => prev.map((img, idx) =>
          idx === i ? { ...img, status: 'done', imageUrl: data.imageUrl } : img
        ));
      } catch (error) {
        setGeneratedImages(prev => prev.map((img, idx) =>
          idx === i ? { ...img, status: 'error', error: 'Failed to generate' } : img
        ));
      }
    }

    setIsGenerating(false);
  };

  const downloadImage = (imageUrl: string, style: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `style-preview-${style}-${selectedRatio.replace(':', 'x')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    generatedImages
      .filter(img => img.status === 'done')
      .forEach(img => downloadImage(img.imageUrl, img.style));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <Header />
        <main className="py-20 px-6">
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-center">Admin Access</h1>
            <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-neutral-200 p-8">
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter admin email"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none mb-4"
              />
              {authError && (
                <p className="text-red-600 text-sm mb-4">{authError}</p>
              )}
              <button
                type="submit"
                className="w-full bg-neutral-900 text-white py-3 rounded-xl hover:bg-neutral-800 transition-colors"
              >
                Login
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />
      <main className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Style Image Generator</h1>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              Logout
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Controls */}
            <div className="lg:col-span-1 space-y-6">
              {/* Aspect Ratio */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <h2 className="font-semibold mb-4">Aspect Ratio</h2>
                <div className="space-y-2">
                  {Object.entries(ASPECT_RATIOS).map(([key, { label }]) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="aspectRatio"
                        checked={selectedRatio === key}
                        onChange={() => setSelectedRatio(key)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Art Styles */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Art Styles</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllStyles}
                      className="text-xs text-neutral-500 hover:text-neutral-900"
                    >
                      Select All
                    </button>
                    <span className="text-neutral-300">|</span>
                    <button
                      onClick={clearSelection}
                      className="text-xs text-neutral-500 hover:text-neutral-900"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.keys(ART_STYLE_PROMPTS).map((style) => (
                    <label key={style} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStyles.includes(style)}
                        onChange={() => toggleStyle(style)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm capitalize">{style}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Prompt */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6">
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={useCustomPrompt}
                    onChange={(e) => setUseCustomPrompt(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="font-semibold">Use Custom Prompt</span>
                </label>
                {useCustomPrompt && (
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Enter your custom prompt..."
                    rows={4}
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none resize-none text-sm"
                  />
                )}
              </div>

              {/* Generate Button */}
              <button
                onClick={generateImages}
                disabled={isGenerating || (selectedStyles.length === 0 && (!useCustomPrompt || !customPrompt))}
                className="w-full bg-neutral-900 text-white py-4 rounded-xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-5 w-5" />
                    Generate {useCustomPrompt ? '1' : selectedStyles.length} Image{(useCustomPrompt ? 1 : selectedStyles.length) !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>

            {/* Right Column - Results */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 min-h-[600px]">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-semibold">Generated Images</h2>
                  {generatedImages.some(img => img.status === 'done') && (
                    <button
                      onClick={downloadAll}
                      className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900"
                    >
                      <Download className="h-4 w-4" />
                      Download All
                    </button>
                  )}
                </div>

                {generatedImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-96 text-neutral-400">
                    <ImageIcon className="h-16 w-16 mb-4" />
                    <p>Select styles and click Generate</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {generatedImages.map((img, idx) => (
                      <div key={idx} className="border border-neutral-200 rounded-xl overflow-hidden">
                        <div className="aspect-square bg-neutral-100 relative">
                          {img.status === 'pending' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-sm text-neutral-400">Waiting...</span>
                            </div>
                          )}
                          {img.status === 'generating' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
                            </div>
                          )}
                          {img.status === 'done' && img.imageUrl && (
                            <img
                              src={img.imageUrl}
                              alt={img.style}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {img.status === 'error' && (
                            <div className="absolute inset-0 flex items-center justify-center text-red-500">
                              <X className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm capitalize">{img.style}</p>
                            <p className="text-xs text-neutral-500">{img.aspectRatio}</p>
                          </div>
                          {img.status === 'done' && (
                            <button
                              onClick={() => downloadImage(img.imageUrl, img.style)}
                              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          {img.status === 'done' && (
                            <Check className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
