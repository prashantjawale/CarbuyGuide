const express = require("express");
const router = express.Router();
const CarsController = require("../controllers/carsController");

router.get("/:id", CarsController.show);

module.exports = router;
