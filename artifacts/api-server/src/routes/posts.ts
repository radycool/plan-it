import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, usersTable, postsTable, postMediaTable, commentsTable, socialAccountsTable } from "@workspace/db";
import {
  ListPostsParams,
  CreatePostParams,
  CreatePostBody,
  GetPostParams,
  GetPostResponse,
  DeletePostParams,
  UpdatePostStatusParams,
  UpdatePostStatusBody,
  UpdatePostStatusResponse,
  AddCommentParams,
  AddCommentBody,
} from "@workspace/api-zod";
import { requireAuth } from "./users";

const router: IRouter = Router();

async function buildPost(postId: string) {
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
  if (!post) return null;

  const media = await db
    .select()
    .from(postMediaTable)
    .where(eq(postMediaTable.postId, post.id))
    .orderBy(asc(postMediaTable.orderIndex));

  const rawComments = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.postId, post.id))
    .orderBy(asc(commentsTable.createdAt));

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
}

router.get("/accounts/:accountId/posts", requireAuth, async (req: any, res): Promise<void> => {
  const params = ListPostsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const posts = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.socialAccountId, params.data.accountId))
    .orderBy(asc(postsTable.createdAt));

  const full = await Promise.all(posts.map((p) => buildPost(p.id)));
  res.json(full.filter(Boolean));
});

router.post("/accounts/:accountId/posts", requireAuth, async (req: any, res): Promise<void> => {
  const params = CreatePostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreatePostBody.safeParse(req.body);
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

  const [post] = await db
    .insert(postsTable)
    .values({
      socialAccountId: params.data.accountId,
      type: parsed.data.type,
      caption: parsed.data.caption ?? null,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
      createdById: user.id,
      status: "DRAFT",
    })
    .returning();

  for (let i = 0; i < parsed.data.media.length; i++) {
    const m = parsed.data.media[i];
    await db.insert(postMediaTable).values({
      postId: post.id,
      mediaUrl: m.url,
      mediaType: m.type,
      orderIndex: String(i),
    });
  }

  const full = await buildPost(post.id);
  res.status(201).json(full);
});

router.get("/posts/:postId", requireAuth, async (req: any, res): Promise<void> => {
  const params = GetPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const full = await buildPost(params.data.postId);
  if (!full) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(GetPostResponse.parse(full));
});

router.delete("/posts/:postId", requireAuth, async (req: any, res): Promise<void> => {
  const params = DeletePostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.postId, params.data.postId));
  await db.delete(postMediaTable).where(eq(postMediaTable.postId, params.data.postId));
  await db.delete(postsTable).where(eq(postsTable.id, params.data.postId));

  res.sendStatus(204);
});

router.patch("/posts/:postId/status", requireAuth, async (req: any, res): Promise<void> => {
  const params = UpdatePostStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePostStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db
    .update(postsTable)
    .set({ status: parsed.data.status })
    .where(eq(postsTable.id, params.data.postId));

  const full = await buildPost(params.data.postId);
  if (!full) {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json(UpdatePostStatusResponse.parse(full));
});

router.post("/posts/:postId/comments", requireAuth, async (req: any, res): Promise<void> => {
  const params = AddCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = AddCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, req.clerkUserId));

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const [comment] = await db
    .insert(commentsTable)
    .values({
      postId: params.data.postId,
      userId: user.id,
      body: parsed.data.body,
    })
    .returning();

  res.status(201).json({
    id: comment.id,
    postId: comment.postId,
    userId: comment.userId,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    userName: user.name ?? null,
    userEmail: user.email,
  });
});

export default router;
