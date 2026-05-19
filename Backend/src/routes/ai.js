import express from "express";
import { generateFollowUpQuestion } from "../services/aiService.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/question", requireAuth, async (req, res) => {
  const { complaint_text } = req.body;
  if (!complaint_text) return res.status(400).json({ error: "Complaint text is required" });

  try {
    const question = await generateFollowUpQuestion(complaint_text);
    res.json({ question });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate AI question" });
  }
});

export default router;
