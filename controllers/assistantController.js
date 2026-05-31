const QuestionnaireModel = require("../models/questionnaireModel");
const RecommendationModel = require("../models/recommendationModel");

class AssistantController {
  /**
   * Start / show current question
   */
  static showQuestion(req, res) {
    // Initialize session if needed
    if (!req.session.answers) {
      req.session.answers = {};
      req.session.currentStep = 0;
    }

    const step = parseInt(req.query.step, 10) || req.session.currentStep || 0;
    req.session.currentStep = step;

    const answers = req.session.answers;
    const question = QuestionnaireModel.getQuestionAtStep(step, answers);
    const totalQuestions = QuestionnaireModel.getTotalQuestions(answers);

    // If no more questions, redirect to results
    if (!question) {
      return res.redirect("/find-my-car/results");
    }

    res.render("assistant/question", {
      title: "Find My Car",
      question,
      step,
      totalQuestions,
      answers,
      progress: Math.round(((step) / totalQuestions) * 100),
      hasPrev: step > 0,
      activeNav: "findMyCar",
    });
  }

  /**
   * Handle answer submission
   */
  static submitAnswer(req, res) {
    if (!req.session.answers) {
      req.session.answers = {};
    }

    const step = parseInt(req.body.step, 10) || 0;
    const questionId = req.body.questionId;
    const answer = req.body.answer;

    // Store the answer
    if (questionId && answer !== undefined) {
      req.session.answers[questionId] = answer;
    }

    // Handle budget range as separate fields
    if (req.body.budgetMin || req.body.budgetMax) {
      req.session.answers.budgetMin = req.body.budgetMin;
      req.session.answers.budgetMax = req.body.budgetMax;
    }

    // Handle loan details as a group
    if (questionId === "loanDetails") {
      req.session.answers.downPaymentPercent = req.body.downPaymentPercent;
      req.session.answers.tenureMonths = req.body.tenureMonths;
      req.session.answers.interestRate = req.body.interestRate;
    }

    // Move to next step
    const nextStep = step + 1;
    req.session.currentStep = nextStep;

    // Check if questionnaire is complete
    const totalQuestions = QuestionnaireModel.getTotalQuestions(req.session.answers);
    if (nextStep >= totalQuestions) {
      return res.redirect("/find-my-car/results");
    }

    res.redirect(`/find-my-car?step=${nextStep}`);
  }

  /**
   * Go back to previous question
   */
  static prevQuestion(req, res) {
    const step = Math.max(0, (req.session.currentStep || 1) - 1);
    req.session.currentStep = step;
    res.redirect(`/find-my-car?step=${step}`);
  }

  /**
   * Show results page
   */
  static showResults(req, res) {
    if (!req.session.answers || Object.keys(req.session.answers).length === 0) {
      return res.redirect("/find-my-car");
    }

    const result = RecommendationModel.getResults(req.session.answers);

    if (result.recommendations.length === 0 && !result.bestInBudget) {
      return res.render("assistant/no-results", {
        title: "No Matches Found",
        message: result.budgetWarning
          ? result.budgetWarning.message
          : "No cars match your criteria. Try adjusting your preferences.",
        activeNav: "findMyCar",
      });
    }

    // Separate top pick from rest
    const topPick = result.recommendations[0] || null;
    const otherSuggestions = result.recommendations.slice(1);

    res.render("assistant/results", {
      title: "Your Perfect Car Match",
      topPick,
      otherSuggestions,
      userProfile: result.userProfile,
      totalConsidered: result.totalConsidered,
      totalAfterFilter: result.totalAfterFilter,
      budgetWarning: result.budgetWarning || null,
      bestInBudget: result.bestInBudget || null,
      activeNav: "findMyCar",
    });
  }

  /**
   * Reset questionnaire and start over
   */
  static reset(req, res) {
    req.session.answers = {};
    req.session.currentStep = 0;
    res.redirect("/find-my-car");
  }
}

module.exports = AssistantController;
