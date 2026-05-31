/**
 * Car Recommendation Scoring Engine
 *
 * Scores each car against user's questionnaire answers.
 * Flow:
 *   1. Filter out cars that violate deal-breakers or budget
 *   2. Score remaining cars based on tag matching + priority weights
 *   3. Sort by score, return top N with reasons
 */

const cars = require("../../data/cars.json");
const { calculateTotalMonthlyCost } = require("../calculator/monthlyCostCalculator");

/**
 * Apply hard filters (budget, deal-breakers, fuel preference)
 * @param {Array} carList - All cars
 * @param {object} userInputs - User's questionnaire answers
 * @param {object} options - { skipBudget: bool, relaxBudget: bool }
 * @returns {Array} Filtered cars that pass all hard constraints
 */
function applyFilters(carList, userInputs, options = {}) {
  return carList.filter((car) => {
    // Budget filter (on-road = ex-showroom * 1.1 approx)
    if (!options.skipBudget) {
      const onRoadEstimate = car.priceExShowroom * 1.1;
      const [minBudget, maxBudget] = userInputs.budget || [0, Infinity];
      if (options.relaxBudget) {
        // Relaxed: allow up to 50% over budget
        if (onRoadEstimate > maxBudget * 1.5 || onRoadEstimate < minBudget * 0.7) {
          return false;
        }
      } else {
        // Strict: within budget range
        if (onRoadEstimate > maxBudget * 1.05 || onRoadEstimate < minBudget * 0.85) {
          return false;
        }
      }
    }

    // Fuel preference filter
    if (userInputs.fuelPreference && !userInputs.fuelPreference.includes("any")) {
      const acceptedFuels = userInputs.fuelPreference;

      const matches = acceptedFuels.some((f) => {
        if (f === "Petrol") return ["Petrol", "Turbo Petrol"].includes(car.fuelType);
        if (f === "Hybrid Petrol") return car.fuelType === "Hybrid Petrol";
        return car.fuelType === f;
      });

      if (!matches) return false;
    }

    // Deal-breakers
    if (userInputs.dealbreakers && userInputs.dealbreakers.length > 0) {
      for (const db of userInputs.dealbreakers) {
        if (db.excludeTransmission && db.excludeTransmission.includes(car.transmission)) {
          return false;
        }
        if (db.minSafetyRating && car.safetyRating < db.minSafetyRating) {
          return false;
        }
        if (db.requireFeature) {
          const hasFeature = car.features.some(
            (f) => f.toLowerCase().includes(db.requireFeature.toLowerCase())
          );
          if (!hasFeature) return false;
        }
        if (db.excludeFuel && db.excludeFuel.includes(car.fuelType)) {
          return false;
        }
        if (db.minSeats && car.seatingCapacity < db.minSeats) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Apply ONLY budget filter (ignore other criteria) to find best in-budget option
 * @param {Array} carList - All cars
 * @param {object} userInputs - User's questionnaire answers
 * @returns {Array} Cars within budget regardless of other filters
 */
function applyBudgetOnlyFilter(carList, userInputs) {
  const [minBudget, maxBudget] = userInputs.budget || [0, Infinity];
  return carList.filter((car) => {
    const onRoadEstimate = car.priceExShowroom * 1.1;
    return onRoadEstimate <= maxBudget * 1.05 && onRoadEstimate >= minBudget * 0.85;
  });
}

/**
 * Collect all scoring tags from user's answers
 * @param {object} userInputs - User's questionnaire answers
 * @returns {object} { tags: string[], weights: Map<string, number> }
 */
function collectUserTags(userInputs) {
  const tags = [];
  const weights = new Map();

  // From dailyDistance
  if (userInputs.dailyDistance) {
    const distanceTags = {
      15: ["city"],
      30: ["city", "commute"],
      60: ["highway", "commute"],
      100: ["highway", "longDrive"],
    };
    const dTags = distanceTags[userInputs.dailyDistance] || ["city", "commute"];
    dTags.forEach((t) => {
      tags.push(t);
      weights.set(t, (weights.get(t) || 0) + 1.0);
    });
  }

  // From primaryUse
  if (userInputs.primaryUse) {
    userInputs.primaryUse.forEach((use) => {
      if (use.tags) {
        use.tags.forEach((t) => {
          tags.push(t);
          weights.set(t, (weights.get(t) || 0) + 1.5);
        });
      }
    });
  }

  // From passengers
  if (userInputs.passengers && userInputs.passengers.tags) {
    userInputs.passengers.tags.forEach((t) => {
      tags.push(t);
      weights.set(t, (weights.get(t) || 0) + 1.2);
    });
  }

  // From terrain
  if (userInputs.terrain && userInputs.terrain.tags) {
    userInputs.terrain.tags.forEach((t) => {
      tags.push(t);
      weights.set(t, (weights.get(t) || 0) + 1.0);
    });
  }

  // From priorities (highest weight)
  if (userInputs.priorities) {
    userInputs.priorities.forEach((priority) => {
      if (priority.tags) {
        priority.tags.forEach((t) => {
          tags.push(t);
          const priorityWeight = priority.weight || 1.0;
          weights.set(t, (weights.get(t) || 0) + priorityWeight * 2);
        });
      }
    });
  }

  return { tags: [...new Set(tags)], weights };
}

/**
 * Score a single car against user's profile
 * @param {object} car - Car object
 * @param {string[]} userTags - Collected user tags
 * @param {Map} weights - Tag weights
 * @returns {number} Score (higher = better match)
 */
function scoreCar(car, userTags, weights) {
  let score = 0;

  // Tag matching: for each car's bestFor tag that matches user tags
  car.bestFor.forEach((tag) => {
    if (userTags.includes(tag)) {
      score += weights.get(tag) || 1.0;
    }
  });

  // Bonus for safety if user cares about it
  if (userTags.includes("safety")) {
    score += car.safetyRating * 0.5;
  }

  // Bonus for mileage if user cares about running cost
  if (userTags.includes("mileage") || userTags.includes("eco")) {
    if (car.mileageKMPL > 20) score += 1.0;
    if (car.mileageKMPL > 25) score += 0.5;
  }

  // Bonus for user rating
  score += (car.userRating - 3.5) * 0.5; // Normalize around 3.5

  return Math.round(score * 100) / 100;
}

/**
 * Generate human-readable reasons why a car was recommended
 * @param {object} car - Car object
 * @param {string[]} userTags - User's tags
 * @returns {string[]} Array of reason strings
 */
function generateReasons(car, userTags) {
  const reasons = [];

  const matchedTags = car.bestFor.filter((t) => userTags.includes(t));

  if (matchedTags.includes("safety") && car.safetyRating >= 5) {
    reasons.push("5-star safety rating — top priority match");
  }
  if (matchedTags.includes("mileage") && car.mileageKMPL > 20) {
    reasons.push(`Excellent mileage (${car.mileageKMPL} km/l) keeps running costs low`);
  }
  if (matchedTags.includes("family")) {
    reasons.push(`Good for families — ${car.seatingCapacity} seats, ${car.bootSpaceLitres}L boot`);
  }
  if (matchedTags.includes("city")) {
    reasons.push("Well-suited for city driving");
  }
  if (matchedTags.includes("highway") || matchedTags.includes("longDrive")) {
    reasons.push(`Highway-ready with ${car.powerBHP} BHP`);
  }
  if (matchedTags.includes("electric") || matchedTags.includes("eco")) {
    reasons.push("Eco-friendly — low/zero emissions");
  }
  if (matchedTags.includes("offroad")) {
    reasons.push(`Off-road capable — ${car.groundClearanceMM}mm ground clearance`);
  }
  if (car.userRating >= 4.3) {
    reasons.push(`Highly rated by owners (${car.userRating}/5)`);
  }

  // If no specific reasons, add generic ones
  if (reasons.length === 0) {
    reasons.push(`Matches your usage profile (${matchedTags.join(", ")})`);
  }

  return reasons.slice(0, 3); // Max 3 reasons
}

/**
 * Main recommendation function
 * @param {object} userInputs - Complete questionnaire answers
 * @param {number} topN - Number of recommendations to return (default 5)
 * @returns {object} Ranked car recommendations with scores, reasons, and monthly costs
 */
function getRecommendations(userInputs, topN = 5) {
  // Step 1: Try strict filter (all criteria including budget)
  const filteredCars = applyFilters(cars, userInputs);

  // Step 2: Collect user tags and weights (needed for scoring in all paths)
  const { tags: userTags, weights } = collectUserTags(userInputs);

  // Step 3: If strict filter has results, return them normally
  if (filteredCars.length > 0) {
    const scoredCars = scoreAndRank(filteredCars, userTags, weights, userInputs);
    return {
      recommendations: scoredCars.slice(0, topN),
      totalConsidered: cars.length,
      totalAfterFilter: filteredCars.length,
      budgetWarning: null,
      bestInBudget: null,
      userProfile: {
        tags: userTags,
        dailyKM: userInputs.dailyDistance || 30,
        budget: userInputs.budget,
        financing: userInputs.financing,
      },
    };
  }

  // Step 4: No cars match all criteria within budget
  // Find the best car IN BUDGET (relaxing other criteria like fuel, dealbreakers)
  const [minBudget, maxBudget] = userInputs.budget || [0, Infinity];
  const inBudgetCars = applyBudgetOnlyFilter(cars, userInputs);
  let bestInBudget = null;

  if (inBudgetCars.length > 0) {
    const scoredInBudget = scoreAndRank(inBudgetCars, userTags, weights, userInputs);
    bestInBudget = scoredInBudget[0];
    // Figure out which criteria it doesn't meet
    bestInBudget.unmetCriteria = getUnmetCriteria(cars.find(c => c.id === bestInBudget.car.id), userInputs);
  }

  // Step 5: Find cars with relaxed budget (show what's available if they stretch)
  const relaxedCars = applyFilters(cars, userInputs, { relaxBudget: true });
  let expandedRecommendations = [];

  if (relaxedCars.length > 0) {
    const scoredRelaxed = scoreAndRank(relaxedCars, userTags, weights, userInputs);
    expandedRecommendations = scoredRelaxed.slice(0, topN);
  }

  // If still nothing, try with only budget skipped entirely
  if (expandedRecommendations.length === 0) {
    const noBudgetCars = applyFilters(cars, userInputs, { skipBudget: true });
    if (noBudgetCars.length > 0) {
      const scoredNoBudget = scoreAndRank(noBudgetCars, userTags, weights, userInputs);
      expandedRecommendations = scoredNoBudget.slice(0, topN);
    }
  }

  return {
    recommendations: expandedRecommendations,
    totalConsidered: cars.length,
    totalAfterFilter: 0,
    budgetWarning: {
      message: `No cars fully match your criteria within ₹${(minBudget/100000).toFixed(1)}L – ₹${(maxBudget/100000).toFixed(1)}L budget.`,
      suggestion: expandedRecommendations.length > 0
        ? "Here are the best options if you can stretch your budget slightly."
        : "Try adjusting your deal-breakers or fuel preference.",
    },
    bestInBudget,
    userProfile: {
      tags: userTags,
      dailyKM: userInputs.dailyDistance || 30,
      budget: userInputs.budget,
      financing: userInputs.financing,
    },
  };
}

/**
 * Score and rank a list of cars
 * @param {Array} carList - Cars to score
 * @param {string[]} userTags - User tags
 * @param {Map} weights - Tag weights
 * @param {object} userInputs - User inputs for cost calculation
 * @returns {Array} Scored and sorted cars
 */
function scoreAndRank(carList, userTags, weights, userInputs) {
  const scoredCars = carList.map((car) => {
    const score = scoreCar(car, userTags, weights);
    const reasons = generateReasons(car, userTags);
    const monthlyCost = calculateTotalMonthlyCost(car, userInputs);

    return {
      car: {
        id: car.id,
        make: car.make,
        model: car.model,
        variant: car.variant,
        bodyType: car.bodyType,
        priceExShowroom: car.priceExShowroom,
        onRoadEstimate: Math.round(car.priceExShowroom * 1.1),
        fuelType: car.fuelType,
        transmission: car.transmission,
        mileageKMPL: car.mileageKMPL,
        powerBHP: car.powerBHP,
        safetyRating: car.safetyRating,
        seatingCapacity: car.seatingCapacity,
        features: car.features,
        pros: car.pros,
        cons: car.cons,
        userRating: car.userRating,
      },
      score,
      matchPercentage: Math.min(100, Math.round((score / (userTags.length * 1.5)) * 100)),
      reasons,
      monthlyCost,
    };
  });

  scoredCars.sort((a, b) => b.score - a.score);
  return scoredCars;
}

/**
 * Determine which user criteria a car doesn't meet
 * @param {object} car - Car object
 * @param {object} userInputs - User inputs
 * @returns {string[]} List of unmet criteria
 */
function getUnmetCriteria(car, userInputs) {
  const unmet = [];

  // Check fuel preference
  if (userInputs.fuelPreference && !userInputs.fuelPreference.includes("any")) {
    const matches = userInputs.fuelPreference.some((f) => {
      if (f === "Petrol") return ["Petrol", "Turbo Petrol"].includes(car.fuelType);
      if (f === "Hybrid Petrol") return car.fuelType === "Hybrid Petrol";
      return car.fuelType === f;
    });
    if (!matches) unmet.push(`Fuel type is ${car.fuelType} (you preferred ${userInputs.fuelPreference.join(", ")})`);
  }

  // Check deal-breakers
  if (userInputs.dealbreakers && userInputs.dealbreakers.length > 0) {
    for (const db of userInputs.dealbreakers) {
      if (db.excludeTransmission && db.excludeTransmission.includes(car.transmission)) {
        unmet.push(`Has ${car.transmission} transmission (your deal-breaker)`);
      }
      if (db.minSafetyRating && car.safetyRating < db.minSafetyRating) {
        unmet.push(`Safety rating is ${car.safetyRating}-star (you wanted ${db.minSafetyRating}+)`);
      }
      if (db.requireFeature) {
        const hasFeature = car.features.some(
          (f) => f.toLowerCase().includes(db.requireFeature.toLowerCase())
        );
        if (!hasFeature) unmet.push(`Missing ${db.requireFeature}`);
      }
      if (db.minSeats && car.seatingCapacity < db.minSeats) {
        unmet.push(`Only ${car.seatingCapacity} seats (you need ${db.minSeats}+)`);
      }
    }
  }

  if (unmet.length === 0) {
    unmet.push("Matches all criteria but limited options in this price range");
  }

  return unmet;
}

module.exports = {
  getRecommendations,
  applyFilters,
  applyBudgetOnlyFilter,
  scoreCar,
  collectUserTags,
  scoreAndRank,
};
