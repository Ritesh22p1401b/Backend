import express from "express";
import { protect } from "../middlewares/auth.middleware.js";

import {
  getAnalytics,
  getResults
} from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/analytics", protect, getAnalytics);
router.get("/results", protect, getResults);

export default router;