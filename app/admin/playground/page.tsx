'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Send, Image as ImageIcon, Type, Copy, Check } from 'lucide-react';
import Header from '@/components/Header';

export default function PlaygroundPage() {
  const { data: session } = useSession();

  const [provider, setProvider] = useState<'gemini' | 'mistral' | 'featherless' | 'runpod'>('gemini');
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [nsfw, setNsfw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [textResult, setTextResult] = useState('');
  const [imageResult, setImageResult] = useState('');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [usedProvider, setUsedProvider] = useState('');
  const [usedModel, setUsedModel] = useState('');

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError('');
    setTextResult('');
    setImageResult('');
    setElapsed(0);

    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);

    try {
      const res = await fetch('/api/admin/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          mode,
          prompt: prompt.trim(),
          ...(model ? { model } : {}),
          ...(nsfw ? { nsfw: true } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Request failed');
      } else if (mode === 'text') {
        setTextResult(data.result || '');
        setUsedProvider(data.provider || provider);
        setUsedModel(data.model || '');
      } else {
        setImageResult(data.imageUrl || '');
        setUsedProvider(data.provider || provider);
        setUsedModel(data.model || '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      clearInterval(timer);
      setElapsed(Math.floor((Date.now() - start) / 1000));
      setIsLoading(false);
    }
  };

  const providerOptions = mode === 'text'
    ? [
        { key: 'gemini' as const, label: 'Gemini Flash' },
        { key: 'mistral' as const, label: 'Mistral' },
        { key: 'featherless' as const, label: 'Featherless (Uncensored)' },
      ]
    : [
        { key: 'gemini' as const, label: 'Gemini Imagen' },
        { key: 'runpod' as const, label: 'RunPod / Flux' },
      ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold mb-1">AI Playground</h1>
        <p className="text-sm text-neutral-500 mb-8">Test text and image generation with different AI providers</p>

        {/* Mode selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setMode('text'); setProvider('gemini'); setTextResult(''); setImageResult(''); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'text' ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <Type className="h-4 w-4" />
            Text Generation
          </button>
          <button
            onClick={() => { setMode('image'); setProvider('runpod'); setTextResult(''); setImageResult(''); setError(''); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'image' ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            Image Generation
          </button>
        </div>

        {/* Provider selector */}
        <div className="flex gap-2 mb-4">
          {providerOptions.map(p => (
            <button
              key={p.key}
              onClick={() => setProvider(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                provider === p.key ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* NSFW toggle (for RunPod/Flux images) */}
        {mode === 'image' && provider === 'runpod' && (
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => setNsfw(!nsfw)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                nsfw ? 'bg-neutral-900' : 'bg-neutral-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                nsfw ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
            <span className="text-sm text-neutral-600">
              {nsfw ? 'NSFW LoRA enabled (explicit content)' : 'NSFW LoRA disabled (standard Flux)'}
            </span>
          </div>
        )}

        {/* Model override (optional) */}
        {mode === 'text' && (
          <div className="mb-4">
            <input
              type="text"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="Model override (optional, e.g. mistral-large-latest)"
              className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:border-neutral-900 focus:outline-none bg-white"
            />
          </div>
        )}

        {/* Prompt input */}
        <div className="mb-4">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={mode === 'text'
              ? 'Enter your text prompt...'
              : 'Describe the image you want to generate...'
            }
            rows={6}
            className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm focus:border-neutral-900 focus:outline-none resize-none bg-white"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || !prompt.trim()}
          className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating... ({elapsed}s)
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Generate
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700 font-medium">Error</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        )}

        {/* Text result */}
        {textResult && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-neutral-500">
                {usedProvider} / {usedModel} / {elapsed}s
              </p>
              <button
                onClick={() => { navigator.clipboard.writeText(textResult); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="p-4 bg-white border border-neutral-200 rounded-xl">
              <pre className="text-sm text-neutral-800 whitespace-pre-wrap font-mono">{textResult}</pre>
            </div>
          </div>
        )}

        {/* Image result */}
        {imageResult && (
          <div className="mt-6">
            <p className="text-xs text-neutral-500 mb-2">
              {usedProvider} / {usedModel} / {elapsed}s
            </p>
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageResult} alt="Generated" className="max-w-full max-h-[600px]" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
