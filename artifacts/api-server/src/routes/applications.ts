import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, applicationsTable, grantsTable, usersTable } from "@workspace/db";
import {
  ListApplicationsQueryParams,
  CreateApplicationBody,
  GetApplicationParams,
  UpdateApplicationParams,
  UpdateApplicationBody,
  DeleteApplicationParams,
  GenerateApplicationDraftParams,
} from "@workspace/api-zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { z } from "zod";

const router: IRouter = Router();

router.get("/applications", async (req, res): Promise<void> => {
  const params = ListApplicationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const applications = await db
    .select({
      id: applicationsTable.id,
      userId: applicationsTable.userId,
      grantId: applicationsTable.grantId,
      draftText: applicationsTable.draftText,
      status: applicationsTable.status,
      createdAt: applicationsTable.createdAt,
      updatedAt: applicationsTable.updatedAt,
      grant: grantsTable,
    })
    .from(applicationsTable)
    .innerJoin(grantsTable, eq(applicationsTable.grantId, grantsTable.id))
    .where(eq(applicationsTable.userId, params.data.userId))
    .orderBy(applicationsTable.createdAt);

  res.json(applications);
});

router.post("/applications", async (req, res): Promise<void> => {
  const parsed = CreateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [application] = await db
    .insert(applicationsTable)
    .values({
      userId: parsed.data.userId,
      grantId: parsed.data.grantId,
      status: parsed.data.status ?? "draft",
      draftText: parsed.data.draftText ?? null,
    })
    .returning();

  res.status(201).json(application);
});

router.get("/applications/:id", async (req, res): Promise<void> => {
  const params = GetApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: applicationsTable.id,
      userId: applicationsTable.userId,
      grantId: applicationsTable.grantId,
      draftText: applicationsTable.draftText,
      status: applicationsTable.status,
      createdAt: applicationsTable.createdAt,
      updatedAt: applicationsTable.updatedAt,
      grant: grantsTable,
    })
    .from(applicationsTable)
    .innerJoin(grantsTable, eq(applicationsTable.grantId, grantsTable.id))
    .where(eq(applicationsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  res.json(row);
});

router.patch("/applications/:id", async (req, res): Promise<void> => {
  const params = UpdateApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.draftText !== undefined) updateData.draftText = parsed.data.draftText;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;

  const [application] = await db
    .update(applicationsTable)
    .set(updateData)
    .where(eq(applicationsTable.id, params.data.id))
    .returning();

  if (!application) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  res.json(application);
});

router.delete("/applications/:id", async (req, res): Promise<void> => {
  const params = DeleteApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [application] = await db
    .delete(applicationsTable)
    .where(eq(applicationsTable.id, params.data.id))
    .returning();

  if (!application) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/applications/:id/generate", async (req, res): Promise<void> => {
  const params = GenerateApplicationDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      application: applicationsTable,
      grant: grantsTable,
      user: usersTable,
    })
    .from(applicationsTable)
    .innerJoin(grantsTable, eq(applicationsTable.grantId, grantsTable.id))
    .innerJoin(usersTable, eq(applicationsTable.userId, usersTable.id))
    .where(eq(applicationsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const { application, grant, user } = row;

  const prompt = `Write a compelling, professional grant application letter for the following:

Organization: ${user.orgName}
Organization Type: ${user.orgType}
Mission: ${user.mission}
Location: ${user.location}
Focus Areas: ${user.focusAreas}
Funding Need: ${user.fundingNeed ? `$${user.fundingNeed.toLocaleString()}` : "Not specified"}

Grant: ${grant.name}
Funder: ${grant.funder}
Amount: ${grant.amount ? `$${grant.amount.toLocaleString()}` : "Varies"}
Focus Area: ${grant.focusArea}
Eligibility: ${grant.eligibility}
Description: ${grant.description}

Write a 4-6 paragraph grant application letter that:
1. Opens with a compelling hook about the specific problem your organization solves
2. Clearly explains the specific project or program that needs funding with concrete details
3. Demonstrates deep alignment between the organization's work and the grant's focus areas
4. Describes expected outcomes and measurable impact with specific numbers
5. Closes with a strong, confident call to action referencing the funder by name

Write in a professional, confident tone. Use specific numbers, impact metrics, and program names. Do not use placeholder text — write a complete, ready-to-submit draft. Start directly with the letter content, no subject lines or headers.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let fullDraft = "";

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullDraft += event.delta.text;
      res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
    }
  }

  await db
    .update(applicationsTable)
    .set({ draftText: fullDraft, status: "in-progress" })
    .where(eq(applicationsTable.id, params.data.id));

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

const RewriteBodySchema = z.object({
  selectedText: z.string().min(1),
  instruction: z.string().min(1),
});

router.post("/applications/:id/rewrite", async (req, res): Promise<void> => {
  const params = GenerateApplicationDraftParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = RewriteBodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [row] = await db
    .select({ grant: grantsTable, user: usersTable })
    .from(applicationsTable)
    .innerJoin(grantsTable, eq(applicationsTable.grantId, grantsTable.id))
    .innerJoin(usersTable, eq(applicationsTable.userId, usersTable.id))
    .where(eq(applicationsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const { grant, user } = row;

  const instructionMap: Record<string, string> = {
    "more compelling": "Rewrite this passage to be more emotionally compelling, urgent, and persuasive. Use vivid language and stronger impact statements.",
    "more concise": "Rewrite this passage to be more concise and punchy. Remove redundancy while keeping all key points.",
    "more specific": "Rewrite this passage to be more specific with concrete details, numbers, and metrics where possible.",
    "more formal": "Rewrite this passage in a more formal, professional tone appropriate for institutional funders.",
    "stronger opening": "Rewrite this passage with a much stronger, hook-driven opening that immediately grabs the reader.",
  };

  const expandedInstruction = instructionMap[body.data.instruction] || body.data.instruction;

  const prompt = `You are an expert grant writer. Rewrite the following selected passage from a grant application according to the instruction. Only output the rewritten passage, nothing else.

Grant context:
- Funder: ${grant.funder}
- Grant: ${grant.name}
- Focus: ${grant.focusArea}
- Organization: ${user.orgName} — ${user.mission}

Instruction: ${expandedInstruction}

Original passage:
"""
${body.data.selectedText}
"""

Rewritten passage (output ONLY the replacement text, no explanation or preamble):`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
