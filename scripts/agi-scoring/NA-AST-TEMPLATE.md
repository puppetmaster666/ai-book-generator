# Narrative Architect AGI Scoring Template (NA-AST)

## Version: 2.0
## Last Updated: 2025-01-07

---

## Philosophy

This template moves beyond subjective "feel" and measures the **mathematical and structural integrity** of generated narrative content. Each metric is designed to be:
1. **Programmatically measurable** where possible
2. **Tied to specific code enforcement** in the generation pipeline
3. **Comparable across versions** to track improvement

---

## Scoring Categories

### 1. Structural Integrity (Weight: 20%)

| Metric | Description | Goal | Measurement |
|--------|-------------|------|-------------|
| **Causal Logic (Therefore/But)** | Every scene must be a consequence, not "And Then" | Zero loops | Count reset patterns, "meanwhile" transitions |
| **Anchor Persistence** | Sequence 1 themes/facts remain locked throughout | No amnesia | Check theme/setup references in later sequences |
| **CausalBridge Compliance** | Each sequence ends with clear forward momentum | 100% compliance | Validate trigger→therefore→but chain |

**Scoring Guide:**
- 10: Perfect causal chain, zero resets, anchors maintained
- 8-9: Minor drift, 1-2 soft resets recovered
- 6-7: Noticeable drift, theme partially lost
- 4-5: Multiple resets, story loops detected
- 0-3: Severe amnesia, incoherent progression

---

### 2. Prose Mechanics (Weight: 20%)

| Metric | Description | Goal | Measurement |
|--------|-------------|------|-------------|
| **Sentence Variance (σ)** | Standard deviation of word counts | σ > 5.5 | `calculateSentenceVariance()` |
| **Sensory Density** | Non-visual sensory anchors | 1 per 300 words | Count smell/sound/touch/taste references |
| **Gary Provost Compliance** | Mix of short punches and long flowing sentences | Varied rhythm | Analyze sentence length distribution |

**Scoring Guide:**
- 10: σ > 6.0, rich sensory tapestry, perfect rhythm
- 8-9: σ > 5.0, good sensory balance
- 6-7: σ > 4.0, some sensory gaps
- 4-5: σ < 4.0, metronomic rhythm detected
- 0-3: Severe staccato, AI fingerprint obvious

---

### 3. Character Dynamics (Weight: 20%)

| Metric | Description | Goal | Measurement |
|--------|-------------|------|-------------|
| **Dialogue Subtext** | Characters evade direct answers, use "secrets" | Zero on-the-nose | `detectOnTheNoseDialogue()` |
| **Voice Fingerprinting** | Distinct patterns per archetype | Measurable difference | Compare dialogue stats per character |
| **Competing Wants** | Each character has surface goal vs. secret | 100% scenes | Manual audit of scene construction |
| **Professor Humanization** | Intellectual characters have cracks | At least 1 per | `checkProfessorHumanization()` |

**Scoring Guide:**
- 10: Every character has unique voice, zero on-the-nose, rich subtext
- 8-9: Strong differentiation, rare on-the-nose slips
- 6-7: Some voice overlap, occasional direct statements
- 4-5: Characters sound similar, frequent exposition
- 0-3: Indistinguishable voices, pure exposition

---

### 4. Behavioral Control (Weight: 15%)

| Metric | Description | Goal | Measurement |
|--------|-------------|------|-------------|
| **Tic Credit Enforcement** | Programmatic limit on repeated actions | Per limits | `enforceTicLimits()` report |
| **Object Tic Control** | Global prop mention limits | Per maxGlobal | `enforceObjectTicLimits()` report |
| **Prop Cooldown** | Spatial-temporal spacing | 1500+ words | `enforcePropCooldown()` violations |
| **Exit Cliché Variety** | Scene endings not repetitive | Zero repeats | `enforceExitClicheLimits()` report |
| **Fact-Lock Compliance** | Zero hallucinations on established facts | 100% | Manual audit against outline |

**Scoring Guide:**
- 10: Zero violations, perfect enforcement
- 8-9: 1-3 minor violations caught and fixed
- 6-7: 4-6 violations, some clustering
- 4-5: 7+ violations, obvious repetition
- 0-3: Severe tic hammering (e.g., 15+ watch checks)

---

### 5. AI Fingerprint Avoidance (Weight: 15%)

| Metric | Description | Goal | Measurement |
|--------|-------------|------|-------------|
| **Sloganization Level** | Minimal "Trailer-Speak" or poetic slogans | < 5 per script | `SCREENPLAY_BANGER_PATTERNS` count |
| **Clinical Vocabulary** | No robotic/formal phrasing | Zero instances | `detectClinicalDialogue()` |
| **Mundanity Ratio** | 70% mundane, 30% meaningful dialogue | ≤ 30% bangers | `checkMundanityRatio()` |
| **Verbal Friction** | Natural stutters, fillers, restarts | 10-20% of lines | `injectVerbalFriction()` count |
| **Metric Rhythm Ratio** | Avoid 5-12 word "metronome" | < 40% uniform | Analyze sentence length histogram |

**Scoring Guide:**
- 10: Undetectable by AI detectors, natural rhythm
- 8-9: < 5% AI detection, minor patterns
- 6-7: 5-15% AI detection, some uniformity
- 4-5: 15-30% AI detection, obvious patterns
- 0-3: > 30% AI detection, clearly synthetic

---

### 6. Cross-Project Uniqueness (Weight: 10%)

| Metric | Description | Goal | Measurement |
|--------|-------------|------|-------------|
| **DNA Blacklist Compliance** | No reused names/locations | Zero violations | `checkAgainstBlacklist()` |
| **Template Divergence** | Unique plot structures | No recycled beats | Manual comparison |
| **Setting Originality** | Fresh locations per project | Zero repeats | DNA blacklist audit |

**Scoring Guide:**
- 10: Completely unique DNA, no template reuse
- 8-9: Minor similarities (common words like "cabin")
- 6-7: Some recycled elements detected
- 4-5: Obvious template reuse (same character types)
- 0-3: Near-duplicate of previous project

---

## Composite Score Calculation

```
Total = (Structural × 0.20) + (Prose × 0.20) + (Character × 0.20) +
        (Behavioral × 0.15) + (AI Fingerprint × 0.15) + (Uniqueness × 0.10)
```

### Rating Scale

| Score | Rating | Description |
|-------|--------|-------------|
| 9.5-10.0 | **S-Tier** | Industry-disrupting, indistinguishable from top human writers |
| 9.0-9.4 | **A-Tier** | Professional quality, minimal AI fingerprint |
| 8.0-8.9 | **B-Tier** | Strong output, some detectable patterns |
| 7.0-7.9 | **C-Tier** | Acceptable, noticeable AI characteristics |
| 6.0-6.9 | **D-Tier** | Below average, significant improvements needed |
| < 6.0 | **F-Tier** | Unacceptable, major systemic issues |

---

## Automated Metrics (Code-Measurable)

These metrics can be extracted programmatically from the post-processing report:

```typescript
interface AGIScoreMetrics {
  // Prose Mechanics
  sentenceVariance: number;           // σ value

  // Behavioral Control
  ticsRemoved: string[];              // From enforceTicLimits
  objectTicWarnings: string[];        // From enforceObjectTicLimits
  propCooldownViolations: number;     // From enforcePropCooldown
  exitClicheWarnings: string[];       // From enforceExitClicheLimits

  // AI Fingerprint
  clinicalPhrases: string[];          // From detectClinicalDialogue
  onTheNoseDialogue: string[];        // From detectOnTheNoseDialogue
  mundanityRatio: number;             // Banger ratio
  bangerCount: number;                // Total "trailer-speak" lines
  verbalFrictionInjected: number;     // Stutters/fillers added
  extremeVarianceApplied: boolean;    // Whether variance was needed

  // Character
  verbalMessinessScore: number;       // 0-1 score
  professorWarnings: string[];        // Humanization issues
}
```

---

## Manual Audit Checklist

For metrics that require human review:

### Structural Integrity
- [ ] Read Sequence 1 opening image - does it echo in finale?
- [ ] Check theme stated - is it addressed in climax?
- [ ] Trace protagonist arc - clear transformation?
- [ ] Identify any "And Then" transitions

### Character Dynamics
- [ ] Can you identify each character by dialogue alone?
- [ ] Do characters have secrets they're hiding?
- [ ] Any "I feel [emotion]" dialogue?

### Cross-Project
- [ ] Compare character names to previous 5 projects
- [ ] Compare settings to previous 5 projects
- [ ] Note any recycled plot structures

---

## Evolution Tracking

When scoring a new generation:

1. Run automated scoring script: `node scripts/agi-scoring/score-screenplay.js <file>`
2. Complete manual audit checklist
3. Calculate composite score
4. Add entry to `LEADERBOARD.md`
5. Note specific improvements/regressions
6. Update code if new patterns identified

---

## Target Milestones

| Milestone | Target Score | Key Improvements |
|-----------|--------------|------------------|
| **v1.0 Baseline** | 7.0 | Basic generation working |
| **v1.5 Phase 1** | 8.0 | Tic limits, clinical vocab ban |
| **v2.0 Phase 2** | 8.5 | Prop cooldown, verbal friction, DNA blacklist |
| **v2.5** | 9.0 | Atomic beat generation, enhanced subtext |
| **v3.0** | 9.5+ | Full human parity |

---

## Appendix: Sample Scoring

### Example: "The Second Breath" (Baseline)

| Category | Score | Notes |
|----------|-------|-------|
| Structural Integrity | 9.25 | Strong THEREFORE/BUT, anchors maintained |
| Prose Mechanics | 8.25 | Good variance, rich sensory |
| Character Dynamics | 8.25 | Distinct voices, some subtext |
| Behavioral Control | 7.75 | Watch mentioned 28x (tic hammering) |
| AI Fingerprint | 7.75 | Some trailer-speak, 3-word fragments |
| Cross-Project | 8.00 | First generation, no comparison |
| **TOTAL** | **8.25** | B-Tier, strong foundation |

### Identified Issues for Next Version:
1. Reduce watch mentions by 70% via Code Fortress
2. Force verbal messiness (stutters, "um")
3. DNA blacklist "Montana Cabin", "Malik", "Elias"
