/**
 * Car Model — data access layer for car listings
 */

const cars = require("../data/cars.json");

class CarModel {
  /**
   * Get all cars
   */
  static getAll() {
    return cars;
  }

  /**
   * Get cars with pagination
   * @param {number} page - Page number (1-indexed)
   * @param {number} perPage - Cars per page
   * @returns {object} { cars, currentPage, totalPages, totalCars }
   */
  static getPaginated(page = 1, perPage = 10) {
    const totalCars = cars.length;
    const totalPages = Math.ceil(totalCars / perPage);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * perPage;
    const paginatedCars = cars.slice(startIndex, startIndex + perPage);

    return {
      cars: paginatedCars,
      currentPage,
      totalPages,
      totalCars,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    };
  }

  /**
   * Get a single car by ID
   * @param {number} id
   * @returns {object|null}
   */
  static getById(id) {
    return cars.find((car) => car.id === id) || null;
  }

  /**
   * Get cars by body type
   * @param {string} bodyType
   */
  static getByBodyType(bodyType) {
    return cars.filter((car) => car.bodyType === bodyType);
  }

  /**
   * Get unique body types available
   */
  static getBodyTypes() {
    return [...new Set(cars.map((car) => car.bodyType))];
  }

  /**
   * Get price range across all cars
   */
  static getPriceRange() {
    const prices = cars.map((c) => c.priceExShowroom);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }
}

module.exports = CarModel;
