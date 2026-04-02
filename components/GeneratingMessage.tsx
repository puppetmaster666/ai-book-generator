'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Fun, varied messages for different generation stages
const IDEA_MESSAGES = [
  "Brainstorming something brilliant...",
  "Rummaging through the imagination vault...",
  "Asking the muse for inspiration...",
  "Connecting unexpected dots...",
  "Brewing a fresh concept...",
  "Searching for that perfect spark...",
  "Mixing genres like a mad scientist...",
  "Daydreaming on your behalf...",
];

const OUTLINE_MESSAGES = [
  "Mapping out your story world...",
  "Plotting twists you won't see coming...",
  "Sketching character arcs...",
  "Building the story blueprint...",
  "Deciding who the villain really is...",
  "Planting seeds for the big reveal...",
  "Connecting every chapter like dominoes...",
  "Making sure the ending earns its tears...",
];

const CHAPTER_MESSAGES = [
  "Writing prose that flows...",
  "Finding the perfect opening line...",
  "Making characters argue convincingly...",
  "Adding the details that make it real...",
  "Crafting dialogue that sounds human...",
  "Building tension, page by page...",
  "Letting the story surprise itself...",
  "Polishing sentences until they shine...",
  "Wrestling with the middle (every author's struggle)...",
  "Making sure nobody says 'I need you to understand'...",
];

const ILLUSTRATION_MESSAGES = [
  "Painting your world into existence...",
  "Mixing colors on the digital palette...",
  "Bringing characters to life, pixel by pixel...",
  "Composing the perfect scene...",
  "Adding those tiny details you'll love finding...",
  "Making sure everyone looks like themselves...",
  "Choosing the perfect camera angle...",
  "Rendering light and shadow...",
];

const SCREENPLAY_MESSAGES = [
  "Writing dialogue with subtext...",
  "Setting up scenes that crackle...",
  "Making every line earn its place...",
  "Cutting the boring parts (you're welcome)...",
  "Adding the pause before the big line...",
  "Making sure it reads like a real script...",
  "Building the scene everyone will talk about...",
  "Letting characters interrupt each other...",
];

const COVER_MESSAGES = [
  "Designing a cover worth judging...",
  "Making it pop at thumbnail size...",
  "Finding the right vibe...",
  "Ensuring it looks great on a shelf...",
];

type GenerationType = 'idea' | 'outline' | 'chapter' | 'illustration' | 'screenplay' | 'cover' | 'general';

const MESSAGE_MAP: Record<GenerationType, string[]> = {
  idea: IDEA_MESSAGES,
  outline: OUTLINE_MESSAGES,
  chapter: CHAPTER_MESSAGES,
  illustration: ILLUSTRATION_MESSAGES,
  screenplay: SCREENPLAY_MESSAGES,
  cover: COVER_MESSAGES,
  general: [...OUTLINE_MESSAGES, ...CHAPTER_MESSAGES],
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  return `0:${secs.toString().padStart(2, '0')}`;
}

interface GeneratingMessageProps {
  type: GenerationType;
  showTimer?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function GeneratingMessage({ type, showTimer = true, size = 'md', className = '' }: GeneratingMessageProps) {
  const messages = MESSAGE_MAP[type] || MESSAGE_MAP.general;
  const [messageIndex, setMessageIndex] = useState(() => Math.floor(Math.random() * messages.length));
  const [elapsed, setElapsed] = useState(0);

  // Rotate messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [messages.length]);

  // Timer
  useEffect(() => {
    if (!showTimer) return;
    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [showTimer]);

  const sizeClasses = {
    sm: { icon: 'h-4 w-4', text: 'text-xs', timer: 'text-[10px]' },
    md: { icon: 'h-5 w-5', text: 'text-sm', timer: 'text-xs' },
    lg: { icon: 'h-6 w-6', text: 'text-base', timer: 'text-sm' },
  }[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses.icon} animate-spin text-neutral-400`} />
      <span className={`${sizeClasses.text} text-neutral-500 transition-opacity duration-300`}>
        {messages[messageIndex]}
      </span>
      {showTimer && elapsed > 2 && (
        <span className={`${sizeClasses.timer} text-neutral-400 tabular-nums`}>
          {formatTime(elapsed)}
        </span>
      )}
    </div>
  );
}

// Inline version for buttons (just the text, no wrapper)
export function useGeneratingText(type: GenerationType): string {
  const messages = MESSAGE_MAP[type] || MESSAGE_MAP.general;
  const [messageIndex, setMessageIndex] = useState(() => Math.floor(Math.random() * messages.length));

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [messages.length]);

  return messages[messageIndex];
}
