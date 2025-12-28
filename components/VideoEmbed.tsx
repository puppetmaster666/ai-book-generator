'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

interface VideoEmbedProps {
  videoId: string;
  title?: string;
  thumbnail?: string;
  className?: string;
  autoplay?: boolean;
}

export default function VideoEmbed({
  videoId,
  title = 'Video',
  thumbnail,
  className = '',
  autoplay = false,
}: VideoEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(autoplay);

  // Default thumbnail from YouTube if not provided
  const thumbnailUrl = thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  if (!isPlaying) {
    return (
      <div
        className={`relative aspect-video bg-neutral-900 rounded-2xl overflow-hidden cursor-pointer group ${className}`}
        onClick={() => setIsPlaying(true)}
      >
        {/* Thumbnail */}
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-2xl transform transition-all duration-300 group-hover:scale-110 group-hover:bg-white">
            <Play className="h-8 w-8 text-neutral-900 ml-1" fill="currentColor" />
          </div>
        </div>

        {/* Title overlay */}
        {title && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white font-medium">{title}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative aspect-video rounded-2xl overflow-hidden ${className}`}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
