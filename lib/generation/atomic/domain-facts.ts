/**
 * Domain Fact Sheets
 *
 * Procedural realism enforcement for genre-specific domains.
 * Provides accurate facts for: police, murder, affairs, medical, legal, military, etc.
 *
 * This prevents:
 * - Hollywood-ized inaccurate procedures
 * - Plot-breaking technical errors
 * - Immersion-killing mistakes
 *
 * Each domain has:
 * - Must-know facts
 * - Common mistakes to avoid
 * - Realistic timelines
 * - Validation rules
 */

export type DomainType =
  | 'police'
  | 'murder_investigation'
  | 'affair'
  | 'medical'
  | 'legal'
  | 'military'
  | 'forensics'
  | 'financial_crime'
  | 'espionage'
  | 'journalism';

export interface DomainFact {
  id: string;
  domain: DomainType;
  category: string;
  fact: string;
  source?: string;
  importance: 'critical' | 'important' | 'nice_to_know';
  commonMistake?: string;        // What writers often get wrong
  correctApproach?: string;       // How to do it right
}

export interface DomainTimeline {
  domain: DomainType;
  process: string;
  steps: { step: string; typicalDuration: string; notes?: string }[];
}

export interface DomainValidationRule {
  domain: DomainType;
  rule: string;
  pattern: RegExp;              // Pattern that triggers validation
  violation: string;            // What's wrong
  correction: string;           // How to fix it
}

// ============================================
// POLICE DOMAIN
// ============================================

export const POLICE_FACTS: DomainFact[] = [
  {
    id: 'police_1',
    domain: 'police',
    category: 'Miranda Rights',
    fact: 'Miranda warnings are only required before custodial interrogation. Officers can question someone without reading rights if they\'re not under arrest.',
    importance: 'critical',
    commonMistake: 'Having cops read Miranda at the moment of arrest or before any questioning',
    correctApproach: 'Miranda is read only when: (1) person is in custody, AND (2) interrogation is about to begin',
  },
  {
    id: 'police_2',
    domain: 'police',
    category: 'Arrests',
    fact: 'Police need probable cause to arrest, not proof beyond reasonable doubt. That\'s for trial.',
    importance: 'critical',
    commonMistake: 'Having police need "proof" before arresting',
    correctApproach: 'Probable cause = reasonable belief a crime was committed and this person did it',
  },
  {
    id: 'police_3',
    domain: 'police',
    category: 'Search & Seizure',
    fact: 'Warrants are required for most searches, but many exceptions exist: consent, plain view, exigent circumstances, search incident to arrest, automobile exception.',
    importance: 'important',
    commonMistake: 'Always having cops get a warrant or always not getting one',
    correctApproach: 'Know the exceptions. Consent is most common: "Mind if I look around?"',
  },
  {
    id: 'police_4',
    domain: 'police',
    category: 'Jurisdiction',
    fact: 'Police jurisdiction is limited to their area. FBI handles federal crimes and interstate matters. Local cops can\'t just investigate anywhere.',
    importance: 'important',
    commonMistake: 'Having small-town cops investigate cases in other cities',
    correctApproach: 'Jurisdictional handoffs, task forces, or requesting assistance',
  },
  {
    id: 'police_5',
    domain: 'police',
    category: 'Detectives',
    fact: 'Detectives don\'t patrol. They investigate after patrol officers respond. Most wear plain clothes, not uniforms.',
    importance: 'nice_to_know',
  },
  {
    id: 'police_6',
    domain: 'police',
    category: 'Paperwork',
    fact: 'Police spend enormous time on paperwork. Every arrest, stop, and significant event requires detailed reports.',
    importance: 'important',
    commonMistake: 'Police just arrest and move on',
    correctApproach: 'Show the bureaucratic reality: reports, statements, chain of custody',
  },
];

// ============================================
// MURDER INVESTIGATION DOMAIN
// ============================================

export const MURDER_INVESTIGATION_FACTS: DomainFact[] = [
  {
    id: 'murder_1',
    domain: 'murder_investigation',
    category: 'First 48',
    fact: 'The first 48 hours are critical. After that, solvability drops dramatically. Witnesses forget, evidence degrades.',
    importance: 'critical',
  },
  {
    id: 'murder_2',
    domain: 'murder_investigation',
    category: 'Crime Scene',
    fact: 'Crime scenes are secured with tape, logged for everyone entering/exiting. First responding officer documents scene before anyone touches anything.',
    importance: 'critical',
    commonMistake: 'Detectives touching things, walking around freely',
    correctApproach: 'Designated pathways, booties, gloves, documented scene',
  },
  {
    id: 'murder_3',
    domain: 'murder_investigation',
    category: 'Autopsy',
    fact: 'Medical Examiner determines cause of death and manner (homicide, suicide, accident, natural, undetermined). Time of death is a range, not precise.',
    importance: 'critical',
    commonMistake: 'ME saying "died at exactly 11:47 PM"',
    correctApproach: '"Time of death estimated between 10 PM and 2 AM based on liver temp and rigor"',
  },
  {
    id: 'murder_4',
    domain: 'murder_investigation',
    category: 'Interviews',
    fact: 'Family/close contacts are interviewed first. Spouse is statistically most likely killer in domestic homicides.',
    importance: 'important',
  },
  {
    id: 'murder_5',
    domain: 'murder_investigation',
    category: 'Evidence',
    fact: 'DNA results take weeks, not hours. Rush processing exists but is expensive and reserved for urgent cases.',
    importance: 'critical',
    commonMistake: 'DNA results in an hour',
    correctApproach: 'Standard DNA: 2-4 weeks. Rush: 1-2 days minimum, requires approval',
  },
  {
    id: 'murder_6',
    domain: 'murder_investigation',
    category: 'Cold Cases',
    fact: 'After 72 hours with no leads, case often goes cold. Cold case units exist but have limited resources.',
    importance: 'important',
  },
];

// ============================================
// AFFAIR DOMAIN
// ============================================

export const AFFAIR_FACTS: DomainFact[] = [
  {
    id: 'affair_1',
    domain: 'affair',
    category: 'Discovery Patterns',
    fact: 'Most affairs are discovered through phone/text evidence, not catching people in the act.',
    importance: 'important',
    commonMistake: 'Dramatic walk-in discovery',
    correctApproach: 'Text message left open, unfamiliar charge on credit card, phone behavior changes',
  },
  {
    id: 'affair_2',
    domain: 'affair',
    category: 'Behavioral Signs',
    fact: 'Changes in routine, new attention to appearance, phone secrecy, unexplained absences, emotional distance before physical intimacy elsewhere.',
    importance: 'important',
  },
  {
    id: 'affair_3',
    domain: 'affair',
    category: 'Psychology',
    fact: 'Affairs often start as emotional connections that escalate. The "just friends" phase is real and dangerous.',
    importance: 'critical',
  },
  {
    id: 'affair_4',
    domain: 'affair',
    category: 'Confrontation',
    fact: 'Initial confrontation usually involves denial, then trickle truth (admitting only what\'s proven), then fuller confession over time.',
    importance: 'important',
    commonMistake: 'Immediate full confession',
    correctApproach: 'Denial → Partial admission → Trickle truth → Eventually full story (maybe)',
  },
  {
    id: 'affair_5',
    domain: 'affair',
    category: 'Technology',
    fact: 'Burner phones, secondary email accounts, apps that hide within other apps, timing calls during commute.',
    importance: 'nice_to_know',
  },
];

// ============================================
// MEDICAL DOMAIN
// ============================================

export const MEDICAL_FACTS: DomainFact[] = [
  {
    id: 'medical_1',
    domain: 'medical',
    category: 'Coma',
    fact: 'Coma patients don\'t suddenly wake up alert. Emergence is gradual over days/weeks. They don\'t remember what was said to them.',
    importance: 'critical',
    commonMistake: 'Character wakes from coma, immediately talks',
    correctApproach: 'Confusion, disorientation, gradual return of function over weeks',
  },
  {
    id: 'medical_2',
    domain: 'medical',
    category: 'CPR',
    fact: 'CPR is brutal. Ribs often break. Success rate outside hospital is ~10%. TV shows ~75% survival.',
    importance: 'important',
    commonMistake: 'Quick CPR, person sits up fine',
    correctApproach: 'If CPR works, person is usually intubated, hospitalized, possible rib fractures',
  },
  {
    id: 'medical_3',
    domain: 'medical',
    category: 'Gunshots',
    fact: 'Gunshot wounds don\'t throw people backward. Small entry, often larger exit. Shock, blood loss, and organ damage are the killers.',
    importance: 'important',
  },
  {
    id: 'medical_4',
    domain: 'medical',
    category: 'Recovery Times',
    fact: 'Major surgery requires weeks of recovery. Characters can\'t get stabbed and fight the next day.',
    importance: 'critical',
    commonMistake: 'Hero heals overnight',
    correctApproach: 'Show recovery time, physical therapy, pain, limited mobility',
  },
  {
    id: 'medical_5',
    domain: 'medical',
    category: 'Hospitals',
    fact: 'Doctors don\'t do everything. Nurses provide most care. Attendings supervise residents. Surgeons don\'t hang out in ER.',
    importance: 'important',
  },
  {
    id: 'medical_6',
    domain: 'medical',
    category: 'Sedation',
    fact: 'Knocking someone out with chloroform or hitting them on the head is dangerous. Chloroform takes minutes, not seconds. Head trauma causes brain damage.',
    importance: 'critical',
    commonMistake: 'Quick knock-out with no consequences',
    correctApproach: 'Use sedative drugs (takes time), or accept the violence of physical incapacitation',
  },
];

// ============================================
// LEGAL DOMAIN
// ============================================

export const LEGAL_FACTS: DomainFact[] = [
  {
    id: 'legal_1',
    domain: 'legal',
    category: 'Trials',
    fact: 'Trials take months to years to reach. Arraignment → Discovery → Motions → Trial. Most cases plea out.',
    importance: 'critical',
    commonMistake: 'Trial starts next week after arrest',
    correctApproach: 'Months of pre-trial proceedings, bail hearings, discovery',
  },
  {
    id: 'legal_2',
    domain: 'legal',
    category: 'Evidence',
    fact: 'Surprise evidence in court is rare. Discovery requires sharing evidence beforehand. "Gotcha" moments are TV fiction.',
    importance: 'critical',
    commonMistake: 'Last-minute surprise witness or evidence',
    correctApproach: 'Evidence shared in discovery. Surprises get cases thrown out.',
  },
  {
    id: 'legal_3',
    domain: 'legal',
    category: 'Objections',
    fact: 'Real objections: relevance, hearsay, leading, speculation, foundation, argumentative. Lawyers don\'t just shout "Objection!"',
    importance: 'important',
  },
  {
    id: 'legal_4',
    domain: 'legal',
    category: 'Confessions',
    fact: 'Confessions obtained through coercion are inadmissible. Defense attorneys always challenge confession circumstances.',
    importance: 'important',
  },
  {
    id: 'legal_5',
    domain: 'legal',
    category: 'Double Jeopardy',
    fact: 'Double jeopardy only applies after acquittal by jury. Mistrial or dismissal doesn\'t prevent retrial. Federal and state are separate sovereigns.',
    importance: 'important',
  },
];

// ============================================
// FORENSICS DOMAIN
// ============================================

export const FORENSICS_FACTS: DomainFact[] = [
  {
    id: 'forensics_1',
    domain: 'forensics',
    category: 'DNA',
    fact: 'DNA doesn\'t always identify a person. It shows probability. "1 in 7 billion" is compelling. "1 in 100" is not.',
    importance: 'important',
  },
  {
    id: 'forensics_2',
    domain: 'forensics',
    category: 'Fingerprints',
    fact: 'Most fingerprints at crime scenes are partials. Full clear prints are rare. Many surfaces don\'t hold prints well.',
    importance: 'important',
    commonMistake: 'Perfect prints everywhere',
    correctApproach: 'Partial prints, smudged prints, prints that can\'t be matched',
  },
  {
    id: 'forensics_3',
    domain: 'forensics',
    category: 'Ballistics',
    fact: 'Ballistics can match a bullet to a gun but needs the gun for comparison. Shell casings have firing pin marks.',
    importance: 'important',
  },
  {
    id: 'forensics_4',
    domain: 'forensics',
    category: 'Blood Spatter',
    fact: 'Blood spatter analysis shows direction and force. Cast-off vs impact vs arterial spray patterns differ.',
    importance: 'nice_to_know',
  },
  {
    id: 'forensics_5',
    domain: 'forensics',
    category: 'Time of Death',
    fact: 'Body temp drops ~1.5°F per hour. Rigor starts 2-4 hours, peaks at 12, fades by 36. Lividity fixes after 6-8 hours.',
    importance: 'important',
    commonMistake: 'Precise time of death',
    correctApproach: 'Range based on rigor, lividity, temp, stomach contents',
  },
];

// ============================================
// TIMELINES
// ============================================

export const DOMAIN_TIMELINES: DomainTimeline[] = [
  {
    domain: 'murder_investigation',
    process: 'Homicide Investigation',
    steps: [
      { step: 'Scene secured', typicalDuration: '30 minutes', notes: 'First responder secures, calls detectives' },
      { step: 'Detectives arrive', typicalDuration: '1-2 hours' },
      { step: 'Scene processed', typicalDuration: '4-12 hours', notes: 'Photos, evidence collection, canvassing' },
      { step: 'Autopsy', typicalDuration: '1-3 days' },
      { step: 'Initial interviews', typicalDuration: '24-72 hours' },
      { step: 'Lab results (basic)', typicalDuration: '1-2 weeks' },
      { step: 'DNA results', typicalDuration: '2-6 weeks', notes: 'Rush available but expensive' },
    ],
  },
  {
    domain: 'legal',
    process: 'Criminal Trial Timeline',
    steps: [
      { step: 'Arrest', typicalDuration: 'Day 0' },
      { step: 'Initial appearance', typicalDuration: '24-48 hours' },
      { step: 'Preliminary hearing', typicalDuration: '2-4 weeks' },
      { step: 'Grand jury/Indictment', typicalDuration: '1-3 months' },
      { step: 'Arraignment', typicalDuration: '1 week after indictment' },
      { step: 'Discovery', typicalDuration: '3-6 months' },
      { step: 'Pre-trial motions', typicalDuration: '1-3 months' },
      { step: 'Trial', typicalDuration: '6-18 months after arrest' },
    ],
  },
  {
    domain: 'medical',
    process: 'Gunshot Wound Recovery',
    steps: [
      { step: 'ER trauma', typicalDuration: '1-6 hours', notes: 'Stabilization, surgery if needed' },
      { step: 'ICU', typicalDuration: '1-7 days', notes: 'If serious injury' },
      { step: 'Hospital stay', typicalDuration: '3-14 days' },
      { step: 'Initial recovery', typicalDuration: '2-6 weeks', notes: 'Limited mobility, pain' },
      { step: 'Physical therapy', typicalDuration: '2-6 months', notes: 'If muscle/bone damage' },
      { step: 'Full recovery', typicalDuration: '6-12 months', notes: 'If possible at all' },
    ],
  },
];

// ============================================
// VALIDATION RULES
// ============================================

export const DOMAIN_VALIDATION_RULES: DomainValidationRule[] = [
  // Police
  {
    domain: 'police',
    rule: 'Miranda must be read only during custodial interrogation',
    pattern: /\b(read|recite|gave) (him|her|them) (his|her|their) (Miranda|rights)\b.*\b(arrest|cuff|handcuff)/i,
    violation: 'Miranda is being read at arrest, not at interrogation',
    correction: 'Read Miranda before questioning begins, not at moment of arrest',
  },
  // Murder
  {
    domain: 'murder_investigation',
    rule: 'DNA results take weeks',
    pattern: /DNA (results|analysis|report).*?(hour|same day|next day|tomorrow)/i,
    violation: 'DNA results returning too quickly',
    correction: 'DNA takes 2-6 weeks. Rush is 24-48 hours minimum with special approval.',
  },
  // Medical
  {
    domain: 'medical',
    rule: 'Coma awakening is gradual',
    pattern: /woke from (the|a|his|her) coma.*?(immediately|suddenly|sat up|eyes opened)/i,
    violation: 'Unrealistic coma awakening',
    correction: 'Coma emergence is gradual over days with confusion, disorientation',
  },
  {
    domain: 'medical',
    rule: 'Recovery from injury takes time',
    pattern: /\b(stabbed|shot|wounded)\b.*?\b(next day|hours later|that evening)\b.*?\b(ran|fought|chased|running)\b/i,
    violation: 'Character recovering too quickly from serious injury',
    correction: 'Serious injuries require days to weeks of recovery',
  },
  // Legal
  {
    domain: 'legal',
    rule: 'No surprise evidence in trials',
    pattern: /\b(surprise|shock|unexpected)\b.*?\b(evidence|witness|document)\b.*?\b(court|trial|jury)\b/i,
    violation: 'Surprise evidence presented in trial',
    correction: 'Discovery rules require sharing evidence. Surprises get cases thrown out.',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all facts for a domain
 */
export function getDomainFacts(domain: DomainType): DomainFact[] {
  const allFacts: Record<DomainType, DomainFact[]> = {
    police: POLICE_FACTS,
    murder_investigation: MURDER_INVESTIGATION_FACTS,
    affair: AFFAIR_FACTS,
    medical: MEDICAL_FACTS,
    legal: LEGAL_FACTS,
    forensics: FORENSICS_FACTS,
    military: [],  // Can be expanded
    financial_crime: [],
    espionage: [],
    journalism: [],
  };

  return allFacts[domain] || [];
}

/**
 * Get timeline for a domain process
 */
export function getDomainTimeline(domain: DomainType, process?: string): DomainTimeline | undefined {
  return DOMAIN_TIMELINES.find(t =>
    t.domain === domain && (!process || t.process === process)
  );
}

/**
 * Validate content against domain rules
 */
export function validateDomainAccuracy(
  content: string,
  domains: DomainType[]
): { valid: boolean; violations: { rule: string; violation: string; correction: string }[] } {
  const violations: { rule: string; violation: string; correction: string }[] = [];

  for (const domain of domains) {
    const rules = DOMAIN_VALIDATION_RULES.filter(r => r.domain === domain);

    for (const rule of rules) {
      if (rule.pattern.test(content)) {
        violations.push({
          rule: rule.rule,
          violation: rule.violation,
          correction: rule.correction,
        });
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Generate domain fact sheet for prompt injection
 */
export function generateDomainFactSheet(domains: DomainType[]): string {
  if (domains.length === 0) return '';

  let sheet = '\n=== DOMAIN ACCURACY REQUIREMENTS ===\n';
  sheet += 'These facts are MANDATORY for realism. Violations will be flagged.\n\n';

  for (const domain of domains) {
    const facts = getDomainFacts(domain);
    if (facts.length === 0) continue;

    sheet += `${domain.toUpperCase().replace('_', ' ')}:\n`;

    // Critical facts first
    const critical = facts.filter(f => f.importance === 'critical');
    for (const fact of critical) {
      sheet += `  [CRITICAL] ${fact.fact}\n`;
      if (fact.commonMistake) {
        sheet += `    WRONG: ${fact.commonMistake}\n`;
        sheet += `    RIGHT: ${fact.correctApproach}\n`;
      }
    }

    // Important facts
    const important = facts.filter(f => f.importance === 'important');
    for (const fact of important.slice(0, 3)) {
      sheet += `  [IMPORTANT] ${fact.fact}\n`;
    }

    // Timeline if relevant
    const timeline = getDomainTimeline(domain);
    if (timeline) {
      sheet += `\n  TYPICAL TIMELINE - ${timeline.process}:\n`;
      for (const step of timeline.steps.slice(0, 5)) {
        sheet += `    ${step.step}: ${step.typicalDuration}\n`;
      }
    }

    sheet += '\n';
  }

  return sheet;
}

/**
 * Get common mistakes for a domain
 */
export function getCommonMistakes(domain: DomainType): { mistake: string; correction: string }[] {
  const facts = getDomainFacts(domain);
  return facts
    .filter(f => f.commonMistake && f.correctApproach)
    .map(f => ({
      mistake: f.commonMistake!,
      correction: f.correctApproach!,
    }));
}

/**
 * Check if a specific fact is being violated
 */
export function checkFactViolation(
  content: string,
  factId: string
): { violated: boolean; details?: string } {
  const allFacts = [
    ...POLICE_FACTS,
    ...MURDER_INVESTIGATION_FACTS,
    ...AFFAIR_FACTS,
    ...MEDICAL_FACTS,
    ...LEGAL_FACTS,
    ...FORENSICS_FACTS,
  ];

  const fact = allFacts.find(f => f.id === factId);
  if (!fact) return { violated: false };

  // Check corresponding validation rule if exists
  const rule = DOMAIN_VALIDATION_RULES.find(r =>
    r.domain === fact.domain && r.rule.includes(fact.category)
  );

  if (rule && rule.pattern.test(content)) {
    return {
      violated: true,
      details: `${rule.violation}. ${rule.correction}`,
    };
  }

  return { violated: false };
}
