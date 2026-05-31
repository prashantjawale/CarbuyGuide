/**
 * Questionnaire Model — manages the question flow and user answers
 */

const questionnaireData = require("../data/questionnaire.json");

class QuestionnaireModel {
  /**
   * Get all questions
   */
  static getAll() {
    return questionnaireData.questions;
  }

  /**
   * Get a question by index (0-based)
   * @param {number} index
   * @returns {object|null}
   */
  static getByIndex(index) {
    const questions = this.getVisibleQuestions({});
    return questions[index] || null;
  }

  /**
   * Get visible questions based on current answers (handles conditional questions)
   * @param {object} answers - Current answers keyed by question id
   * @returns {Array} Filtered questions that should be shown
   */
  static getVisibleQuestions(answers) {
    return questionnaireData.questions.filter((q) => {
      if (!q.showIf) return true;
      // Check if condition is met
      const conditionKey = Object.keys(q.showIf)[0];
      const conditionValue = q.showIf[conditionKey];
      return answers[conditionKey] === conditionValue;
    });
  }

  /**
   * Get total number of visible questions
   * @param {object} answers
   */
  static getTotalQuestions(answers) {
    return this.getVisibleQuestions(answers).length;
  }

  /**
   * Get question at a specific step for the given answer state
   * @param {number} step - 0-based step index
   * @param {object} answers - Current answers
   * @returns {object|null}
   */
  static getQuestionAtStep(step, answers) {
    const visible = this.getVisibleQuestions(answers);
    return visible[step] || null;
  }

  /**
   * Check if questionnaire is complete
   * @param {number} currentStep
   * @param {object} answers
   */
  static isComplete(currentStep, answers) {
    const total = this.getTotalQuestions(answers);
    return currentStep >= total;
  }
}

module.exports = QuestionnaireModel;
