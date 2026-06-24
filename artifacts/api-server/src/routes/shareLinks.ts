import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, shareLinksTable, clientsTable, socialAccountsTable, postsTable, postMediaTable, commentsTable, usersTable } from "@workspace/db";
import {
  CreateShareLinkBody,
  GetPreviewParams,
} from "@workspace/api-zod";
import { requireAuth } from "./users";

const router: IRouter = Router();

router.post("/share-links", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = CreateShareLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [link] = await db
    .insert(shareLinksTable)
    .values({
      clientId: parsed.data.clientId,
      socialAccountId: parsed.data.socialAccountId ?? null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    })
    .returning();

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:80";

  res.status(201).json({
    id: link.id,
    token: link.token,
    clientId: link.clientId,
    socialAccountId: link.socialAccountId,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    createdAt: link.createdAt.toISOString(),
    url: `${baseUrl}/preview/${link.token}`,
  });
});

router.get("/preview/:token", async (req, res): Promise<void> => {
  const params = GetPreviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [link] = await db
    .select()
    .from(shareLinksTable)
    .where(eq(shareLinksTable.token, params.data.token));

  if (!link) {
    res.status(404).json({ error: "Share link not found" });
    return;
  }

  if (link.expiresAt && link.expiresAt < new Date()) {
    res.status(404).json({ error: "Share link has expired" });
    return;
  }

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.id, link.clientId));

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  let accounts = await db
    .select()
    .from(socialAccountsTable)
    .where(eq(socialAccountsTable.clientId, link.clientId));

  if (link.socialAccountId) {
    accounts = accounts.filter((a) => a.id === link.socialAccountId);
  }

  const accountsWithPosts = await Promise.all(
    accounts.map(async (account) => {
      const posts = await db
        .select()
        .from(postsTable)
        .where(eq(postsTable.socialAccountId, account.id));

      const fullPosts = await Promise.all(
        posts.map(async (post) => {
          const media = await db
            .select()
            .from(postMediaTable)
            .where(eq(postMediaTable.postId, post.id));

          const rawComments = await db
            .select()
            .from(commentsTable)
            .where(eq(commentsTable.postId, post.id));

          const commentUsers = await Promise.all(
            rawComments.map(async (c) => {
              const [user] = await db.select().from(usersTable).where(eq(usersTable.id, c.userId));
              return { ...c, user };
            }),
          );

          return {
            id: post.id,
            socialAccountId: post.socialAccountId,
            type: post.type,
            caption: post.caption,
            status: post.status,
            scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString() : null,
            createdById: post.createdById,
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString(),
            media: media.map((m) => ({
              id: m.id,
              postId: m.postId,
              mediaUrl: m.mediaUrl,
              mediaType: m.mediaType,
              orderIndex: parseInt(m.orderIndex, 10),
            })),
            comments: commentUsers.map((c) => ({
              id: c.id,
              postId: c.postId,
              userId: c.userId,
              body: c.body,
              createdAt: c.createdAt.toISOString(),
              userName: c.user?.name ?? null,
              userEmail: c.user?.email ?? "",
            })),
          };
        }),
      );

      return {
        account: {
          id: account.id,
          clientId: account.clientId,
          platform: account.platform,
          handle: account.handle,
          avatarUrl: account.avatarUrl,
          createdAt: account.createdAt.toISOString(),
          postCount: posts.length,
          pendingCount: posts.filter((p) => p.status === "PENDING_APPROVAL").length,
        },
        posts: fullPosts,
      };
    }),
  );

  res.json({
    client: {
      id: client.id,
      name: client.name,
      logoUrl: client.logoUrl,
      orgId: client.orgId,
      createdAt: client.createdAt.toISOString(),
      accountCount: accounts.length,
      pendingCount: 0,
    },
    accounts: accountsWithPosts,
  });
});

export default router;
