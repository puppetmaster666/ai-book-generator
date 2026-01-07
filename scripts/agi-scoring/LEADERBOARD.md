# NA-AST Leaderboard

## Narrative Architect AGI Scoring - Progress Tracker

---

## Current High Score

| Metric | Score | Date | Version |
|--------|-------|------|---------|
| **BEST** | 8.53 | 2025-01-07 | v1.5 (The_Second_Breath) |

### Critical Finding
The script scores **0/10 on Behavioral Control** due to severe tic hammering:
- Watch mentioned **34 times** (limit: 4) - 850% over limit
- Gun mentioned **28 times** (limit: 6) - 467% over limit
- Watch clustering: mentions only 57-274 words apart (need 2000+)

**This is why Phase 2 prop cooldown and tic enforcement were essential.**

---

## Score History

### Entry Format
```
| Date | Version | Script | Composite | Structural | Prose | Character | Behavioral | AI-FP | Unique | Notes |
```

### All Entries

| Date | Version | Script Name | Composite | Struct | Prose | Char | Behav | AI-FP | Unique | Key Notes |
|------|---------|-------------|-----------|--------|-------|------|-------|-------|--------|-----------|
| 2025-01-07 | v1.5 | The_Second_Breath | **8.53** | 10.0 | 8.5 | 10.0 | **0.0** | 10.0 | 8.0 | Watch 34x, Gun 28x - severe tic hammering |
| 2025-01-07 | v1.5 | The_Miller_Mandate | 6.43 | **0.0** | 8.0 | 10.0 | **0.0** | 10.0 | 8.0 | Reset patterns detected, 24k words, 290 messiness |
| 2025-01-07 | v2.0 | Baseline (Pre-Phase2) | 8.25 | 9.25 | 8.25 | 8.25 | 7.75 | 7.75 | 8.00 | Original manual estimate |

---

## Milestone Tracking

| Milestone | Target | Current Best | Status | Date Achieved |
|-----------|--------|--------------|--------|---------------|
| v1.0 Baseline | 7.0 | 8.25 | PASSED | 2025-01-07 |
| v1.5 Phase 1 | 8.0 | 8.25 | PASSED | 2025-01-07 |
| v2.0 Phase 2 | 8.5 | - | PENDING | - |
| v2.5 Enhanced | 9.0 | - | PENDING | - |
| v3.0 Human Parity | 9.5 | - | PENDING | - |

---

## Category Records

### Best Scores Per Category

| Category | Best Score | Script | Date | Key Factor |
|----------|------------|--------|------|------------|
| Structural Integrity | **10.0** | The_Second_Breath | 2025-01-07 | Zero reset patterns detected |
| Prose Mechanics | 8.5 | The_Second_Breath | 2025-01-07 | σ=4.81, 140 sensory refs |
| Character Dynamics | **10.0** | The_Second_Breath | 2025-01-07 | Zero on-the-nose dialogue |
| Behavioral Control | **0.0** | The_Second_Breath | 2025-01-07 | Watch 34x, Gun 28x, severe clustering |
| AI Fingerprint | **10.0** | The_Second_Breath | 2025-01-07 | 91 messiness instances, 0 bangers |
| Cross-Project | 8.0 | The_Second_Breath | 2025-01-07 | First generation |

---

## Issue Tracking

### Recurring Problems (to fix in code)

| Issue | Frequency | Impact | Fix Status | Code Location |
|-------|-----------|--------|------------|---------------|
| Watch tic hammering | HIGH | -2 behavioral | FIXED | `enforceTicLimits()` |
| Trailer-speak/bangers | MEDIUM | -1.5 AI-FP | FIXED | `checkMundanityRatio()` |
| Clinical vocabulary | LOW | -0.5 AI-FP | FIXED | `detectClinicalDialogue()` |
| Prop clustering | MEDIUM | -1 behavioral | FIXED | `enforcePropCooldown()` |
| Missing verbal friction | HIGH | -1 AI-FP | FIXED | `injectVerbalFriction()` |

### DNA Blacklist Log

Track names/locations that have been used and must be avoided:

| Entry | Type | Source Project | Date Added |
|-------|------|----------------|------------|
| - | - | - | - |

---

## Version Changelog

### v2.0 (2025-01-07) - Phase 2 Complete

**New Features:**
- Prop cooldown system (spatial-temporal enforcement)
- Mundanity ratio enforcer (≤30% bangers)
- Verbal friction engine (15% stochastic injection)
- Extreme variance enforcement (σ > 5.5)
- Cross-project DNA blacklist
- Scene constraints ("What You Can't Say")

**Expected Improvements:**
- Behavioral Control: +1.0 (prop cooldown, better tic limits)
- AI Fingerprint: +1.5 (verbal friction, mundanity control)
- Cross-Project: +1.0 (DNA blacklist)

**Target Score: 8.5+**

---

### v1.5 (2025-01-06) - Phase 1 Complete

**Features Added:**
- Tic credit system with per-sequence limits
- Exit cliché detection and variety enforcement
- Verbal messiness detection
- Professor humanization checks
- Noir template detection
- Object tic global tracking
- Sentence variance enforcement (σ > 4.5)
- Clinical vocabulary ban
- On-the-nose dialogue detection

---

### v1.0 (Baseline)

Initial screenplay generation system.

---

## Testing Protocol

### Before Each Score Entry

1. Generate screenplay with current version
2. Run: `node scripts/agi-scoring/score-screenplay.js <file> --verbose`
3. Note the composite score and category breakdown
4. Add entry to leaderboard
5. If score improved: note what changed
6. If score regressed: investigate and document

### Regression Tests

When composite drops >0.25 from previous best:
1. Identify which category regressed
2. Check recent code changes
3. Revert or fix
4. Re-test and document

---

## How to Add a New Entry

```bash
# 1. Score the screenplay
node scripts/agi-scoring/score-screenplay.js output/screenplay.txt --verbose --json > score.json

# 2. Add to leaderboard table
# Format: | Date | Version | Script | Composite | Struct | Prose | Char | Behav | AI-FP | Unique | Notes |

# 3. Update "Current High Score" if applicable

# 4. Update "Category Records" if any category improved

# 5. Add to "Issue Tracking" if new problems found

# 6. Commit changes
git add scripts/agi-scoring/LEADERBOARD.md
git commit -m "Add AGI score: [script-name] - [composite]/10"
```

---

## Goals

### Short-term (v2.5)
- [ ] Achieve 9.0+ composite score
- [ ] Zero tic violations in any category
- [ ] < 20% mundanity ratio
- [ ] σ > 5.5 consistently

### Medium-term (v3.0)
- [ ] Achieve 9.5+ composite score
- [ ] Pass GPTZero with < 5% AI detection
- [ ] Complete DNA blacklist integration
- [ ] Voice fingerprinting per character

### Long-term
- [ ] Industry-standard screenplay quality
- [ ] Indistinguishable from professional human writers
- [ ] Self-improving feedback loop
