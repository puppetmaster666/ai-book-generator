/**
 * Text Overlay System
 * Composites speech bubbles and narration boxes onto comic panel images.
 * Uses Sharp for image manipulation (already a project dependency).
 */

import sharp from 'sharp';

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

/**
 * Render an SVG speech bubble with text.
 */
function renderSpeechBubble(
  bubble: SpeechBubble,
  imgWidth: number,
  imgHeight: number,
  index: number,
  totalBubbles: number
): string {
  const maxBubbleWidth = Math.min(280, Math.floor(imgWidth * 0.4));
  const fontSize = 14;
  const lineHeight = 18;
  const padding = 12;
  const tailSize = 10;

  // Word wrap the text
  const words = bubble.text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  const charsPerLine = Math.floor((maxBubbleWidth - padding * 2) / (fontSize * 0.6));

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > charsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + ' ' + word).trim();
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  const textHeight = lines.length * lineHeight;
  const bubbleWidth = maxBubbleWidth;
  const bubbleHeight = textHeight + padding * 2;

  // Position based on bubble.position
  let x = 0;
  let y = 0;
  const margin = 15;

  switch (bubble.position) {
    case 'top-left':
      x = margin;
      y = margin + index * (bubbleHeight + tailSize + 10);
      break;
    case 'top-right':
      x = imgWidth - bubbleWidth - margin;
      y = margin + index * (bubbleHeight + tailSize + 10);
      break;
    case 'top-center':
      x = (imgWidth - bubbleWidth) / 2;
      y = margin + index * (bubbleHeight + tailSize + 10);
      break;
    case 'bottom-left':
      x = margin;
      y = imgHeight - bubbleHeight - tailSize - margin - (totalBubbles - 1 - index) * (bubbleHeight + tailSize + 10);
      break;
    case 'bottom-right':
      x = imgWidth - bubbleWidth - margin;
      y = imgHeight - bubbleHeight - tailSize - margin - (totalBubbles - 1 - index) * (bubbleHeight + tailSize + 10);
      break;
    case 'bottom-center':
      x = (imgWidth - bubbleWidth) / 2;
      y = imgHeight - bubbleHeight - tailSize - margin - (totalBubbles - 1 - index) * (bubbleHeight + tailSize + 10);
      break;
  }

  // Clamp position
  x = Math.max(5, Math.min(x, imgWidth - bubbleWidth - 5));
  y = Math.max(5, Math.min(y, imgHeight - bubbleHeight - tailSize - 5));

  const borderRadius = bubble.type === 'thought' ? bubbleHeight / 2 : 12;
  const borderStyle = bubble.type === 'shout' ? 'stroke-width="3"' : 'stroke-width="1.5"';

  // Speaker name
  const speakerLine = bubble.speaker
    ? `<text x="${x + padding}" y="${y + padding + fontSize - 2}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize - 1}" font-weight="bold" fill="#333">${escapeXml(bubble.speaker.toUpperCase())}</text>`
    : '';
  const speakerOffset = bubble.speaker ? lineHeight : 0;

  // Text lines
  const textLines = lines.map((line, i) =>
    `<text x="${x + padding}" y="${y + padding + speakerOffset + fontSize + i * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" fill="#111">${escapeXml(line)}</text>`
  ).join('\n');

  // Tail (pointer)
  const tailX = bubble.position.includes('left') ? x + 40 : bubble.position.includes('right') ? x + bubbleWidth - 40 : x + bubbleWidth / 2;
  const tailY = y + bubbleHeight;
  const tail = `<polygon points="${tailX - 8},${tailY} ${tailX + 8},${tailY} ${tailX + (bubble.position.includes('left') ? -5 : 5)},${tailY + tailSize}" fill="white" stroke="#333" stroke-width="1.5"/>`;

  return `
    <rect x="${x}" y="${y}" width="${bubbleWidth}" height="${bubbleHeight + speakerOffset}" rx="${borderRadius}" ry="${borderRadius}" fill="white" fill-opacity="0.95" stroke="#333" ${borderStyle}/>
    ${speakerLine}
    ${textLines}
    ${tail}
  `;
}

/**
 * Render an SVG narration box.
 */
function renderNarrationBox(
  narration: NarrationBox,
  imgWidth: number,
  imgHeight: number
): string {
  const fontSize = 13;
  const lineHeight = 17;
  const padding = 10;
  const boxWidth = imgWidth - 20;

  // Word wrap
  const words = narration.text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  const charsPerLine = Math.floor((boxWidth - padding * 2) / (fontSize * 0.58));

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length > charsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + ' ' + word).trim();
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  const textHeight = lines.length * lineHeight;
  const boxHeight = textHeight + padding * 2;
  const x = 10;
  const y = narration.position === 'top' ? 8 : imgHeight - boxHeight - 8;

  const textLines = lines.map((line, i) =>
    `<text x="${x + padding}" y="${y + padding + fontSize + i * lineHeight}" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-style="italic" fill="#f5f5f0">${escapeXml(line)}</text>`
  ).join('\n');

  return `
    <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" rx="4" ry="4" fill="#1a1a1a" fill-opacity="0.85"/>
    ${textLines}
  `;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Composite text overlays (speech bubbles + narration) onto a comic panel image.
 * Returns the final image as a base64 data URL.
 */
export async function overlayTextOnImage(input: TextOverlayInput): Promise<string> {
  // Decode the input image
  const imgBuffer = Buffer.from(
    input.imageBase64.includes(',') ? input.imageBase64.split(',')[1] : input.imageBase64,
    'base64'
  );

  const metadata = await sharp(imgBuffer).metadata();
  const imgWidth = input.width || metadata.width || 832;
  const imgHeight = input.height || metadata.height || 1216;

  // Build SVG overlay
  const svgParts: string[] = [];

  // Add narration box
  if (input.narration && input.narration.text.trim()) {
    svgParts.push(renderNarrationBox(input.narration, imgWidth, imgHeight));
  }

  // Add speech bubbles
  if (input.dialogue && input.dialogue.length > 0) {
    input.dialogue.forEach((bubble, idx) => {
      svgParts.push(renderSpeechBubble(bubble, imgWidth, imgHeight, idx, input.dialogue!.length));
    });
  }

  // If no text to overlay, return the original image
  if (svgParts.length === 0) {
    return `data:image/png;base64,${imgBuffer.toString('base64')}`;
  }

  const svgOverlay = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${imgHeight}">
      ${svgParts.join('\n')}
    </svg>
  `;

  // Composite the SVG overlay onto the image
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

  // Default: alternate top-left and top-right based on index
  if (total <= 2) {
    return index === 0 ? 'top-left' : 'top-right';
  }
  const positions: SpeechBubble['position'][] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  return positions[index % positions.length];
}
