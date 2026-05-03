import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
import { db, grantsTable, matchesTable } from "@workspace/db";
import { GetGrantParams, ListGrantsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/grants", async (req, res): Promise<void> => {
  const params = ListGrantsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(grantsTable).$dynamic();

  if (params.data.focusArea) {
    query = query.where(eq(grantsTable.focusArea, params.data.focusArea));
  } else if (params.data.location) {
    query = query.where(
      or(
        eq(grantsTable.location, params.data.location),
        eq(grantsTable.location, "National"),
      ),
    );
  } else if (params.data.search) {
    const searchTerm = `%${params.data.search}%`;
    query = query.where(
      or(
        ilike(grantsTable.name, searchTerm),
        ilike(grantsTable.funder, searchTerm),
        ilike(grantsTable.description, searchTerm),
        ilike(grantsTable.focusArea, searchTerm),
      ),
    );
  }

  const grants = await query.orderBy(grantsTable.createdAt);
  res.json(grants);
});

router.get("/grants/stats/summary", async (_req, res): Promise<void> => {
  const grants = await db.select().from(grantsTable);

  const totalGrants = grants.length;
  const totalFunding = grants.reduce((sum, g) => sum + (g.amount ?? 0), 0);

  const focusAreaMap = new Map<string, number>();
  for (const grant of grants) {
    focusAreaMap.set(
      grant.focusArea,
      (focusAreaMap.get(grant.focusArea) ?? 0) + 1,
    );
  }

  const byFocusArea = Array.from(focusAreaMap.entries()).map(
    ([focusArea, count]) => ({ focusArea, count }),
  );

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = grants.filter((g) => {
    if (!g.deadline) return false;
    const deadline = new Date(g.deadline);
    return deadline >= now && deadline <= thirtyDaysFromNow;
  }).length;

  res.json({ totalGrants, totalFunding, byFocusArea, upcomingDeadlines });
});

router.get("/grants/:id", async (req, res): Promise<void> => {
  const params = GetGrantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [grant] = await db
    .select()
    .from(grantsTable)
    .where(eq(grantsTable.id, params.data.id));

  if (!grant) {
    res.status(404).json({ error: "Grant not found" });
    return;
  }

  res.json(grant);
});

export default router;
