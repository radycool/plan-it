import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const postTypeEnum = pgEnum("post_type", ["SINGLE", "CAROUSEL", "REEL", "STORY"]);
export const postStatusEnum = pgEnum("post_status", [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "CHANGES_REQUESTED",
  "SCHEDULED",
  "PUBLISHED",
]);
export const mediaTypeEnum = pgEnum("media_type", ["IMAGE", "VIDEO"]);

export const postsTable = pgTable("posts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  socialAccountId: text("social_account_id").notNull(),
  type: postTypeEnum("type").notNull(),
  caption: text("caption"),
  status: postStatusEnum("status").notNull().default("DRAFT"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  createdById: text("created_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const postMediaTable = pgTable("post_media", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text("post_id").notNull(),
  mediaUrl: text("media_url").notNull(),
  mediaType: mediaTypeEnum("media_type").notNull(),
  orderIndex: text("order_index").notNull().default("0"),
});

export const commentsTable = pgTable("comments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  postId: text("post_id").notNull(),
  userId: text("user_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shareLinksTable = pgTable("share_links", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  token: text("token").notNull().unique().$defaultFn(() => crypto.randomUUID()),
  clientId: text("client_id").notNull(),
  socialAccountId: text("social_account_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;

export const insertPostMediaSchema = createInsertSchema(postMediaTable).omit({ id: true });
export type InsertPostMedia = z.infer<typeof insertPostMediaSchema>;
export type PostMedia = typeof postMediaTable.$inferSelect;

export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, createdAt: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof commentsTable.$inferSelect;

export const insertShareLinkSchema = createInsertSchema(shareLinksTable).omit({ id: true, token: true, createdAt: true });
export type InsertShareLink = z.infer<typeof insertShareLinkSchema>;
export type ShareLink = typeof shareLinksTable.$inferSelect;
