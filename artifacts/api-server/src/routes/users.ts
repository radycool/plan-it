import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable, orgsTable } from "@workspace/db";
import { GetMeResponse, SyncMeBody, SyncMeResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const requireAuth = (req: any, res: any, next: any) => {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.clerkUserId = userId;
  next();
};

router.get("/me", requireAuth, async (req: any, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, req.clerkUserId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(GetMeResponse.parse({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    role: user.role,
    orgId: user.orgId,
    clientId: user.clientId,
    createdAt: user.createdAt.toISOString(),
  }));
});

router.post("/me", requireAuth, async (req: any, res): Promise<void> => {
  const parsed = SyncMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const clerkId = req.clerkUserId;
  const { email, name, role } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId));

  if (existing) {
    const [updated] = await db
      .update(usersTable)
      .set({ email, name: name ?? existing.name })
      .where(eq(usersTable.clerkId, clerkId))
      .returning();

    res.json(SyncMeResponse.parse({
      id: updated.id,
      clerkId: updated.clerkId,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      orgId: updated.orgId,
      clientId: updated.clientId,
      createdAt: updated.createdAt.toISOString(),
    }));
    return;
  }

  // New user — create an org for them if they are team-level
  const userRole = role ?? "TEAM_ADMIN";
  let orgId: string | null = null;

  if (userRole === "TEAM_ADMIN" || userRole === "TEAM_EDITOR") {
    const [org] = await db
      .insert(orgsTable)
      .values({ name: `${name ?? email}'s Agency` })
      .returning();
    orgId = org.id;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      clerkId,
      email,
      name: name ?? null,
      role: userRole,
      orgId,
      clientId: null,
    })
    .returning();

  res.json(SyncMeResponse.parse({
    id: created.id,
    clerkId: created.clerkId,
    email: created.email,
    name: created.name,
    role: created.role,
    orgId: created.orgId,
    clientId: created.clientId,
    createdAt: created.createdAt.toISOString(),
  }));
});

export default router;
export { requireAuth };
