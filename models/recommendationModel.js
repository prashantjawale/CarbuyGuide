/**
 * Recommendation Model — transforms raw answers into scoring inputs
 * and runs the recommendation engine
 */

const { getRecommendations } = require("../src/engine/scoringEngine");
const questionnaireData = require("../data/questionnaire.json");

class RecommendationModel {
  /**
   * Transform raw form answers into the format expected by the scoring engine
   * @param {object} rawAnswers - Answers keyed by question ID with raw values
   * @returns {object} Structured user inputs for the scoring engine
   */
  static transformAnswers(rawAnswers) {
    const userInputs = {};

    // dailyDistance — stored as numeric value
    if (rawAnswers.dailyDistance) {
      userInputs.dailyDistance = parseInt(rawAnswers.dailyDistance, 10);
    }

    // primaryUse — multi-choice, need to map values back to tags
    if (rawAnswers.primaryUse) {
      const selected = Array.isArray(rawAnswers.primaryUse)
        ? rawAnswers.primaryUse
        : [rawAnswers.primaryUse];
      const question = questionnaireData.questions.find((q) => q.id === "primaryUse");
      userInputs.primaryUse = selected.map((val) =>
        question.options.find((o) => o.value === val)
      ).filter(Boolean);
    }

    // passengers — single choice with tags
    if (rawAnswers.passengers) {
      const question = questionnaireData.questions.find((q) => q.id === "passengers");
      userInputs.passengers = question.options.find((o) => o.value === rawAnswers.passengers);
    }

    // terrain — single choice with tags
    if (rawAnswers.terrain) {
      const question = questionnaireData.questions.find((q) => q.id === "terrain");
      userInputs.terrain = question.options.find((o) => o.value === rawAnswers.terrain);
    }

    // priorities — multi-choice with weights
    if (rawAnswers.priorities) {
      const selected = Array.isArray(rawAnswers.priorities)
        ? rawAnswers.priorities
        : [rawAnswers.priorities];
      const question = questionnaireData.questions.find((q) => q.id === "priorities");
      userInputs.priorities = selected.map((val) =>
        question.options.find((o) => o.value === val)
      ).filter(Boolean);
    }

    // budget — range [min, max]
    if (rawAnswers.budgetMin && rawAnswers.budgetMax) {
      userInputs.budget = [
        parseInt(rawAnswers.budgetMin, 10),
        parseInt(rawAnswers.budgetMax, 10),
      ];
    } else if (rawAnswers.budget) {
      // Single value — create a range around it
      const val = parseInt(rawAnswers.budget, 10);
      userInputs.budget = [val * 0.8, val * 1.2];
    }

    // fuelPreference
    if (rawAnswers.fuelPreference) {
      const selected = Array.isArray(rawAnswers.fuelPreference)
        ? rawAnswers.fuelPreference
        : [rawAnswers.fuelPreference];
      userInputs.fuelPreference = selected;
    }

    // financing
    if (rawAnswers.financing) {
      userInputs.financing = rawAnswers.financing;
    }

    // loan details
    if (rawAnswers.financing === "loan") {
      userInputs.downPaymentPercent = parseInt(rawAnswers.downPaymentPercent || "20", 10);
      userInputs.tenureMonths = parseInt(rawAnswers.tenureMonths || "60", 10);
      userInputs.interestRate = parseFloat(rawAnswers.interestRate || "8.75");
    }

    // dealbreakers
    if (rawAnswers.dealbreakers) {
      const selected = Array.isArray(rawAnswers.dealbreakers)
        ? rawAnswers.dealbreakers
        : [rawAnswers.dealbreakers];
      const question = questionnaireData.questions.find((q) => q.id === "dealbreakers");
      userInputs.dealbreakers = selected.map((val) =>
        question.options.find((o) => o.value === val)
      ).filter(Boolean);
    }

    return userInputs;
  }

  /**
   * Get recommendations based on raw answers
   * @param {object} rawAnswers
   * @returns {object} Recommendation results
   */
  static getResults(rawAnswers) {
    const userInputs = this.transformAnswers(rawAnswers);
    return getRecommendations(userInputs, 5);
  }
}

module.exports = RecommendationModel;
