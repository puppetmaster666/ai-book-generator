'use client';

import { useState, useEffect } from 'react';
import { Clock, Shield, Loader2 } from 'lucide-react';

/**
 * Step-based generation progress with estimated time, countdown, and "don't leave" disclaimer.
 *
 * Shows:
 * - Current step name and description
 * - Elapsed time counter
 * - Estimated time remaining (countdown)
 * - Progress through steps (step X of Y)
 * - "Please don't close this page" disclaimer
 */

export interface GenerationStep {
  name: string;
  description: string;
  estimatedSeconds: number; // estimated duration for this step
}

// Preset step definitions for different book types
export const NOVEL_STEPS: GenerationStep[] = [
  { name: 'Creating Outline', description: 'Planning chapters, characters, and story arc', estimatedSeconds: 30 },
  { name: 'Writing Chapters', description: 'Generating each chapter with AI', estimatedSeconds: 120 },
  { name: 'Quality Review', description: 'Checking consistency and polishing prose', estimatedSeconds: 45 },
  { name: 'Generating Cover', description: 'Creating your book cover art', estimatedSeconds: 20 },
  { name: 'Assembling Book', description: 'Compiling everything into your final book', estimatedSeconds: 15 },
];

export const COMIC_STEPS: GenerationStep[] = [
  { name: 'Writing Script', description: 'Creating the story with character voices and dialogue', estimatedSeconds: 30 },
  { name: 'Planning Scenes', description: 'Breaking the script into panels with visual direction', estimatedSeconds: 25 },
  { name: 'Quality Review', description: 'Checking story coherence and dialogue quality', estimatedSeconds: 15 },
  { name: 'Generating Art', description: 'Creating illustrations for each panel', estimatedSeconds: 180 },
  { name: 'Assembling Book', description: 'Compiling panels into your final comic', estimatedSeconds: 15 },
];

export const PICTURE_BOOK_STEPS: GenerationStep[] = [
  { name: 'Writing Story', description: 'Crafting the narrative and page text', estimatedSeconds: 25 },
  { name: 'Planning Illustrations', description: 'Designing scenes for each page', estimatedSeconds: 20 },
  { name: 'Generating Art', description: 'Creating beautiful illustrations for each page', estimatedSeconds: 150 },
  { name: 'Assembling Book', description: 'Putting together your picture book', estimatedSeconds: 15 },
];

export const SCREENPLAY_STEPS: GenerationStep[] = [
  { name: 'Creating Beat Sheet', description: 'Planning the story structure with Save the Cat beats', estimatedSeconds: 30 },
  { name: 'Writing Sequences', description: 'Generating screenplay sequences with dialogue', estimatedSeconds: 180 },
  { name: 'Refining Dialogue', description: 'Polishing dialogue for subtext and voice', estimatedSeconds: 60 },
  { name: 'Script Review', description: 'Final quality check and formatting', estimatedSeconds: 30 },
];

function formatTime(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) {
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }
  return `${s}s`;
}

function getTotalEstimate(steps: GenerationStep[]): number {
  return steps.reduce((sum, step) => sum + step.estimatedSeconds, 0);
}

interface GenerationProgressProps {
  steps: GenerationStep[];
  currentStepIndex: number; // 0-based index into steps array
  elapsedSeconds: number;   // total elapsed time
  /** Optional: override to show specific step progress (e.g. "Chapter 3 of 20") */
  stepDetail?: string;
}

export default function GenerationProgress({
  steps,
  currentStepIndex,
  elapsedSeconds,
  stepDetail,
}: GenerationProgressProps) {
  const [dots, setDots] = useState('');

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const safeIndex = Math.min(currentStepIndex, steps.length - 1);
  const currentStep = steps[safeIndex];

  // Calculate estimated time remaining
  // Time already spent on completed steps
  const completedStepsTime = steps.slice(0, safeIndex).reduce((sum, s) => sum + s.estimatedSeconds, 0);
  // Estimated total time
  const totalEstimate = getTotalEstimate(steps);
  // Estimated remaining = total estimate minus elapsed, but floor at 0
  const estimatedRemaining = Math.max(0, totalEstimate - elapsedSeconds);

  // Overall progress percentage
  const overallProgress = Math.min(
    ((safeIndex / steps.length) * 100) + ((1 / steps.length) * 50), // rough mid-step estimate
    99 // never show 100% until actually done
  );

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-4">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div
              className={`
                w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-500
                ${i < safeIndex
                  ? 'bg-emerald-500 text-white'
                  : i === safeIndex
                    ? 'bg-neutral-900 text-white ring-4 ring-neutral-200'
                    : 'bg-neutral-100 text-neutral-400'
                }
              `}
            >
              {i < safeIndex ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 rounded transition-all duration-500 ${i < safeIndex ? 'bg-emerald-400' : 'bg-neutral-100'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Current step info */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5">
            <Loader2 className="h-5 w-5 text-neutral-700 animate-spin" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-neutral-900 text-base">
              {currentStep.name}{dots}
            </h3>
            <p className="text-sm text-neutral-500 mt-0.5">
              {stepDetail || currentStep.description}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-neutral-400 mb-0.5">Step {safeIndex + 1} of {steps.length}</div>
        </div>
      </div>

      {/* Time info row */}
      <div className="flex items-center justify-between bg-neutral-50 rounded-xl px-4 py-3 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-neutral-400" />
          <span className="text-sm text-neutral-600">Elapsed:</span>
          <span className="font-mono text-sm font-medium text-neutral-900">{formatTime(elapsedSeconds)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600">Est. remaining:</span>
          <span className="font-mono text-sm font-medium text-neutral-900">
            {estimatedRemaining > 0 ? `~${formatTime(estimatedRemaining)}` : 'Almost done'}
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Shield className="h-4 w-4 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          <span className="font-medium">Please don&apos;t close or refresh this page.</span>
          {' '}Your generation is in progress and leaving may interrupt it.
        </p>
      </div>
    </div>
  );
}
