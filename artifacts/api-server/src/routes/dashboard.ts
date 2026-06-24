import { Router, type IRouter } from "express";
import { eq, count, desc, sql } from "drizzle-orm";
import { db, usersTable, clientsTable, socialAccountsTable, postsTable } from "@workspace/db";
import { requireAuth } from "./users";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (req: any, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, req.clerkUserId));

  if (!user || !user.orgId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const clients = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(eq(clientsTable.orgId, user.orgId));

  const clientIds = clients.map((c) => c.id);

  if (clientIds.length === 0) {
    res.json({
      totalClients: 0,
      totalPosts: 0,
      pendingApproval: 0,
      approved: 0,
      changesRequested: 0,
      recentActivity: [],
    });
    return;
  }

  const accounts = await db
    .select({ id: socialAccountsTable.id, platform: socialAccountsTable.platform, handle: socialAccountsTable.handle, clientId: socialAccountsTable.clientId })
    .from(socialAccountsTable)
    .where(sql`${socialAccountsTable.clientId} IN (${sql.join(clientIds.map((id) => sql`${id}`), sql`, `)})`);

  const accountIds = accounts.map((a) => a.id);

  if (accountIds.length === 0) {
    res.json({
      totalClients: clients.length,
      totalPosts: 0,
      pendingApproval: 0,
      approved: 0,
      changesRequested: 0,
      recentActivity: [],
    });
    return;
  }

  const allPosts = await db
    .select()
    .from(postsTable)
    .where(sql`${postsTable.socialAccountId} IN (${sql.join(accountIds.map((id) => sql`${id}`), sql`, `)})`)
    .orderBy(desc(postsTable.updatedAt));

  const totalPosts = allPosts.length;
  const pendingApproval = allPosts.filter((p) => p.status === "PENDING_APPROVAL").length;
  const approved = allPosts.filter((p) => p.status === "APPROVED").length;
  const changesRequested = allPosts.filter((p) => p.status === "CHANGES_REQUESTED").length;

  const recentActivity = allPosts.slice(0, 10).map((p) => {
    const acct = accounts.find((a) => a.id === p.socialAccountId);
    const clientForAcct = acct ? clients.find((c) => c.id === acct.clientId) : null;
    return {
      postId: p.id,
      clientName: clientForAcct ? (clients as any[]).find((c: any) => c.id === clientForAcct?.id)?.name ?? "" : "",
      accountHandle: acct?.handle ?? "",
      platform: acct?.platform ?? "",
      status: p.status,
      updatedAt: p.updatedAt.toISOString(),
    };
  });

  // Get client names for recentActivity
  const fullClients = await db
    .select()
    .from(clientsTable)
    .where(sql`${clientsTable.id} IN (${sql.join(clientIds.map((id) => sql`${id}`), sql`, `)})`);

  const activity = allPosts.slice(0, 10).map((p) => {
    const acct = accounts.find((a) => a.id === p.socialAccountId);
    const client = acct ? fullClients.find((c) => c.id === acct.clientId) : null;
    return {
      postId: p.id,
      clientName: client?.name ?? "",
      accountHandle: acct?.handle ?? "",
      platform: acct?.platform ?? "",
      status: p.status,
      updatedAt: p.updatedAt.toISOString(),
    };
  });

  res.json({
    totalClients: clients.length,
    totalPosts,
    pendingApproval,
    approved,
    changesRequested,
    recentActivity: activity,
  });
});

export default router;
