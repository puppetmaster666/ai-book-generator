/**
 * NA-AST: Narrative Architect AGI Scoring Template
 *
 * This module exports the scoring functions for programmatic use
 * in the generation pipeline.
 */

const { scoreScreenplay, CONFIG } = require('./score-screenplay');

module.exports = {
  scoreScreenplay,
  CONFIG,

  /**
   * Quick score - returns just the composite and rating
   */
  quickScore(content) {
    const result = scoreScreenplay(content, false);
    return {
      composite: result.composite,
      rating: result.rating,
    };
  },

  /**
   * Check if content passes minimum quality threshold
   */
  passesQualityGate(content, threshold = 7.5) {
    const result = scoreScreenplay(content, false);
    return {
      passes: result.composite >= threshold,
      score: result.composite,
      rating: result.rating,
    };
  },

  /**
   * Get improvement suggestions based on score
   */
  getImprovementSuggestions(content) {
    const result = scoreScreenplay(content, true);
    const suggestions = [];

    // Check each category
    if (result.categories.prose.score < 8) {
      if (result.categories.prose.details.variance.stdDev < 5.0) {
        suggestions.push('Increase sentence length variance (target σ > 5.5)');
      }
      if (result.categories.prose.details.sensory.total < 10) {
        suggestions.push('Add more non-visual sensory details (smell, sound, touch)');
      }
    }

    if (result.categories.behavioral.score < 8) {
      const issues = result.categories.behavioral.details.issues;
      if (issues.length > 0) {
        suggestions.push(`Fix tic/prop issues: ${issues.slice(0, 3).join(', ')}`);
      }
    }

    if (result.categories.aiFingerprint.score < 8) {
      if (result.categories.aiFingerprint.details.clinical.length > 0) {
        suggestions.push('Remove clinical vocabulary');
      }
      if (result.categories.aiFingerprint.details.mundanityRatio > 0.30) {
        suggestions.push('Reduce philosophical "banger" dialogue ratio');
      }
      if (result.categories.aiFingerprint.details.messiness.total < 3) {
        suggestions.push('Add verbal friction (stutters, fillers, interruptions)');
      }
    }

    if (result.categories.character.score < 8) {
      if (result.categories.character.details.onTheNose.length > 0) {
        suggestions.push('Remove on-the-nose dialogue');
      }
    }

    return {
      score: result.composite,
      rating: result.rating,
      suggestions,
    };
  },
};
