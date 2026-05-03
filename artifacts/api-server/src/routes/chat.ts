import { Router, type IRouter } from "express";
import { db, usersTable, matchesTable, grantsTable } from "@workspace/db";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

router.post("/chat", async (req, res): Promise<void> => {
  const { userId, messages } = req.body as {
    userId?: number;
    messages?: ChatMessage[];
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  let profileContext = "";
  let matchContext = "";

  if (userId && !isNaN(userId)) {
    try {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      if (user) {
        profileContext = `
USER PROFILE:
- Organization: ${user.orgName}
- Type: ${user.orgType}
- Mission: ${user.mission}
- Location: ${user.location}
- Focus Areas: ${user.focusAreas}
- Annual Funding Need: ${user.fundingNeed ? `$${user.fundingNeed.toLocaleString()}` : "Not specified"}`;
      }

      const topMatches = await db
        .select({
          fitScore: matchesTable.fitScore,
          winProbability: matchesTable.winProbability,
          reasoning: matchesTable.reasoning,
          grantName: grantsTable.name,
          funder: grantsTable.funder,
          amount: grantsTable.amount,
          deadline: grantsTable.deadline,
          focusArea: grantsTable.focusArea,
        })
        .from(matchesTable)
        .innerJoin(grantsTable, eq(matchesTable.grantId, grantsTable.id))
        .where(eq(matchesTable.userId, userId))
        .orderBy(matchesTable.fitScore)
        .limit(5);

      if (topMatches.length > 0) {
        matchContext = `
TOP ${topMatches.length} MATCHED GRANTS:
${topMatches
  .map(
    (m, i) =>
      `${i + 1}. ${m.grantName} (${m.funder})
   - Fit Score: ${m.fitScore}/100 | Win Probability: ${m.winProbability}%
   - Amount: ${m.amount ? `$${m.amount.toLocaleString()}` : "Varies"}
   - Deadline: ${m.deadline ? new Date(m.deadline).toLocaleDateString() : "Rolling"}
   - Focus: ${m.focusArea}
   - Why it fits: ${m.reasoning}`,
  )
  .join("\n\n")}`;
      }
    } catch {
      // Non-fatal — continue without context
    }
  }

  const systemPrompt = `You are an expert grant officer with 20 years of experience helping nonprofits win funding. You are warm, direct, and deeply knowledgeable about the grant landscape.
${profileContext}
${matchContext}

INSTRUCTIONS:
- Be concise and actionable. Get to the point immediately.
- Use bullet points for clarity when listing multiple items.
- Reference specific grants by name when relevant.
- If you don't have enough context to answer specifically, ask a clarifying question.
- Keep responses under 200 words unless the user asks for detail.
- Format: use **bold** for grant names and key terms, use - for bullet points.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(
          `data: ${JSON.stringify({ content: event.delta.text })}\n\n`,
        );
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Chat streaming error");
    res.write(
      `data: ${JSON.stringify({ error: "I'm having trouble connecting right now. Please try again in a moment." })}\n\n`,
    );
    res.end();
  }
});

export default router;
