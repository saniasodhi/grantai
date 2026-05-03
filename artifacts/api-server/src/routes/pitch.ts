import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

router.post("/pitch", async (req, res): Promise<void> => {
  const { pitch, orgName } = req.body as { pitch?: string; orgName?: string };

  if (!pitch || typeof pitch !== "string" || pitch.trim().length < 20) {
    res.status(400).json({ error: "Please provide a pitch of at least 20 characters." });
    return;
  }

  const prompt = `You are an expert nonprofit grant pitch coach. Analyze this organization pitch and return a detailed coaching report.

Organization: ${orgName ?? "Unknown"}
Pitch: "${pitch.trim()}"

Return ONLY a JSON object with EXACTLY this structure:
{
  "scores": {
    "clarity": <integer 0-100>,
    "impact": <integer 0-100>,
    "specificity": <integer 0-100>,
    "emotionalPull": <integer 0-100>,
    "funderAppeal": <integer 0-100>
  },
  "suggestions": [
    "<specific, actionable improvement suggestion 1>",
    "<specific, actionable improvement suggestion 2>",
    "<specific, actionable improvement suggestion 3>"
  ],
  "improvedVersion": "<rewritten pitch in 2-3 sentences — more compelling, specific, and funder-focused. Keep it punchy.>"
}

Be honest and specific. Scores should reflect actual quality — most pitches score 40-75.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    temperature: 0.4,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    res.status(500).json({ error: "Unexpected AI response" });
    return;
  }

  let parsed: {
    scores: { clarity: number; impact: number; specificity: number; emotionalPull: number; funderAppeal: number };
    suggestions: string[];
    improvedVersion: string;
  };

  try {
    const text = content.text.trim();
    parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    res.status(500).json({ error: "Failed to parse AI analysis" });
    return;
  }

  res.json(parsed);
});

export default router;
