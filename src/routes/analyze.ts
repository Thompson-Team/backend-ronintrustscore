import { Router } from "express";
import { analyzeWithAI } from "../services/aiService";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { text, wallet } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Missing 'text' field" });
    }

    const result = await analyzeWithAI(text, wallet);

    res.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    res.status(500).json({ error: "AI microservice failed" });
  }
});

export default router;
