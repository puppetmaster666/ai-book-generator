export const STYLE_TEMPLATES = {
  literary: `Write in an elegant, literary style. Use:
- Rich, evocative prose with carefully chosen metaphors
- Deep introspection and character psychology
- Varied sentence structure with attention to rhythm
- Subtle symbolism and thematic resonance
- Show emotions through physical sensations and imagery
- Allow for quiet moments and contemplation`,

  commercial: `Write in a fast-paced commercial style. Use:
- Short, punchy sentences that drive momentum
- End chapters on cliffhangers or hooks
- Quick scene transitions
- Action-oriented language
- Tight dialogue with subtext
- Keep descriptions brief but impactful
- Every scene must advance the plot`,

  romance: `Write in an emotionally rich romance style. Use:
- Deep POV that captures feelings and sensations
- Dialogue that reveals character and builds tension
- Sensory details that enhance intimate moments
- Internal monologue showing emotional conflict
- Slow-burn tension building
- Balance between sweet and passionate moments`,

  ya: `Write in an accessible young adult style. Use:
- First person or close third person POV
- Authentic, relatable teen voice
- Fast pacing with short chapters
- Contemporary dialogue (but avoid dated slang)
- Focus on identity, belonging, and self-discovery
- Balance humor with emotional depth
- High stakes that feel personal`,

  horror: `Write in an atmospheric horror style. Use:
- Slow-building dread and unease
- Sensory details that create discomfort
- Unreliable perceptions and creeping doubt
- Isolation and vulnerability
- Brief moments of visceral terror punctuating longer tension
- Leave some things to imagination
- Use the environment as a character`,

  scifi: `Write in an immersive science fiction style. Use:
- World-building woven naturally into narrative
- Technical details that feel plausible
- Exploration of ideas through character experience
- Balance wonder with human drama
- Show technology's impact on society and individuals
- Make the unfamiliar feel tangible`,

  conversational: `Write in a friendly, conversational style. Use:
- Direct address to the reader
- Simple, clear language
- Relatable examples and analogies
- Occasional humor to maintain engagement
- Short paragraphs for easy reading
- Questions that prompt reflection
- Practical, actionable advice`,

  academic: `Write in a formal, authoritative style. Use:
- Clear, precise language
- Well-structured arguments with evidence
- Objective tone while remaining engaging
- Proper transitions between ideas
- Definitions for key terms
- Balanced presentation of perspectives
- Citations and references where appropriate`,
} as const;

export type StyleKey = keyof typeof STYLE_TEMPLATES;

export function getStyleTemplate(style: string): string {
  return STYLE_TEMPLATES[style as StyleKey] || STYLE_TEMPLATES.literary;
}
