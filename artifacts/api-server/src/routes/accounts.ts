import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, socialAccountsTable } from "@workspace/db";
import { CreateAccountParams, CreateAccountBody } from "@workspace/api-zod";
import { requireAuth } from "./users";

const router: IRouter = Router();

router.post("/clients/:clientId/accounts", requireAuth, async (req: any, res): Promise<void> => {
  const params = CreateAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, req.clerkUserId));

  if (!user || (user.role !== "TEAM_ADMIN" && user.role !== "TEAM_EDITOR")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [account] = await db
    .insert(socialAccountsTable)
    .values({
      clientId: params.data.clientId,
      platform: parsed.data.platform,
      handle: parsed.data.handle,
      avatarUrl: parsed.data.avatarUrl ?? null,
    })
    .returning();

  res.status(201).json({
    id: account.id,
    clientId: account.clientId,
    platform: account.platform,
    handle: account.handle,
    avatarUrl: account.avatarUrl,
    createdAt: account.createdAt.toISOString(),
    postCount: 0,
    pendingCount: 0,
  });
});

export default router;
