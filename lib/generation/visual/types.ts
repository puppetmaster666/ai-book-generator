// Scene description for visual illustrations
export interface SceneDescription {
  location: string;
  transitionNote?: string; // How characters got here from previous page (for story continuity)
  description: string;
  characters: string[];
  characterActions: Record<string, string>;
  background: string;
  mood: string;
  cameraAngle: string;
}

// Dialogue for comic-style books
export interface DialogueEntry {
  speaker: string;
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  type?: 'speech' | 'thought' | 'shout';
}

// Panel layout types for comics
export type PanelLayout = 'splash' | 'two-panel' | 'three-panel' | 'four-panel';

// Enhanced outline chapter for visual books
export interface VisualChapter {
  number: number;
  title: string;
  text: string; // The actual page text (for prose style)
  summary: string;
  targetWords: number;
  dialogue?: DialogueEntry[]; // For comic/bubbles style
  scene: SceneDescription; // Detailed scene for image generation
  panelLayout?: PanelLayout; // For comics: how many panels on this page
}
