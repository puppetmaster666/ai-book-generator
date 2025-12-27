import sharp from 'sharp';

export interface DialogueBubble {
  speaker: string;
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  type?: 'speech' | 'thought' | 'shout';
}

interface BubblePosition {
  x: number;
  y: number;
  tailDirection: 'left' | 'right' | 'down' | 'up';
}

// Calculate position based on position string
function calculateBubblePosition(
  position: DialogueBubble['position'],
  imageWidth: number,
  imageHeight: number,
  bubbleWidth: number,
  bubbleHeight: number
): BubblePosition {
  const padding = 20;
  const positions: Record<string, BubblePosition> = {
    'top-left': { x: padding, y: padding, tailDirection: 'down' },
    'top-right': { x: imageWidth - bubbleWidth - padding, y: padding, tailDirection: 'down' },
    'top-center': { x: (imageWidth - bubbleWidth) / 2, y: padding, tailDirection: 'down' },
    'bottom-left': { x: padding, y: imageHeight - bubbleHeight - padding - 30, tailDirection: 'up' },
    'bottom-right': { x: imageWidth - bubbleWidth - padding, y: imageHeight - bubbleHeight - padding - 30, tailDirection: 'up' },
    'bottom-center': { x: (imageWidth - bubbleWidth) / 2, y: imageHeight - bubbleHeight - padding - 30, tailDirection: 'up' },
  };
  return positions[position] || positions['top-left'];
}

// Wrap text to fit within bubble
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate SVG for a speech bubble
function generateBubbleSvg(
  dialogue: DialogueBubble,
  imageWidth: number,
  imageHeight: number,
  index: number
): string {
  const fontSize = Math.min(24, Math.max(16, Math.floor(imageWidth / 40)));
  const maxCharsPerLine = Math.floor(imageWidth / (fontSize * 0.6) / 2.5);
  const lines = wrapText(dialogue.text, maxCharsPerLine);

  const lineHeight = fontSize * 1.3;
  const padding = 15;
  const bubbleWidth = Math.min(
    imageWidth * 0.4,
    Math.max(...lines.map(l => l.length)) * fontSize * 0.6 + padding * 2
  );
  const bubbleHeight = lines.length * lineHeight + padding * 2;

  const pos = calculateBubblePosition(
    dialogue.position,
    imageWidth,
    imageHeight,
    bubbleWidth,
    bubbleHeight
  );

  // Tail points
  const tailSize = 20;
  let tailPath = '';

  if (pos.tailDirection === 'down') {
    const tailX = pos.x + bubbleWidth * 0.3;
    tailPath = `M${tailX},${pos.y + bubbleHeight} L${tailX + tailSize},${pos.y + bubbleHeight + tailSize} L${tailX + tailSize * 2},${pos.y + bubbleHeight}`;
  } else if (pos.tailDirection === 'up') {
    const tailX = pos.x + bubbleWidth * 0.3;
    tailPath = `M${tailX},${pos.y} L${tailX + tailSize},${pos.y - tailSize} L${tailX + tailSize * 2},${pos.y}`;
  }

  // Bubble shape based on type
  let bubbleShape: string;
  const rx = dialogue.type === 'thought' ? bubbleWidth / 2 : 15;
  const ry = dialogue.type === 'thought' ? bubbleHeight / 2 : 15;

  if (dialogue.type === 'shout') {
    // Spiky edges for shouting
    const spikes = 8;
    const spikeDepth = 8;
    let points = '';
    for (let i = 0; i < spikes * 4; i++) {
      const angle = (i / (spikes * 4)) * Math.PI * 2;
      const radius = i % 2 === 0 ? 1 : 1 - spikeDepth / Math.min(bubbleWidth, bubbleHeight);
      const cx = pos.x + bubbleWidth / 2;
      const cy = pos.y + bubbleHeight / 2;
      const px = cx + Math.cos(angle) * (bubbleWidth / 2) * radius;
      const py = cy + Math.sin(angle) * (bubbleHeight / 2) * radius;
      points += `${px},${py} `;
    }
    bubbleShape = `<polygon points="${points.trim()}" fill="white" stroke="black" stroke-width="2"/>`;
  } else {
    bubbleShape = `<rect x="${pos.x}" y="${pos.y}" width="${bubbleWidth}" height="${bubbleHeight}" rx="${rx}" ry="${ry}" fill="white" stroke="black" stroke-width="2"/>`;
  }

  // Generate text lines
  const textLines = lines.map((line, i) => {
    const y = pos.y + padding + fontSize + i * lineHeight;
    return `<text x="${pos.x + bubbleWidth / 2}" y="${y}" font-family="Comic Sans MS, cursive, sans-serif" font-size="${fontSize}" text-anchor="middle" fill="black">${escapeXml(line)}</text>`;
  }).join('\n');

  // Speaker name (small, above bubble)
  const speakerText = dialogue.speaker ?
    `<text x="${pos.x + 10}" y="${pos.y - 5}" font-family="Arial, sans-serif" font-size="${fontSize * 0.7}" font-weight="bold" fill="#333">${escapeXml(dialogue.speaker)}</text>` : '';

  return `
    <!-- Bubble ${index + 1} -->
    ${bubbleShape}
    <path d="${tailPath}" fill="white" stroke="black" stroke-width="2"/>
    ${speakerText}
    ${textLines}
  `;
}

// Add thought bubble clouds for thought type
function generateThoughtCloudsSvg(
  dialogue: DialogueBubble,
  imageWidth: number,
  imageHeight: number,
  bubbleX: number,
  bubbleY: number,
  bubbleHeight: number
): string {
  if (dialogue.type !== 'thought') return '';

  const tailY = dialogue.position.startsWith('top') ? bubbleY + bubbleHeight : bubbleY;
  const direction = dialogue.position.startsWith('top') ? 1 : -1;

  return `
    <circle cx="${bubbleX + 30}" cy="${tailY + direction * 15}" r="8" fill="white" stroke="black" stroke-width="2"/>
    <circle cx="${bubbleX + 25}" cy="${tailY + direction * 30}" r="5" fill="white" stroke="black" stroke-width="2"/>
    <circle cx="${bubbleX + 20}" cy="${tailY + direction * 40}" r="3" fill="white" stroke="black" stroke-width="2"/>
  `;
}

/**
 * Add speech bubbles to an image
 * @param imageBase64 - Base64 encoded image (with or without data URI prefix)
 * @param dialogue - Array of dialogue bubbles to overlay
 * @returns Base64 encoded image with speech bubbles
 */
export async function addSpeechBubbles(
  imageBase64: string,
  dialogue: DialogueBubble[]
): Promise<string> {
  if (!dialogue || dialogue.length === 0) {
    return imageBase64;
  }

  // Remove data URI prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  // Get image metadata
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 768;

  // Generate SVG overlay with all bubbles
  const bubblesSvg = dialogue.map((d, i) => generateBubbleSvg(d, width, height, i)).join('\n');

  const svgOverlay = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="2" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g filter="url(#shadow)">
        ${bubblesSvg}
      </g>
    </svg>
  `;

  // Composite SVG onto image
  const result = await sharp(imageBuffer)
    .composite([
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  return result.toString('base64');
}

/**
 * Generate an image with speech bubbles from scratch (for testing)
 */
export async function createTestBubbleImage(
  width: number,
  height: number,
  dialogue: DialogueBubble[]
): Promise<Buffer> {
  // Create a simple gradient background
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#87CEEB;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#98FB98;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
    </svg>
  `;

  const background = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  const base64 = background.toString('base64');
  const withBubbles = await addSpeechBubbles(base64, dialogue);

  return Buffer.from(withBubbles, 'base64');
}

/**
 * Position dialogue bubbles automatically based on number of speakers
 */
export function autoPositionDialogue(
  dialogue: Array<{ speaker: string; text: string; type?: 'speech' | 'thought' | 'shout' }>
): DialogueBubble[] {
  const positions: DialogueBubble['position'][] = [
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
    'top-center',
    'bottom-center',
  ];

  return dialogue.map((d, i) => ({
    ...d,
    position: positions[i % positions.length],
  }));
}
