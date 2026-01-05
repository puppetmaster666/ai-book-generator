'use client';

import { useEffect, useState, useRef } from 'react';

// Sample screenplay content with proper formatting
const SCREENPLAY_CONTENT = `INT. DETECTIVE'S OFFICE - NIGHT

Rain hammers against the window. SARAH CHEN (40s, sharp eyes, weathered) sits alone, staring at a crumpled photograph.

                    SARAH
          She knew. The whole damn time,
          she knew.

She crumples the photo in her fist. A KNOCK at the door.

                    SARAH (CONT'D)
          It's open.

The door creaks. DETECTIVE MARCUS WEBB (50s, graying temples) steps in, rain dripping from his coat.

                    MARCUS
          Found something. The warehouse on
          Fifth—there's a witness.

Sarah stands abruptly, grabbing her jacket.

                    SARAH
          Then let's not keep them waiting.

                                                CUT TO:

EXT. WAREHOUSE DISTRICT - NIGHT

Sarah's sedan cuts through sheets of rain. Warehouses loom like sleeping giants on either side.`;

export default function ScreenplayAnimation() {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let currentIndex = 0;
    const content = SCREENPLAY_CONTENT;

    const typeNextChar = () => {
      if (currentIndex < content.length) {
        setDisplayedText(content.slice(0, currentIndex + 1));
        currentIndex++;

        // Vary typing speed for realism
        let delay = 30; // Base typing speed
        const char = content[currentIndex - 1];

        // Pause longer at line breaks
        if (char === '\n') delay = 100;
        // Pause at punctuation
        if (['.', '!', '?'].includes(char)) delay = 150;
        // Quick for spaces
        if (char === ' ') delay = 20;

        timeoutRef.current = setTimeout(typeNextChar, delay);
      } else {
        // Finished typing - pause then restart
        setIsTyping(false);
        timeoutRef.current = setTimeout(() => {
          currentIndex = 0;
          setDisplayedText('');
          setIsTyping(true);
          typeNextChar();
        }, 3000); // 3 second pause before restart
      }
    };

    typeNextChar();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom as text is typed
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedText]);

  // Parse and format screenplay text
  const formatScreenplay = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Scene headings (INT./EXT.)
      if (line.match(/^(INT\.|EXT\.|INT\/EXT\.)/)) {
        return (
          <div key={index} className="font-bold text-neutral-900 mt-4 first:mt-0">
            {line}
          </div>
        );
      }

      // Character names (all caps, centered-ish)
      if (line.match(/^                    [A-Z][A-Z\s]+(\s\(.*\))?$/)) {
        return (
          <div key={index} className="text-center text-neutral-800 font-medium mt-3">
            {line.trim()}
          </div>
        );
      }

      // Dialogue (indented)
      if (line.match(/^          /)) {
        return (
          <div key={index} className="ml-16 text-neutral-700">
            {line.trim()}
          </div>
        );
      }

      // Transitions (right-aligned)
      if (line.match(/CUT TO:|FADE|DISSOLVE/)) {
        return (
          <div key={index} className="text-right text-neutral-600 mt-3">
            {line.trim()}
          </div>
        );
      }

      // Action lines
      if (line.trim()) {
        return (
          <div key={index} className="text-neutral-700 mt-2">
            {line}
          </div>
        );
      }

      // Empty lines
      return <div key={index} className="h-2" />;
    });
  };

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-lg overflow-hidden">
      {/* Title bar */}
      <div className="bg-neutral-100 border-b border-neutral-200 px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <span className="text-sm text-neutral-600 ml-2 font-mono">screenplay.fdx</span>
        {isTyping && (
          <span className="ml-auto text-xs text-neutral-400 animate-pulse">Writing...</span>
        )}
      </div>

      {/* Screenplay content */}
      <div
        ref={containerRef}
        className="p-6 font-mono text-sm h-[400px] overflow-y-auto bg-[#FFFEF5]"
        style={{ fontFamily: 'Courier New, Courier, monospace' }}
      >
        {formatScreenplay(displayedText)}
        {/* Blinking cursor */}
        <span className="inline-block w-2 h-4 bg-neutral-800 animate-pulse ml-0.5" />
      </div>
    </div>
  );
}
