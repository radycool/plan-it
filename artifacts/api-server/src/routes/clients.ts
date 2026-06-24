import { Router, type IRouter } from "express";
import { eq, count, and, sql } from "drizzle-orm";
import { db, usersTable, clientsTable, socialAccountsTable, postsTable } from "@workspace/db";
import {
  ListClientsResponse,
  GetClientParams,
  GetClientResponse,
  GetClientSummaryParams,
  GetClientSummaryResponse,
  CreateClientBody,
} from "@workspace/api-zod";
import { requireAuth } from "./users";

const router: IRouter = Router();

async function getTeamUser(clerkId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));
  return user;
}

router.get("/clients", requireAuth, async (req: any, res): Promise<void> => {
  const user = await getTeamUser(req.clerkUserId);
  if (!user || (user.role !== "TEAM_ADMIN" && user.role !== "TEAM_EDITOR")) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const clients = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.orgId, user.orgId!));

  const result = await Promise.all(
    clients.map(async (c) => {
      const accounts = await db
        .select({ id: socialAccountsTable.id })
        .from(socialAccountsTable)
        .where(eq(socialAccountsTable.clientId, c.id));

      const accountIds = accounts.map((a) => a.id);
      let pendingCount = 0;

      if (accountIds.length > 0) {
        const [{ cnt }] = await db
          .select({ cnt: count() })
          .from(postsTable)
          .where(
            and(
              sql`${postsTable.socialAccountId} = ANY(${sql`ARRAY[${sql.raw(accountIds.map(() => "?").join(","))}]`})`,
              eq(postsTable.status, "PENDING_APPROVAL"),
            ),
          );
        pendingCount = cnt;
      }

      return {
        id: c.id,
        name: c.name,
        logoUrl: c.logoUrl,
        orgId: c.orgId,
        createdAt: c.createdAt.toISOString(),
        accountCount: accounts.length,
        pendingCount,
      };
    }),
  );

  res.json(ListClientsResponse.parse(result));
});

router.post("/clients", requireAuth, async (req: any, res): Promise<void> => {
  const user = await getTeamUser(req.clerkUserId);
  if (!user || user.role !== "TEAM_ADMIN") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [client] = await db
    .insert(clientsTable)
    .values({ name: parsed.data.name, logoUrl: parsed.data.logoUrl ?? null, orgId: user.orgId! })
    .returning();

  res.status(201).json({
    id: client.id,
    name: client.name,
    logoUrl: client.logoUrl,
    orgId: client.orgId,
    createdAt: client.createdAt.toISOString(),
    accountCount: 0,
    pendingCount: 0,
  });
});

router.get("/clients/:clientId", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, params.data.clientId));

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const accounts = await db
    .select()
    .from(socialAccountsTable)
    .where(eq(socialAccountsTable.clientId, client.id));

  const accountsWithCounts = await Promise.all(
    accounts.map(async (a) => {
      const [{ postCnt }] = await db
        .select({ postCnt: count() })
        .from(postsTable)
        .where(eq(postsTable.socialAccountId, a.id));
      const [{ pendCnt }] = await db
        .select({ pendCnt: count() })
        .from(postsTable)
        .where(and(eq(postsTable.socialAccountId, a.id), eq(postsTable.status, "PENDING_APPROVAL")));
      return {
        id: a.id,
        clientId: a.clientId,
        platform: a.platform,
        handle: a.handle,
        avatarUrl: a.avatarUrl,
        createdAt: a.createdAt.toISOString(),
        postCount: postCnt,
        pendingCount: pendCnt,
      };
    }),
  );

  res.json(GetClientResponse.parse({
    id: client.id,
    name: client.name,
    logoUrl: client.logoUrl,
    orgId: client.orgId,
    createdAt: client.createdAt.toISOString(),
    socialAccounts: accountsWithCounts,
  }));
});

router.get("/clients/:clientId/summary", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetClientSummaryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const accounts = await db
    .select({ id: socialAccountsTable.id, platform: socialAccountsTable.platform })
    .from(socialAccountsTable)
    .where(eq(socialAccountsTable.clientId, params.data.clientId));

  if (accounts.length === 0) {
    res.json(GetClientSummaryResponse.parse({
      clientId: params.data.clientId,
      totalPosts: 0,
      byStatus: { DRAFT: 0, PENDING_APPROVAL: 0, APPROVED: 0, CHANGES_REQUESTED: 0, SCHEDULED: 0, PUBLISHED: 0 },
      byPlatform: { INSTAGRAM: 0, LINKEDIN: 0, TIKTOK: 0, FACEBOOK: 0 },
    }));
    return;
  }

  const allPosts = await db
    .select({ id: postsTable.id, status: postsTable.status, socialAccountId: postsTable.socialAccountId })
    .from(postsTable)
    .where(sql`${postsTable.socialAccountId} IN (${sql.join(accounts.map((a) => sql`${a.id}`), sql`, `)})`);

  const byStatus = { DRAFT: 0, PENDING_APPROVAL: 0, APPROVED: 0, CHANGES_REQUESTED: 0, SCHEDULED: 0, PUBLISHED: 0 } as Record<string, number>;
  const byPlatform = { INSTAGRAM: 0, LINKEDIN: 0, TIKTOK: 0, FACEBOOK: 0 } as Record<string, number>;

  for (const post of allPosts) {
    byStatus[post.status] = (byStatus[post.status] ?? 0) + 1;
    const acct = accounts.find((a) => a.id === post.socialAccountId);
    if (acct) byPlatform[acct.platform] = (byPlatform[acct.platform] ?? 0) + 1;
  }

  res.json(GetClientSummaryResponse.parse({
    clientId: params.data.clientId,
    totalPosts: allPosts.length,
    byStatus,
    byPlatform,
  }));
});

export default router;
