import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, matchesTable, grantsTable, usersTable } from "@workspace/db";
import { ListMatchesQueryParams, GenerateMatchesBody } from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

router.get("/matches", async (req, res): Promise<void> => {
  const params = ListMatchesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const matches = await db
    .select({
      userId: matchesTable.userId,
      grantId: matchesTable.grantId,
      fitScore: matchesTable.fitScore,
      winProbability: matchesTable.winProbability,
      reasoning: matchesTable.reasoning,
      createdAt: matchesTable.createdAt,
      grant: grantsTable,
    })
    .from(matchesTable)
    .innerJoin(grantsTable, eq(matchesTable.grantId, grantsTable.id))
    .where(eq(matchesTable.userId, params.data.userId))
    .orderBy(desc(matchesTable.fitScore));

  res.json(matches);
});

router.post("/matches/generate", async (req, res): Promise<void> => {
  const parsed = GenerateMatchesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const grants = await db.select().from(grantsTable);

  const prompt = `You are a grant matching expert. Given an organization's profile and a list of grants, identify the top 12 best-matching grants and score them.

Organization Profile:
- Name: ${user.orgName}
- Type: ${user.orgType}
- Mission: ${user.mission}
- Location: ${user.location}
- Focus Areas: ${user.focusAreas}
- Funding Need: ${user.fundingNeed ? `$${user.fundingNeed.toLocaleString()}` : "Not specified"}

Available Grants:
${grants.map((g) => `ID ${g.id}: ${g.name} by ${g.funder} — ${g.focusArea} — ${g.location} — $${g.amount?.toLocaleString() ?? "varies"} — ${g.eligibility}`).join("\n")}

Return a JSON array of the top 12 matching grants in this EXACT format (no other text):
[{"grantId": <number>, "fitScore": <60-99>, "winProbability": <5-45>, "reasoning": "<2-3 sentence explanation of why this grant fits the organization>"}]

Scoring rules:
- fitScore (60-99): How well the organization's mission, location, and focus areas match the grant requirements
- winProbability (5-45): Realistic probability of winning this grant, considering competition level, organization fit, and typical success rates for this funder. Most grants have 5-20% acceptance rates.
- reasoning: Specific, actionable explanation referencing the organization's actual mission and the grant's specific requirements

Return ONLY the JSON array.`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    res.status(500).json({ error: "AI returned unexpected response" });
    return;
  }

  let matchData: Array<{
    grantId: number;
    fitScore: number;
    winProbability: number;
    reasoning: string;
  }>;
  try {
    const jsonText = content.text.trim();
    const startIdx = jsonText.indexOf("[");
    const endIdx = jsonText.lastIndexOf("]");
    matchData = JSON.parse(jsonText.slice(startIdx, endIdx + 1));
  } catch {
    res.status(500).json({ error: "Failed to parse AI response" });
    return;
  }

  await db.delete(matchesTable).where(eq(matchesTable.userId, userId));

  const insertedMatches = await db
    .insert(matchesTable)
    .values(
      matchData.map((m) => ({
        userId,
        grantId: m.grantId,
        fitScore: m.fitScore,
        winProbability: m.winProbability ?? null,
        reasoning: m.reasoning,
      })),
    )
    .returning();

  const matchesWithGrants = await Promise.all(
    insertedMatches.map(async (match) => {
      const [grant] = await db
        .select()
        .from(grantsTable)
        .where(eq(grantsTable.id, match.grantId));
      return { ...match, grant };
    }),
  );

  res.json(matchesWithGrants.sort((a, b) => b.fitScore - a.fitScore));
});

export default router;
