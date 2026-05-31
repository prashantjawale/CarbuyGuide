/**
 * Demo: Simulates a user completing the questionnaire and getting recommendations
 * Run: node src/demo.js
 */

const { getRecommendations } = require("./engine/scoringEngine");

// Simulate a user: "I commute 40km daily, family of 4, budget 15-20L,
// safety and mileage are priorities, no AMT, considering loan"
const sampleUserInputs = {
  dailyDistance: 60, // 40-80km bracket
  primaryUse: [
    { label: "Daily office commute", value: "commute", tags: ["city", "commute", "mileage"] },
    { label: "Family outings & weekend trips", value: "family", tags: ["family", "comfort", "space"] },
  ],
  passengers: { label: "Family of 3-4", value: "smallFamily", tags: ["family"] },
  terrain: { label: "Mix of city and highway", value: "mixed", tags: ["city", "highway"] },
  priorities: [
    { label: "Safety", value: "safety", tags: ["safety"], weight: 2.0 },
    { label: "Fuel efficiency", value: "mileage", tags: ["mileage", "eco"], weight: 1.5 },
    { label: "Comfort & features", value: "comfort", tags: ["comfort", "premium"], weight: 1.0 },
  ],
  budget: [1500000, 2000000], // 15L - 20L on-road
  fuelPreference: ["Petrol", "Hybrid Petrol"],
  financing: "loan",
  downPaymentPercent: 20,
  tenureMonths: 60,
  interestRate: 8.75,
  dealbreakers: [{ excludeTransmission: ["AMT"] }],
};

console.log("═══════════════════════════════════════════════════════════════");
console.log("  🚗  CarbuyGuide — Smart Car Recommendation Engine");
console.log("═══════════════════════════════════════════════════════════════\n");

console.log("📋 User Profile:");
console.log(`   Daily commute: ~${sampleUserInputs.dailyDistance} km`);
console.log(`   Budget: ₹${(sampleUserInputs.budget[0] / 100000).toFixed(1)}L - ₹${(sampleUserInputs.budget[1] / 100000).toFixed(1)}L`);
console.log(`   Priorities: Safety, Mileage, Comfort`);
console.log(`   Fuel: Petrol / Hybrid`);
console.log(`   Deal-breaker: No AMT`);
console.log(`   Financing: Loan (20% down, 5 years @ 8.75%)\n`);

const result = getRecommendations(sampleUserInputs, 5);

console.log(`📊 Analyzed ${result.totalConsidered} cars → ${result.totalAfterFilter} passed filters → Top 5:\n`);
console.log("───────────────────────────────────────────────────────────────\n");

result.recommendations.forEach((rec, index) => {
  const { car, score, matchPercentage, reasons, monthlyCost } = rec;

  console.log(`  #${index + 1}  ${car.make} ${car.model} ${car.variant}`);
  console.log(`      ${car.bodyType} | ${car.fuelType} | ${car.transmission} | ⭐ ${car.safetyRating}-star safety`);
  console.log(`      Price: ₹${(car.priceExShowroom / 100000).toFixed(1)}L ex-showroom (~₹${(car.onRoadEstimate / 100000).toFixed(1)}L on-road)`);
  console.log(`      Match: ${matchPercentage}% | Score: ${score}`);
  console.log("");
  console.log(`      💰 MONTHLY OWNERSHIP COST: ₹${monthlyCost.totalMonthly.toLocaleString("en-IN")}/month`);
  console.log(`         ├─ Fuel:        ₹${monthlyCost.breakdown.fuel.amount.toLocaleString("en-IN")} (${monthlyCost.breakdown.fuel.detail})`);
  console.log(`         ├─ EMI:         ₹${monthlyCost.breakdown.emi.amount.toLocaleString("en-IN")} (${monthlyCost.breakdown.emi.detail})`);
  console.log(`         ├─ Insurance:   ₹${monthlyCost.breakdown.insurance.amount.toLocaleString("en-IN")} (${monthlyCost.breakdown.insurance.detail})`);
  console.log(`         └─ Maintenance: ₹${monthlyCost.breakdown.maintenance.amount.toLocaleString("en-IN")} (${monthlyCost.breakdown.maintenance.detail})`);
  console.log("");
  console.log(`      ✅ Why this car:`);
  reasons.forEach((r) => console.log(`         • ${r}`));
  console.log("");
  console.log(`      👍 ${car.pros.join(" | ")}`);
  console.log(`      👎 ${car.cons.join(" | ")}`);
  console.log("\n───────────────────────────────────────────────────────────────\n");
});

console.log("💡 Tip: Compare the monthly costs — the cheapest car isn't always the cheapest to own!");
console.log("");
