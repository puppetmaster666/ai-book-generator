'use client';

import { useState, useEffect, useRef } from 'react';
import { Film, Clock } from 'lucide-react';

interface ScreenplayPreviewProps {
  title: string;
  currentSequence: number;
  totalSequences: number;
  pagesGenerated: number;
  targetPages: number;
  elapsedTime: string;
  isGenerating: boolean;
}

// Sample screenplay lines for animation
const SAMPLE_SCREENPLAY = [
  { type: 'slugline', text: 'INT. ABANDONED WAREHOUSE - NIGHT' },
  { type: 'action', text: 'Dust motes float through shafts of moonlight. The silence is deafening.' },
  { type: 'action', text: 'JACK (40s, weathered face, haunted eyes) steps through a broken doorway.' },
  { type: 'character', text: 'JACK' },
  { type: 'dialogue', text: "I know you're here." },
  { type: 'action', text: 'He reaches for his weapon. A SHADOW moves in the darkness.' },
  { type: 'character', text: 'VOICE (O.S.)' },
  { type: 'dialogue', text: 'You shouldn\'t have come alone.' },
  { type: 'slugline', text: 'EXT. CITY ROOFTOP - CONTINUOUS' },
  { type: 'action', text: 'SARAH watches through binoculars, tension in every muscle.' },
  { type: 'character', text: 'SARAH' },
  { type: 'parenthetical', text: '(into radio)' },
  { type: 'dialogue', text: 'He\'s in. No visual on the target.' },
];

// Beat names for the 8 sequences
const SEQUENCE_BEATS = [
  { name: 'Opening', act: 1 },
  { name: 'Catalyst', act: 1 },
  { name: 'B-Story', act: 2 },
  { name: 'Midpoint', act: 2 },
  { name: 'Bad Guys Close In', act: 2 },
  { name: 'All Is Lost', act: 2 },
  { name: 'Break Into Three', act: 3 },
  { name: 'Finale', act: 3 },
];

export default function ScreenplayPreview({
  title,
  currentSequence,
  totalSequences,
  pagesGenerated,
  targetPages,
  elapsedTime,
  isGenerating,
}: ScreenplayPreviewProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [currentLineText, setCurrentLineText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Typewriter effect
  useEffect(() => {
    if (!isGenerating) return;

    let lineIndex = 0;
    let charIndex = 0;
    let typingInterval: NodeJS.Timeout;
    let lineInterval: NodeJS.Timeout;

    const typeNextChar = () => {
      const currentLine = SAMPLE_SCREENPLAY[lineIndex];
      if (!currentLine) return;

      if (charIndex <= currentLine.text.length) {
        setCurrentLineText(currentLine.text.slice(0, charIndex));
        charIndex++;
      } else {
        // Line complete, move to next
        clearInterval(typingInterval);
        setVisibleLines(prev => Math.min(prev + 1, SAMPLE_SCREENPLAY.length));
        setCurrentLineText('');
        charIndex = 0;
        lineIndex = (lineIndex + 1) % SAMPLE_SCREENPLAY.length;

        // Reset visible lines when we loop
        if (lineIndex === 0) {
          setTimeout(() => setVisibleLines(0), 500);
        }

        // Start typing next line after a pause
        lineInterval = setTimeout(() => {
          typingInterval = setInterval(typeNextChar, 30 + Math.random() * 40);
        }, 300);
      }
    };

    typingInterval = setInterval(typeNextChar, 30 + Math.random() * 40);

    return () => {
      clearInterval(typingInterval);
      clearTimeout(lineInterval);
    };
  }, [isGenerating]);

  // Cursor blink effect
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 530);
    return () => clearInterval(blinkInterval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleLines, currentLineText]);

  const getLineStyle = (type: string) => {
    switch (type) {
      case 'slugline':
        return 'uppercase font-bold';
      case 'action':
        return '';
      case 'character':
        return 'text-center uppercase mt-4';
      case 'parenthetical':
        return 'text-center italic ml-8';
      case 'dialogue':
        return 'text-center max-w-[60%] mx-auto';
      default:
        return '';
    }
  };

  const currentBeat = SEQUENCE_BEATS[currentSequence - 1] || SEQUENCE_BEATS[0];
  const progress = (pagesGenerated / targetPages) * 100;

  return (
    <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <Film className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            <p className="text-neutral-400 text-sm">Feature Film Screenplay</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-neutral-400 text-sm">
          <Clock className="h-4 w-4" />
          {elapsedTime}
        </div>
      </div>

      {/* 3-Act Timeline */}
      <div className="mb-6">
        <div className="flex items-center gap-1 mb-2">
          {/* Act 1 - 25% */}
          <div className="flex-[1] h-2 rounded-l-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (progress / 25) * 100)}%` }}
            />
          </div>
          {/* Act 2 - 50% */}
          <div className="flex-[2] h-2 bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, ((progress - 25) / 50) * 100))}%` }}
            />
          </div>
          {/* Act 3 - 25% */}
          <div className="flex-[1] h-2 rounded-r-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${Math.max(0, Math.min(100, ((progress - 75) / 25) * 100))}%` }}
            />
          </div>
        </div>
        <div className="flex text-xs text-neutral-500">
          <span className="flex-[1]">ACT I</span>
          <span className="flex-[2] text-center">ACT II</span>
          <span className="flex-[1] text-right">ACT III</span>
        </div>
      </div>

      {/* Current Beat Info */}
      <div className="flex items-center justify-between mb-4 px-3 py-2 bg-neutral-800/50 rounded-lg">
        <div>
          <span className="text-neutral-500 text-xs uppercase tracking-wider">Now Writing</span>
          <p className="text-white font-medium">{currentBeat.name}</p>
        </div>
        <div className="text-right">
          <span className="text-neutral-500 text-xs uppercase tracking-wider">Progress</span>
          <p className="text-white font-medium">~{pagesGenerated} / {targetPages} pages</p>
        </div>
      </div>

      {/* Screenplay Preview - Looks like a script page */}
      <div
        ref={containerRef}
        className="bg-[#fffef5] rounded-lg p-6 h-64 overflow-hidden relative"
        style={{ fontFamily: 'Courier New, Courier, monospace' }}
      >
        {/* Page number */}
        <div className="absolute top-2 right-4 text-neutral-400 text-xs">
          {pagesGenerated}.
        </div>

        {/* Screenplay content */}
        <div className="text-neutral-900 text-sm leading-relaxed space-y-1">
          {SAMPLE_SCREENPLAY.slice(0, visibleLines).map((line, idx) => (
            <p key={idx} className={getLineStyle(line.type)}>
              {line.text}
            </p>
          ))}

          {/* Currently typing line */}
          {visibleLines < SAMPLE_SCREENPLAY.length && (
            <p className={getLineStyle(SAMPLE_SCREENPLAY[visibleLines]?.type || 'action')}>
              {currentLineText}
              <span
                className={`inline-block w-2 h-4 bg-neutral-900 ml-0.5 ${cursorVisible ? 'opacity-100' : 'opacity-0'}`}
                style={{ transform: 'translateY(2px)' }}
              />
            </p>
          )}
        </div>

        {/* Fade overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#fffef5] to-transparent pointer-events-none" />
      </div>

      {/* Sequence Progress Dots */}
      <div className="mt-4 flex justify-center gap-2">
        {Array.from({ length: totalSequences }).map((_, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx < currentSequence - 1
                ? 'bg-amber-500'
                : idx === currentSequence - 1
                ? 'bg-amber-500 animate-pulse'
                : 'bg-neutral-700'
            }`}
            title={`Sequence ${idx + 1}: ${SEQUENCE_BEATS[idx]?.name || ''}`}
          />
        ))}
      </div>

      {/* Status text */}
      <p className="text-center text-neutral-500 text-sm mt-3">
        {isGenerating
          ? `Writing sequence ${currentSequence} of ${totalSequences}...`
          : 'Screenplay complete'
        }
      </p>
    </div>
  );
}
