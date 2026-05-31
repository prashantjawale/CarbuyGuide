/**
 * Monthly Ownership Cost Calculator
 *
 * Calculates the total monthly cost of owning a car based on:
 * - Fuel cost (from user's daily km + car mileage + fuel price)
 * - EMI (if financed)
 * - Insurance (estimated from car price)
 * - Maintenance (service + tyres + major service, prorated monthly based on km driven)
 *
 * All costs are in INR.
 */

const ownershipData = require("../../data/ownership-costs.json");

/**
 * Calculate monthly fuel cost
 * @param {number} dailyKM - User's daily driving distance
 * @param {number} mileageKMPL - Car's mileage (km per litre or km per kWh for EV)
 * @param {string} fuelType - Fuel type of the car
 * @param {number} [rangeKM] - For EVs, total range on full charge
 * @returns {object} { monthlyCost, dailyCost, litresPerMonth }
 */
function calculateFuelCost(dailyKM, mileageKMPL, fuelType, rangeKM) {
  const fuelPrice = ownershipData.fuelPrices[fuelType] || ownershipData.fuelPrices["Petrol"];
  const monthlyKM = dailyKM * 26; // Assuming 26 driving days/month

  if (fuelType === "Electric") {
    // EV: calculate kWh consumed per km (approx battery size / range)
    // Average EV efficiency: ~7-8 km per kWh
    const kmPerKWh = 7.5; // conservative estimate
    const kWhPerMonth = monthlyKM / kmPerKWh;
    const monthlyCost = Math.round(kWhPerMonth * fuelPrice);
    return {
      monthlyCost,
      dailyCost: Math.round(monthlyCost / 26),
      unitsPerMonth: Math.round(kWhPerMonth),
      unit: "kWh",
    };
  }

  // ICE / Hybrid / CNG
  const litresPerMonth = monthlyKM / mileageKMPL;
  const monthlyCost = Math.round(litresPerMonth * fuelPrice);

  return {
    monthlyCost,
    dailyCost: Math.round(monthlyCost / 26),
    unitsPerMonth: Math.round(litresPerMonth * 10) / 10,
    unit: fuelType === "CNG" ? "kg" : "litres",
  };
}

/**
 * Calculate EMI using reducing balance method
 * @param {number} carPrice - Ex-showroom price
 * @param {number} downPaymentPercent - Down payment percentage (0-100)
 * @param {number} tenureMonths - Loan tenure in months
 * @param {number} annualInterestRate - Annual interest rate percentage
 * @returns {object} { emi, totalInterest, loanAmount, totalPayable }
 */
function calculateEMI(carPrice, downPaymentPercent, tenureMonths, annualInterestRate) {
  // On-road price is roughly 10-12% more than ex-showroom
  const onRoadPrice = Math.round(carPrice * 1.1);
  const downPayment = Math.round(onRoadPrice * (downPaymentPercent / 100));
  const loanAmount = onRoadPrice - downPayment;

  if (loanAmount <= 0) {
    return { emi: 0, totalInterest: 0, loanAmount: 0, totalPayable: 0 };
  }

  const monthlyRate = annualInterestRate / 100 / 12;
  const emi = Math.round(
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1)
  );

  const totalPayable = emi * tenureMonths;
  const totalInterest = totalPayable - loanAmount;

  return {
    emi,
    totalInterest: Math.round(totalInterest),
    loanAmount,
    totalPayable,
    downPayment,
    onRoadPrice,
  };
}

/**
 * Calculate monthly insurance cost (averaged over year)
 * @param {number} carPrice - Ex-showroom price
 * @param {number} yearOfOwnership - 1 for first year, 2+ for subsequent
 * @returns {number} Monthly insurance cost
 */
function calculateInsurance(carPrice, yearOfOwnership = 1) {
  const rate =
    yearOfOwnership === 1
      ? ownershipData.insuranceRateFirstYear
      : ownershipData.insuranceRateSubsequent;

  const annualPremium = Math.round(carPrice * rate);
  return Math.round(annualPremium / 12);
}

/**
 * Calculate monthly maintenance cost based on km driven
 * Includes: regular service + tyre wear + major service (all prorated)
 * @param {number} carId - Car ID to look up maintenance data
 * @param {number} monthlyKM - Monthly kilometers driven
 * @returns {object} { totalMonthly, breakdown }
 */
function calculateMaintenance(carId, monthlyKM) {
  const carMaintenance = ownershipData.carMaintenanceData.find((c) => c.id === carId);

  if (!carMaintenance) {
    // Fallback: rough estimate based on average
    return {
      totalMonthly: 2500,
      breakdown: { service: 1500, tyres: 500, majorService: 500 },
    };
  }

  // Regular service cost per km
  let servicePerKM = 0;
  if (carMaintenance.serviceIntervalKM > 0) {
    servicePerKM = carMaintenance.avgServiceCost / carMaintenance.serviceIntervalKM;
  } else {
    // EVs: minimal service, flat annual estimate
    servicePerKM = carMaintenance.avgServiceCost / 15000; // assume annual check at 15k
  }
  const monthlyServiceCost = Math.round(servicePerKM * monthlyKM);

  // Tyre wear cost per km
  const tyrePerKM = carMaintenance.tyreCostSet / carMaintenance.tyreLifeKM;
  const monthlyTyreCost = Math.round(tyrePerKM * monthlyKM);

  // Major service prorated per km
  const majorPerKM = carMaintenance.majorServiceCost / carMaintenance.majorServiceIntervalKM;
  const monthlyMajorCost = Math.round(majorPerKM * monthlyKM);

  const totalMonthly = monthlyServiceCost + monthlyTyreCost + monthlyMajorCost;

  return {
    totalMonthly,
    breakdown: {
      service: monthlyServiceCost,
      tyres: monthlyTyreCost,
      majorService: monthlyMajorCost,
    },
  };
}

/**
 * Calculate complete monthly ownership cost for a car
 * @param {object} car - Car object from cars.json
 * @param {object} userInputs - User's questionnaire answers
 * @returns {object} Complete monthly cost breakdown
 */
function calculateTotalMonthlyCost(car, userInputs) {
  const dailyKM = userInputs.dailyDistance || 30;
  const monthlyKM = dailyKM * 26;

  // 1. Fuel cost
  const fuel = calculateFuelCost(dailyKM, car.mileageKMPL || 7.5, car.fuelType, car.rangeKM);

  // 2. EMI (if financing)
  let emi = { emi: 0 };
  if (userInputs.financing === "loan") {
    const downPayment = userInputs.downPaymentPercent || ownershipData.defaultDownPaymentPercent;
    const tenure = userInputs.tenureMonths || ownershipData.defaultLoanTenureMonths;
    const rate = userInputs.interestRate || ownershipData.defaultLoanInterestRate;
    emi = calculateEMI(car.priceExShowroom, downPayment, tenure, rate);
  }

  // 3. Insurance
  const insurance = calculateInsurance(car.priceExShowroom, 2); // Use year 2+ for ongoing cost

  // 4. Maintenance
  const maintenance = calculateMaintenance(car.id, monthlyKM);

  // Total
  const totalMonthly = fuel.monthlyCost + emi.emi + insurance + maintenance.totalMonthly;

  return {
    totalMonthly,
    breakdown: {
      fuel: {
        amount: fuel.monthlyCost,
        detail: `${fuel.unitsPerMonth} ${fuel.unit}/month @ ₹${ownershipData.fuelPrices[car.fuelType]}/unit`,
      },
      emi: {
        amount: emi.emi,
        detail: emi.emi > 0 ? `${userInputs.tenureMonths || 60} months @ ${userInputs.interestRate || 8.75}%` : "No loan",
      },
      insurance: {
        amount: insurance,
        detail: `~₹${insurance * 12}/year comprehensive`,
      },
      maintenance: {
        amount: maintenance.totalMonthly,
        detail: `Service ₹${maintenance.breakdown.service} + Tyres ₹${maintenance.breakdown.tyres} + Major ₹${maintenance.breakdown.majorService}`,
      },
    },
    assumptions: {
      dailyKM,
      monthlyKM,
      drivingDaysPerMonth: 26,
      fuelPrice: ownershipData.fuelPrices[car.fuelType],
    },
  };
}

module.exports = {
  calculateFuelCost,
  calculateEMI,
  calculateInsurance,
  calculateMaintenance,
  calculateTotalMonthlyCost,
};
