/**
 * Text Overlay System (v2)
 * Professional comic book lettering: speech bubbles + narration boxes.
 * Uses Sharp + SVG with embedded comic fonts for consistent rendering.
 *
 * Design standards based on professional comic lettering:
 * - ALL CAPS dialogue (industry standard since the 1930s)
 * - Center-aligned text in elliptical bubbles
 * - Comic Neue Bold for dialogue, Georgia italic for narration
 * - Fully opaque white bubbles with 2.5px black stroke
 * - Classic yellow narration boxes
 */

import sharp from 'sharp';

// Use system fonts that are guaranteed to exist on Vercel/Linux
// Custom font embedding via base64 @font-face doesn't work with Sharp's librsvg

// ─── Types ───

interface SpeechBubble {
  speaker: string;
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  type?: 'speech' | 'thought' | 'shout';
}

interface NarrationBox {
  text: string;
  position: 'top' | 'bottom';
}

interface TextOverlayInput {
  imageBase64: string;
  dialogue?: SpeechBubble[];
  narration?: NarrationBox;
  width?: number;
  height?: number;
}

// ─── Constants ───

// Fonts guaranteed to exist on Linux/Vercel (DejaVu Sans is always present)
const DIALOGUE_FONT = "'DejaVu Sans', 'Liberation Sans', 'Arial', sans-serif";
const NARRATION_FONT = "'DejaVu Serif', 'Liberation Serif', 'Times New Roman', serif";
const SFX_FONT = "'DejaVu Sans', 'Impact', sans-serif";

const DIALOGUE_SIZE = 16;
const DIALOGUE_LINE_HEIGHT = 19;
const SPEAKER_SIZE = 11;
const NARRATION_SIZE = 14;
const NARRATION_LINE_HEIGHT = 18;

const BUBBLE_PADDING_X = 18;
const BUBBLE_PADDING_Y = 14;
const BUBBLE_STROKE = 2.5;
const BUBBLE_STROKE_COLOR = '#000000';
const BUBBLE_FILL = '#FFFFFF';
const BUBBLE_SHADOW_OFFSET = 2;
const BUBBLE_SHADOW_BLUR = 4;

const NARRATION_BG = '#FFF8DC'; // Classic comic yellow
const NARRATION_TEXT_COLOR = '#1A1A1A';
const NARRATION_STROKE = 1.5;
const NARRATION_STROKE_COLOR = '#C8B560';

// ─── Text Utilities ───

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Word wrap text into lines, trying to form a diamond shape
 * (shorter lines at top/bottom, longest in the middle).
 */
function wrapTextDiamond(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  if (words.length <= 3) return [text];

  // First pass: simple word wrap
  const rawLines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > maxCharsPerLine && currentLine) {
      rawLines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + ' ' + word).trim();
    }
  }
  if (currentLine) rawLines.push(currentLine.trim());

  // If 3+ lines, try to make a diamond shape by redistributing
  if (rawLines.length >= 3) {
    const allText = rawLines.join(' ');
    const totalChars = allText.length;
    const lineCount = rawLines.length;
    const redistLines: string[] = [];
    const redistWords = allText.split(' ');
    let wi = 0;

    for (let li = 0; li < lineCount; li++) {
      // Diamond: first and last lines shorter, middle lines longer
      const distFromCenter = Math.abs(li - (lineCount - 1) / 2) / ((lineCount - 1) / 2 || 1);
      const targetLen = Math.floor(maxCharsPerLine * (1 - distFromCenter * 0.25));
      let line = '';
      while (wi < redistWords.length) {
        if ((line + ' ' + redistWords[wi]).trim().length > targetLen && line) break;
        line = (line + ' ' + redistWords[wi]).trim();
        wi++;
      }
      if (line) redistLines.push(line);
    }
    // Remaining words go on the last line
    while (wi < redistWords.length) {
      const lastIdx = redistLines.length - 1;
      redistLines[lastIdx] = (redistLines[lastIdx] + ' ' + redistWords[wi]).trim();
      wi++;
    }
    return redistLines;
  }

  return rawLines;
}

// ─── Bubble Rendering ───

function renderSpeechBubble(
  bubble: SpeechBubble,
  imgWidth: number,
  imgHeight: number,
  index: number,
  totalBubbles: number
): string {
  const text = bubble.text.toUpperCase(); // ALL CAPS is comic standard
  const maxBubbleWidth = Math.min(320, Math.floor(imgWidth * 0.42));
  const charsPerLine = Math.floor((maxBubbleWidth - BUBBLE_PADDING_X * 2) / (DIALOGUE_SIZE * 0.65));

  const lines = wrapTextDiamond(text, charsPerLine);
  const textHeight = lines.length * DIALOGUE_LINE_HEIGHT;
  const speakerHeight = bubble.speaker ? SPEAKER_SIZE + 6 : 0;
  const bubbleContentHeight = textHeight + speakerHeight;
  const bubbleWidth = maxBubbleWidth;
  const bubbleHeight = bubbleContentHeight + BUBBLE_PADDING_Y * 2;
  const tailSize = 14;

  // Position
  let x = 0;
  let y = 0;
  const margin = 12;
  const verticalSpacing = bubbleHeight + tailSize + 8;

  switch (bubble.position) {
    case 'top-left':
      x = margin;
      y = margin + index * verticalSpacing;
      break;
    case 'top-right':
      x = imgWidth - bubbleWidth - margin;
      y = margin + index * verticalSpacing;
      break;
    case 'top-center':
      x = (imgWidth - bubbleWidth) / 2;
      y = margin + index * verticalSpacing;
      break;
    case 'bottom-left':
      x = margin;
      y = imgHeight - bubbleHeight - tailSize - margin - (totalBubbles - 1 - index) * verticalSpacing;
      break;
    case 'bottom-right':
      x = imgWidth - bubbleWidth - margin;
      y = imgHeight - bubbleHeight - tailSize - margin - (totalBubbles - 1 - index) * verticalSpacing;
      break;
    case 'bottom-center':
      x = (imgWidth - bubbleWidth) / 2;
      y = imgHeight - bubbleHeight - tailSize - margin - (totalBubbles - 1 - index) * verticalSpacing;
      break;
  }

  // Clamp
  x = Math.max(5, Math.min(x, imgWidth - bubbleWidth - 5));
  y = Math.max(5, Math.min(y, imgHeight - bubbleHeight - tailSize - 5));

  const cx = x + bubbleWidth / 2;
  const cy = y + bubbleHeight / 2;
  const rx = bubbleWidth / 2;
  const ry = bubbleHeight / 2;

  // Bubble shape
  let bubbleShape: string;
  if (bubble.type === 'thought') {
    // Cloud shape using scalloped ellipse
    bubbleShape = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${BUBBLE_FILL}" stroke="${BUBBLE_STROKE_COLOR}" stroke-width="${BUBBLE_STROKE}" stroke-dasharray="8,4"/>`;
  } else if (bubble.type === 'shout') {
    // Jagged starburst
    bubbleShape = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${BUBBLE_FILL}" stroke="${BUBBLE_STROKE_COLOR}" stroke-width="3.5"/>`;
  } else {
    // Standard speech: smooth ellipse with drop shadow
    bubbleShape = `
      <ellipse cx="${cx + BUBBLE_SHADOW_OFFSET}" cy="${cy + BUBBLE_SHADOW_OFFSET}" rx="${rx}" ry="${ry}" fill="rgba(0,0,0,0.12)" filter="url(#shadow)"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${BUBBLE_FILL}" stroke="${BUBBLE_STROKE_COLOR}" stroke-width="${BUBBLE_STROKE}"/>
    `;
  }

  // Tail: curved bezier path pointing down
  const tailBaseX = bubble.position.includes('left') ? x + bubbleWidth * 0.3 : bubble.position.includes('right') ? x + bubbleWidth * 0.7 : cx;
  const tailBaseY = y + bubbleHeight - 2;
  const tailTipX = tailBaseX + (bubble.position.includes('left') ? -12 : 12);
  const tailTipY = tailBaseY + tailSize;

  let tailSvg: string;
  if (bubble.type === 'thought') {
    // Thought bubble tail: small circles
    tailSvg = `
      <circle cx="${tailTipX - 4}" cy="${tailBaseY + 6}" r="4" fill="${BUBBLE_FILL}" stroke="${BUBBLE_STROKE_COLOR}" stroke-width="1.5"/>
      <circle cx="${tailTipX}" cy="${tailTipY}" r="2.5" fill="${BUBBLE_FILL}" stroke="${BUBBLE_STROKE_COLOR}" stroke-width="1.5"/>
    `;
  } else {
    // Curved tail
    tailSvg = `<path d="M ${tailBaseX - 8} ${tailBaseY} Q ${tailBaseX} ${tailBaseY + tailSize * 0.6} ${tailTipX} ${tailTipY} Q ${tailBaseX + 4} ${tailBaseY + tailSize * 0.4} ${tailBaseX + 8} ${tailBaseY}" fill="${BUBBLE_FILL}" stroke="${BUBBLE_STROKE_COLOR}" stroke-width="${BUBBLE_STROKE}"/>`;
  }

  // Speaker name (small, bold, above dialogue)
  const speakerSvg = bubble.speaker
    ? `<text x="${cx}" y="${y + BUBBLE_PADDING_Y + SPEAKER_SIZE}" font-family="${DIALOGUE_FONT}" font-size="${SPEAKER_SIZE}" font-weight="bold" fill="#666" text-anchor="middle" letter-spacing="1.5">${escapeXml(bubble.speaker.toUpperCase())}</text>`
    : '';

  // Dialogue text (center-aligned, ALL CAPS)
  const textStartY = y + BUBBLE_PADDING_Y + speakerHeight + DIALOGUE_SIZE;
  const textSvg = lines.map((line, i) =>
    `<text x="${cx}" y="${textStartY + i * DIALOGUE_LINE_HEIGHT}" font-family="${DIALOGUE_FONT}" font-size="${DIALOGUE_SIZE}" font-weight="bold" fill="#000" text-anchor="middle" letter-spacing="0.5">${escapeXml(line)}</text>`
  ).join('\n');

  return `
    ${bubbleShape}
    ${tailSvg}
    ${speakerSvg}
    ${textSvg}
  `;
}

// ─── Narration Rendering ───

function renderNarrationBox(
  narration: NarrationBox,
  imgWidth: number,
  imgHeight: number
): string {
  const text = narration.text;
  const boxWidth = imgWidth - 24;
  const charsPerLine = Math.floor((boxWidth - 20) / (NARRATION_SIZE * 0.55));

  // Word wrap
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > charsPerLine && currentLine) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + ' ' + word).trim();
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  const textHeight = lines.length * NARRATION_LINE_HEIGHT;
  const boxHeight = textHeight + 20;
  const x = 12;
  const y = narration.position === 'top' ? 8 : imgHeight - boxHeight - 8;

  // Classic yellow narration box with slight border
  const boxSvg = `<rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" rx="3" ry="3" fill="${NARRATION_BG}" stroke="${NARRATION_STROKE_COLOR}" stroke-width="${NARRATION_STROKE}"/>`;

  // Left-aligned italic text (narration uses different alignment than dialogue)
  const textSvg = lines.map((line, i) =>
    `<text x="${x + 12}" y="${y + 10 + NARRATION_SIZE + i * NARRATION_LINE_HEIGHT}" font-family="${NARRATION_FONT}" font-size="${NARRATION_SIZE}" font-style="italic" fill="${NARRATION_TEXT_COLOR}">${escapeXml(line)}</text>`
  ).join('\n');

  return `${boxSvg}\n${textSvg}`;
}

// ─── Main Composite Function ───

/**
 * Composite professional comic lettering onto a panel image.
 * Returns the final image as a base64 data URL.
 */
export async function overlayTextOnImage(input: TextOverlayInput): Promise<string> {
  const imgBuffer = Buffer.from(
    input.imageBase64.includes(',') ? input.imageBase64.split(',')[1] : input.imageBase64,
    'base64'
  );

  const metadata = await sharp(imgBuffer).metadata();
  const imgWidth = input.width || metadata.width || 832;
  const imgHeight = input.height || metadata.height || 1216;

  const svgParts: string[] = [];

  // Narration box (rendered first, behind bubbles)
  if (input.narration && input.narration.text.trim()) {
    svgParts.push(renderNarrationBox(input.narration, imgWidth, imgHeight));
  }

  // Speech bubbles
  if (input.dialogue && input.dialogue.length > 0) {
    input.dialogue.forEach((bubble, idx) => {
      svgParts.push(renderSpeechBubble(bubble, imgWidth, imgHeight, idx, input.dialogue!.length));
    });
  }

  if (svgParts.length === 0) {
    return `data:image/png;base64,${imgBuffer.toString('base64')}`;
  }

  // Build the SVG with embedded fonts and a shadow filter
  const svgOverlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${imgHeight}">
  <defs>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${BUBBLE_SHADOW_BLUR}"/>
      <feOffset dx="${BUBBLE_SHADOW_OFFSET}" dy="${BUBBLE_SHADOW_OFFSET}"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.15"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  ${svgParts.join('\n')}
</svg>`;

  const result = await sharp(imgBuffer)
    .resize(imgWidth, imgHeight, { fit: 'cover' })
    .composite([{
      input: Buffer.from(svgOverlay),
      top: 0,
      left: 0,
    }])
    .png()
    .toBuffer();

  return `data:image/png;base64,${result.toString('base64')}`;
}

/**
 * Map dialogue position strings from the outline to overlay positions.
 */
export function mapDialoguePosition(
  position: string,
  index: number,
  total: number
): SpeechBubble['position'] {
  const pos = (position || '').toLowerCase();
  if (pos.includes('top') && pos.includes('left')) return 'top-left';
  if (pos.includes('top') && pos.includes('right')) return 'top-right';
  if (pos.includes('top')) return 'top-center';
  if (pos.includes('bottom') && pos.includes('left')) return 'bottom-left';
  if (pos.includes('bottom') && pos.includes('right')) return 'bottom-right';
  if (pos.includes('bottom')) return 'bottom-center';

  // Default: alternate top-left and top-right
  if (total <= 2) {
    return index === 0 ? 'top-left' : 'top-right';
  }
  const positions: SpeechBubble['position'][] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  return positions[index % positions.length];
}
