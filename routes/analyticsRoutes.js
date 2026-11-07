const express = require("express");
const authMiddelware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/authorizeRoles");
const {
  bloodGroupDetailsContoller,
  globalStatsController,
} = require("../controllers/analyticsController");

const router = express.Router();

//routes

//GET BLOOD DATA
router.get("/bloodGroups-data", authMiddelware, authorizeRoles("admin", "hospital"), bloodGroupDetailsContoller);

//GET GLOBAL STATS
router.get("/stats", authMiddelware, authorizeRoles("admin", "hospital"), globalStatsController);

module.exports = router;