import { Router, type IRouter } from "express";
import { db, grantsTable } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

router.post("/magic", async (req, res): Promise<void> => {
  const { description } = req.body as { description?: string };
  if (!description || typeof description !== "string" || description.trim().length < 5) {
    res.status(400).json({ error: "Please provide an organization description." });
    return;
  }

  const grants = await db.select().from(grantsTable);

  // Step 1: Match grants with temperature 0.3
  const matchPrompt = `You are a grant matching expert. Given a one-sentence organization description, identify the top 3 best-matching grants and score them.

Organization description: "${description.trim()}"

Available Grants:
${grants.map((g) => `ID ${g.id}: ${g.name} by ${g.funder} — ${g.focusArea} — ${g.location} — $${g.amount?.toLocaleString() ?? "varies"} — ${g.eligibility}`).join("\n")}

Return a JSON object in EXACTLY this format (no other text):
{
  "inferredProfile": {
    "orgName": "<short org name inferred from description>",
    "mission": "<inferred mission>",
    "focusArea": "<primary focus area>"
  },
  "matches": [
    {"grantId": <number>, "fitScore": <70-98>, "winProbability": <8-35>, "reasoning": "<2 sentence explanation>"},
    {"grantId": <number>, "fitScore": <65-90>, "winProbability": <5-25>, "reasoning": "<2 sentence explanation>"},
    {"grantId": <number>, "fitScore": <60-85>, "winProbability": <5-20>, "reasoning": "<2 sentence explanation>"}
  ]
}

Return ONLY the JSON object.`;

  const matchMessage = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0.3,
    messages: [{ role: "user", content: matchPrompt }],
  });

  const matchContent = matchMessage.content[0];
  if (matchContent.type !== "text") {
    res.status(500).json({ error: "AI returned unexpected response" });
    return;
  }

  let parsed: {
    inferredProfile: { orgName: string; mission: string; focusArea: string };
    matches: Array<{ grantId: number; fitScore: number; winProbability: number; reasoning: string }>;
  };

  try {
    const jsonText = matchContent.text.trim();
    const startIdx = jsonText.indexOf("{");
    const endIdx = jsonText.lastIndexOf("}");
    parsed = JSON.parse(jsonText.slice(startIdx, endIdx + 1));
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  const topMatch = parsed.matches[0];
  const topGrant = grants.find((g) => g.id === topMatch.grantId);

  if (!topGrant) {
    res.status(500).json({ error: "Grant not found" });
    return;
  }

  // Step 2: Draft 300-word application for #1 match with temperature 0.7
  const draftPrompt = `Write a compelling 300-word grant application letter for the following:

Organization: ${parsed.inferredProfile.orgName}
Mission: ${parsed.inferredProfile.mission}
Description: ${description.trim()}

Grant: ${topGrant.name}
Funder: ${topGrant.funder}
Amount: ${topGrant.amount ? `$${topGrant.amount.toLocaleString()}` : "Variable"}
Focus Area: ${topGrant.focusArea}
Eligibility: ${topGrant.eligibility}
Description: ${topGrant.description}

Write exactly 300 words. Structure:
- Paragraph 1 (hook, 60 words): Open with a vivid, specific problem statement that creates urgency
- Paragraph 2 (solution, 80 words): Describe the organization's approach with concrete details and impact metrics
- Paragraph 3 (alignment, 80 words): Show deep alignment between the org's work and this specific grant's priorities
- Paragraph 4 (ask, 80 words): Make a specific funding ask with expected outcomes and a strong close

Write in confident, professional prose. Use specific numbers. Start immediately with the letter body.`;

  const draftMessage = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0.7,
    messages: [{ role: "user", content: draftPrompt }],
  });

  const draftContent = draftMessage.content[0];
  const draft = draftContent.type === "text" ? draftContent.text : "";

  // Assemble result
  const matchesWithGrants = parsed.matches.map((m) => {
    const grant = grants.find((g) => g.id === m.grantId);
    return { ...m, grant };
  }).filter((m) => m.grant != null);

  res.json({
    inferredProfile: parsed.inferredProfile,
    matches: matchesWithGrants,
    draft,
    topGrantName: topGrant.name,
    topGrantFunder: topGrant.funder,
  });
});

export default router;
