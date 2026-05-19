import express from "express";
import { db } from "../db/index.js";
import { complaints, users } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// 1. Submit a complaint
router.post("/", requireAuth, async (req, res) => {
  const { complaint_text, ai_question, user_answer } = req.body;
  if (!complaint_text) return res.status(400).json({ error: "Complaint text is required" });

  try {
    const [newComplaint] = await db.insert(complaints).values({
      user_id: req.user.id,
      complaint_text,
      ai_question,
      user_answer,
    }).returning();

    res.json(newComplaint);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save complaint" });
  }
});

// 2. Get user's own complaints
router.get("/my", requireAuth, async (req, res) => {
  try {
    const userComplaints = await db.query.complaints.findMany({
      where: eq(complaints.user_id, req.user.id),
      orderBy: [desc(complaints.created_at)],
    });
    res.json(userComplaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
});

// 3. Admin: Get all complaints
router.get("/admin/all", requireAdmin, async (req, res) => {
  try {
    const allComplaints = await db.select({
      id: complaints.id,
      complaint_text: complaints.complaint_text,
      ai_question: complaints.ai_question,
      user_answer: complaints.user_answer,
      created_at: complaints.created_at,
      userName: users.name,
      userEmail: users.email,
    })
    .from(complaints)
    .innerJoin(users, eq(complaints.user_id, users.id))
    .orderBy(desc(complaints.created_at));

    res.json(allComplaints);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch all complaints" });
  }
});

export default router;
