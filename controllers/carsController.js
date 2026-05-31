const CarModel = require("../models/carModel");

class CarsController {
  /**
   * Show single car detail page
   */
  static show(req, res) {
    const id = parseInt(req.params.id, 10);
    const car = CarModel.getById(id);

    if (!car) {
      return res.status(404).render("error", {
        title: "Car Not Found",
        message: "The car you're looking for doesn't exist in our database.",
      });
    }

    res.render("cars/detail", {
      title: `${car.make} ${car.model} ${car.variant}`,
      car,
      activeNav: "home",
    });
  }
}

module.exports = CarsController;
