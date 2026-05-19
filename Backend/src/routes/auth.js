import express from "express";
import jwt from "jsonwebtoken";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq, and, gt } from "drizzle-orm";
import { sendOtpEmail } from "../services/emailService.js";
import "dotenv/config";

const router = express.Router();

// 1. Send OTP
router.post("/send-otp", async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Name and email are required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otp_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  try {
    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
        if(existingUser.is_verified) {
            return res.status(400).json({ error: "Email already registered" });
        }
        // Update existing unverified user
        await db.update(users).set({ name, otp, otp_expiry }).where(eq(users.email, email));
    } else {
        // Create new unverified user
        await db.insert(users).values({ name, email, otp, otp_expiry, is_verified: false });
    }

    await sendOtpEmail(email, otp);
    res.json({ message: "OTP sent to email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. Register (Verify OTP and set password)
router.post("/register", async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) return res.status(400).json({ error: "Email, OTP, and password are required" });

  try {
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.email, email),
        eq(users.otp, otp),
        gt(users.otp_expiry, new Date())
      ),
    });

    if (!user) return res.status(400).json({ error: "Invalid or expired OTP" });

    await db.update(users)
      .set({ password, is_verified: true, otp: null, otp_expiry: null })
      .where(eq(users.email, email));

    res.json({ message: "Registration successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

  try {
    const user = await db.query.users.findFirst({
      where: and(eq(users.email, email), eq(users.is_verified, true)),
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: false, // Per requirements: not HttpOnly for easier local testing
      secure: false,   // Per requirements: not Secure
      sameSite: "lax", // Per requirements: not Strict
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({ name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

// 5. Get current user (session check)
router.get("/me", (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ name: payload.name, email: payload.email, role: payload.role });
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
});

export default router;
