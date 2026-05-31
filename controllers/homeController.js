const CarModel = require("../models/carModel");

class HomeController {
  static index(req, res) {
    const page = parseInt(req.query.page, 10) || 1;
    const result = CarModel.getPaginated(page, 10);

    res.render("home", {
      title: "CarbuyGuide — Find Your Perfect Car",
      ...result,
      activeNav: "home",
    });
  }
}

module.exports = HomeController;
