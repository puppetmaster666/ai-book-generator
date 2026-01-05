'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Download, BookOpen, Palette, Film, Loader2 } from 'lucide-react';

interface Sample {
  id: string;
  title: string;
  genre: string;
  bookType: string;
  bookFormat: string;
  bookPreset: string | null;
  artStyle: string | null;
  coverImageUrl: string | null;
  samplePdfUrl: string;
  totalWords: number;
  totalChapters: number;
}

interface GroupedSamples {
  childrens: Sample[];
  comics: Sample[];
  screenplays: Sample[];
  novels: Sample[];
}

export default function SamplesSection() {
  const [samples, setSamples] = useState<GroupedSamples | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/samples')
      .then(res => res.json())
      .then(data => {
        setSamples(data.grouped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        </div>
      </section>
    );
  }

  if (!samples) return null;

  const hasAnySamples =
    samples.childrens.length > 0 ||
    samples.comics.length > 0 ||
    samples.screenplays.length > 0;

  if (!hasAnySamples) return null;

  const handleDownload = (sample: Sample) => {
    // Create a link to download the PDF
    const link = document.createElement('a');
    link.href = sample.samplePdfUrl;
    link.download = `${sample.title.replace(/[^a-zA-Z0-9]/g, '_')}_sample.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const SampleCard = ({ sample, type }: { sample: Sample; type: string }) => (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Cover Image */}
      <div className="aspect-[3/4] bg-neutral-100 relative">
        {sample.coverImageUrl ? (
          <Image
            src={sample.coverImageUrl}
            alt={sample.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {type === 'childrens' && <Palette className="h-12 w-12 text-neutral-300" />}
            {type === 'comics' && <BookOpen className="h-12 w-12 text-neutral-300" />}
            {type === 'screenplays' && <Film className="h-12 w-12 text-neutral-300" />}
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-neutral-900 mb-1 line-clamp-2">{sample.title}</h3>
        <p className="text-sm text-neutral-500 mb-3">
          {type === 'childrens' && `${sample.totalChapters} pages`}
          {type === 'comics' && `${sample.totalChapters} pages`}
          {type === 'screenplays' && `${Math.round(sample.totalWords / 250)} pages`}
        </p>
        <button
          onClick={() => handleDownload(sample)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
        >
          <Download className="h-4 w-4" />
          Download Sample
        </button>
      </div>
    </div>
  );

  return (
    <section className="py-16 bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2
            className="text-3xl font-bold text-neutral-900 mb-3"
            style={{ fontFamily: 'FoundersGrotesk, system-ui' }}
          >
            Download Sample Books
          </h2>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            See the quality of our AI-generated books. Download free samples to preview before creating your own.
          </p>
        </div>

        {/* Children's Books */}
        {samples.childrens.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-5 w-5 text-pink-500" />
              <h3 className="text-lg font-semibold text-neutral-900">Picture Books</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {samples.childrens.slice(0, 1).map(sample => (
                <SampleCard key={sample.id} sample={sample} type="childrens" />
              ))}
            </div>
          </div>
        )}

        {/* Comics */}
        {samples.comics.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-neutral-900">Comic Books</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {samples.comics.slice(0, 2).map(sample => (
                <SampleCard key={sample.id} sample={sample} type="comics" />
              ))}
            </div>
          </div>
        )}

        {/* Screenplays */}
        {samples.screenplays.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Film className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-semibold text-neutral-900">Screenplays</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {samples.screenplays.slice(0, 2).map(sample => (
                <SampleCard key={sample.id} sample={sample} type="screenplays" />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
