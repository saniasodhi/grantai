import { Router, type IRouter } from "express";
import { db, grantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

router.post("/battle", async (req, res): Promise<void> => {
  const { grantIds, userProfile } = req.body as {
    grantIds?: number[];
    userProfile?: { orgName?: string; mission?: string; focusArea?: string };
  };

  if (!grantIds || !Array.isArray(grantIds) || grantIds.length < 2 || grantIds.length > 3) {
    res.status(400).json({ error: "Provide 2 or 3 grant IDs to battle." });
    return;
  }

  const grants = await Promise.all(
    grantIds.map((id) => db.select().from(grantsTable).where(eq(grantsTable.id, id)).then((r) => r[0]))
  );

  const validGrants = grants.filter(Boolean);
  if (validGrants.length < 2) {
    res.status(400).json({ error: "Could not find the specified grants." });
    return;
  }

  const orgContext = userProfile?.mission
    ? `Organization: ${userProfile.orgName ?? "Unknown"}\nMission: ${userProfile.mission}\nFocus Area: ${userProfile.focusArea ?? "General"}`
    : "No specific organization profile provided — analyze grants on their general merit.";

  const prompt = `You are an expert grant strategist. Analyze these ${validGrants.length} grants head-to-head for the given organization and produce a competitive analysis.

${orgContext}

GRANTS TO BATTLE:
${validGrants.map((g, i) => `
GRANT ${i + 1}: ${g.name}
- Funder: ${g.funder}
- Amount: ${g.amount ? `$${g.amount.toLocaleString()}` : "Variable"}
- Focus Area: ${g.focusArea}
- Location: ${g.location}
- Eligibility: ${g.eligibility}
- Description: ${g.description}
`).join("\n")}

Return ONLY a JSON object with EXACTLY this structure:
{
  "grants": [
    {
      "grantId": <number>,
      "pros": ["<specific pro 1>", "<specific pro 2>", "<specific pro 3>"],
      "cons": ["<specific con 1>", "<specific con 2>"],
      "strengthScore": <integer 1-100>,
      "difficultyScore": <integer 1-100>,
      "timeToWrite": "<estimated hours, e.g. '4-6 hours'>"
    }
  ],
  "verdict": {
    "winnerId": <grantId of recommended grant>,
    "recommendation": "<2-sentence explanation of which to apply for first and why>",
    "strategy": "<1 sentence tactical tip for the application>"
  }
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    res.status(500).json({ error: "Unexpected AI response" });
    return;
  }

  let parsed: {
    grants: Array<{
      grantId: number;
      pros: string[];
      cons: string[];
      strengthScore: number;
      difficultyScore: number;
      timeToWrite: string;
    }>;
    verdict: {
      winnerId: number;
      recommendation: string;
      strategy: string;
    };
  };

  try {
    const text = content.text.trim();
    parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    res.status(500).json({ error: "Failed to parse AI analysis" });
    return;
  }

  res.json({
    grants: parsed.grants.map((g) => ({
      ...g,
      grant: validGrants.find((vg) => vg.id === g.grantId),
    })),
    verdict: parsed.verdict,
  });
});

export default router;
