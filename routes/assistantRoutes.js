const express = require("express");
const router = express.Router();
const AssistantController = require("../controllers/assistantController");

router.get("/", AssistantController.showQuestion);
router.post("/answer", AssistantController.submitAnswer);
router.get("/prev", AssistantController.prevQuestion);
router.get("/results", AssistantController.showResults);
router.get("/reset", AssistantController.reset);

module.exports = router;
