import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Post, PostStatus, useUpdatePostStatus, useAddComment, getListPostsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { NewPostDialog } from "@/components/new-post-dialog";
import { LinkedInIcon } from "@/components/platform-icon";
import {
  ThumbsUp, MessageSquare, Repeat2, Send as SendIcon,
  Check, X, Send, Image as ImageIcon, MoreHorizontal, Plus,
  Briefcase, MapPin
} from "lucide-react";

interface Account {
  id: string;
  handle: string;
  platform: string;
  avatarUrl?: string | null;
  postCount?: number;
  pendingCount?: number;
}

interface LinkedInFeedProps {
  account: Account;
  posts: Post[];
  accountId: string;
  readOnly?: boolean;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500/80",
  PENDING_APPROVAL: "bg-amber-500/90",
  APPROVED: "bg-green-500/90",
  CHANGES_REQUESTED: "bg-red-500/90",
  SCHEDULED: "bg-blue-500/90",
  PUBLISHED: "bg-purple-500/90",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes Requested",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
};

function LinkedInPostCard({
  post,
  account,
  readOnly,
}: {
  post: Post;
  account: Account;
  readOnly?: boolean;
}) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateStatus = useUpdatePostStatus();
  const addComment = useAddComment();

  const handleStatusUpdate = (status: PostStatus) => {
    updateStatus.mutate(
      { postId: post.id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: "Status updated" });
          queryClient.invalidateQueries({ queryKey: getListPostsQueryKey(account.id) });
        },
        onError: () => toast({ title: "Failed to update", variant: "destructive" }),
      }
    );
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment.mutate(
      { postId: post.id, data: { body: newComment } },
      {
        onSuccess: () => {
          setNewComment("");
          queryClient.invalidateQueries({ queryKey: getListPostsQueryKey(account.id) });
        },
      }
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Post header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="relative">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
              {account.avatarUrl ? (
                <img src={account.avatarUrl} alt={account.handle} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">{account.handle[0]?.toUpperCase()}</span>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{account.handle}</span>
              <span className="text-xs text-muted-foreground">• 1st</span>
            </div>
            <p className="text-xs text-muted-foreground">Content Creator · Draft Preview</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              {" · "}
              <LinkedInIcon className="inline-block w-3 h-3" />
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-[10px] text-white border-0 ${statusColors[post.status]}`}>
            {statusLabels[post.status]}
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreHorizontal size={16} />
          </Button>
        </div>
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-4 pb-3 text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
          {post.caption}
        </div>
      )}

      {/* Media — LinkedIn uses ~16:9 or wider */}
      {post.media && post.media.length > 0 && (
        <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
          {post.media[0].mediaType === "VIDEO" ? (
            <video src={post.media[0].mediaUrl} controls className="w-full h-full object-contain" />
          ) : (
            <img src={post.media[0].mediaUrl} alt="Post media" className="w-full h-full object-cover" />
          )}
        </div>
      )}

      {/* Reaction counts */}
      <div className="px-4 py-2 flex items-center justify-between text-xs text-muted-foreground border-b border-border">
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-0.5 bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">
            <ThumbsUp size={8} /> Like
          </span>
          <span>—</span>
        </div>
        <div className="flex gap-3">
          <span>{post.comments?.length || 0} comments</span>
          <span>— reposts</span>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-2 py-1 flex justify-around text-muted-foreground border-b border-border">
        {[
          { icon: <ThumbsUp size={16} />, label: "Like" },
          { icon: <MessageSquare size={16} />, label: "Comment", onClick: () => setShowComments(!showComments) },
          { icon: <Repeat2 size={16} />, label: "Repost" },
          { icon: <SendIcon size={16} />, label: "Send" },
        ].map(({ icon, label, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            className="flex items-center gap-1.5 py-2 px-3 rounded hover:bg-secondary/50 transition-colors text-xs font-medium"
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Approval actions */}
      {!readOnly && (
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {post.status === "PENDING_APPROVAL" && (
            <>
              <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 gap-1" onClick={() => handleStatusUpdate("CHANGES_REQUESTED" as PostStatus)}>
                <X size={14} /> Request Changes
              </Button>
              <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white gap-1" onClick={() => handleStatusUpdate("APPROVED" as PostStatus)}>
                <Check size={14} /> Approve
              </Button>
            </>
          )}
          {post.status === "DRAFT" && (
            <Button size="sm" onClick={() => handleStatusUpdate("PENDING_APPROVAL" as PostStatus)}>
              Submit for Approval
            </Button>
          )}
        </div>
      )}

      {/* Comments section */}
      {showComments && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          {post.comments?.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                {(c.userName ?? c.userEmail ?? "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 bg-secondary/50 rounded-lg p-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold">{c.userName || c.userEmail}</span>
                  <span className="text-xs text-muted-foreground">{format(new Date(c.createdAt), "MMM d")}</span>
                </div>
                <p className="text-sm text-foreground/80">{c.body}</p>
              </div>
            </div>
          ))}
          {!post.comments?.length && (
            <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
          )}
          <div className="flex gap-2 pt-1">
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
              {account.handle[0]?.toUpperCase() ?? "?"}
            </div>
            <Textarea
              placeholder="Add a comment..."
              className="min-h-[60px] resize-none text-sm"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <Button size="icon" className="shrink-0 self-end" onClick={handleAddComment} disabled={addComment.isPending}>
              <Send size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LinkedInFeed({ account, posts, accountId, readOnly }: LinkedInFeedProps) {
  return (
    <div className="max-w-[600px] mx-auto space-y-4">
      {/* LinkedIn Profile card */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500" />

        {/* Avatar + info */}
        <div className="px-5 pb-5 -mt-10">
          <div className="flex items-end justify-between mb-3">
            <div className="h-20 w-20 rounded-full border-4 border-card bg-secondary flex items-center justify-center overflow-hidden">
              {account.avatarUrl ? (
                <img src={account.avatarUrl} alt={account.handle} className="w-full h-full object-cover" />
              ) : (
                <LinkedInIcon className="text-3xl text-blue-400" />
              )}
            </div>
            <div className="flex gap-2 mt-2">
              {!readOnly && (
                <NewPostDialog accountId={accountId}>
                  <Button size="sm" className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus size={14} /> New Post
                  </Button>
                </NewPostDialog>
              )}
            </div>
          </div>
          <h2 className="text-lg font-bold">{account.handle}</h2>
          <p className="text-sm text-muted-foreground">LinkedIn Profile · Draft Content Preview</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Briefcase size={12} />
            <span>Agency</span>
            <span>·</span>
            <MapPin size={12} />
            <span>Professional Network</span>
          </div>
          <div className="mt-2 text-xs text-blue-400 font-semibold">{posts.length} posts in draft</div>
        </div>
      </div>

      {/* Posts feed */}
      {posts.length === 0 ? (
        <div className="bg-card border border-border rounded-xl py-12 text-center text-muted-foreground">
          <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No posts yet</p>
          {!readOnly && (
            <NewPostDialog accountId={accountId}>
              <Button variant="outline" size="sm" className="mt-3">Create first post</Button>
            </NewPostDialog>
          )}
        </div>
      ) : (
        posts.map((post) => (
          <LinkedInPostCard key={post.id} post={post} account={account} readOnly={readOnly} />
        ))
      )}
    </div>
  );
}
