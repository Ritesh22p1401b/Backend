import express from "express";
import passport from "passport";
import { register, login } from "../controllers/auth.controller.js";
import { generateToken } from "../utils/jwt.js";

const router = express.Router();

// EMAIL AUTH
router.post("/signup", register);
router.post("/login", login);

// GOOGLE AUTH
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = generateToken(req.user._id);

    // Redirect to frontend with JWT
    res.redirect(
      `http://localhost:5173/oauth-success?token=${token}`
    );
  }
);

export default router;
