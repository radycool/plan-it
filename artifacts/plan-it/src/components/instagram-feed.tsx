import { useState } from "react";
import { format } from "date-fns";
import { Post, PostStatus, useUpdatePostStatus, useAddComment, getListPostsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { NewPostDialog } from "@/components/new-post-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SiInstagram, SiTiktok, SiFacebook } from "react-icons/si";
import {
  Grid3X3, Play, Image as ImageIcon, MessageSquare, Check, X, Send,
  Heart, Bookmark, MoreHorizontal, Plus, ArrowLeft
} from "lucide-react";
import { getPlatformIcon } from "@/components/platform-icon";

interface Account {
  id: string;
  handle: string;
  platform: string;
  avatarUrl?: string | null;
  postCount?: number;
  pendingCount?: number;
}

interface InstagramFeedProps {
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
  PENDING_APPROVAL: "Pending",
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Changes",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
};

function PostDetailModal({
  post,
  account,
  open,
  onClose,
  readOnly,
}: {
  post: Post;
  account: Account;
  open: boolean;
  onClose: () => void;
  readOnly?: boolean;
}) {
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
          onClose();
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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-card border-border" aria-describedby={undefined}>
        <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
          {/* Media panel */}
          <div className="md:w-[55%] bg-black flex items-center justify-center min-h-[300px] md:min-h-[500px]">
            {post.media && post.media.length > 0 ? (
              post.media[0].mediaType === "VIDEO" ? (
                <video src={post.media[0].mediaUrl} controls className="w-full h-full object-contain max-h-[500px]" />
              ) : (
                <img src={post.media[0].mediaUrl} alt="Post" className="w-full h-full object-contain max-h-[500px]" />
              )
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon size={40} className="opacity-30" />
                <span className="text-sm">No media</span>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="md:w-[45%] flex flex-col border-l border-border">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                {account.avatarUrl ? (
                  <img src={account.avatarUrl} alt={account.handle} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-xs font-bold">{account.handle[0]?.toUpperCase() ?? "?"}</span>
                )}
              </div>
              <span className="font-semibold text-sm">{account.handle}</span>
              <Badge className={`ml-auto text-[10px] text-white border-0 ${statusColors[post.status]}`}>
                {statusLabels[post.status]}
              </Badge>
            </div>

            {/* Caption + comments */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {post.caption && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold">{account.handle[0]?.toUpperCase() ?? "?"}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold mr-1">{account.handle}</span>
                    <span className="text-foreground/80">{post.caption}</span>
                    <div className="text-xs text-muted-foreground mt-1">{format(new Date(post.createdAt), "MMM d, yyyy")}</div>
                  </div>
                </div>
              )}
              {post.comments?.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                    {(c.userName ?? c.userEmail ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold mr-1">{c.userName || c.userEmail}</span>
                    <span className="text-foreground/80">{c.body}</span>
                    <div className="text-xs text-muted-foreground mt-1">{format(new Date(c.createdAt), "MMM d")}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            {!readOnly && (
              <div className="border-t border-border p-4 space-y-3">
                {post.status === "PENDING_APPROVAL" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive/10 gap-1" onClick={() => handleStatusUpdate("CHANGES_REQUESTED" as PostStatus)}>
                      <X size={14} /> Request Changes
                    </Button>
                    <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-1" onClick={() => handleStatusUpdate("APPROVED" as PostStatus)}>
                      <Check size={14} /> Approve
                    </Button>
                  </div>
                )}
                {post.status === "DRAFT" && (
                  <Button size="sm" className="w-full" onClick={() => handleStatusUpdate("PENDING_APPROVAL" as PostStatus)}>
                    Submit for Approval
                  </Button>
                )}
                <div className="flex gap-2">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function InstagramFeed({ account, posts, accountId, readOnly }: InstagramFeedProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const PlatformIcon = getPlatformIcon(account.platform);

  const platformColor =
    account.platform === "INSTAGRAM" ? "from-purple-600 via-pink-500 to-orange-400" :
    account.platform === "TIKTOK" ? "from-gray-900 via-black to-gray-800" :
    "from-blue-600 to-blue-800";

  return (
    <div className="max-w-[470px] mx-auto">
      {/* Profile header — Instagram-style */}
      <div className="pb-6 border-b border-border mb-6">
        <div className="flex items-start gap-8">
          {/* Avatar with gradient ring */}
          <div className={`p-[2px] rounded-full bg-gradient-to-tr ${platformColor} shrink-0`}>
            <div className="bg-background rounded-full p-[2px]">
              {account.avatarUrl ? (
                <img src={account.avatarUrl} alt={account.handle} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                  <PlatformIcon className="text-3xl text-muted-foreground opacity-60" />
                </div>
              )}
            </div>
          </div>

          {/* Profile info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h2 className="text-xl font-semibold">{account.handle}</h2>
              {!readOnly && (
                <NewPostDialog accountId={accountId}>
                  <Button size="sm" variant="outline" className="gap-1 h-8 text-xs">
                    <Plus size={12} /> New Post
                  </Button>
                </NewPostDialog>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-6 mb-3 text-sm">
              <div className="text-center">
                <span className="font-semibold block">{posts.length}</span>
                <span className="text-muted-foreground text-xs">posts</span>
              </div>
              <div className="text-center">
                <span className="font-semibold block">—</span>
                <span className="text-muted-foreground text-xs">followers</span>
              </div>
              <div className="text-center">
                <span className="font-semibold block">—</span>
                <span className="text-muted-foreground text-xs">following</span>
              </div>
            </div>

            {/* Bio placeholder */}
            <div className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium block">{account.handle}</span>
              <span className="text-muted-foreground text-xs">Draft content preview</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid tabs bar */}
      <div className="flex justify-around border-b border-border mb-1">
        <button className="py-2 px-6 border-t-2 border-foreground flex items-center gap-1 text-sm font-medium">
          <Grid3X3 size={14} /> POSTS
        </button>
      </div>

      {/* 3-column grid */}
      {posts.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No posts yet</p>
          {!readOnly && (
            <NewPostDialog accountId={accountId}>
              <Button variant="outline" size="sm" className="mt-3">Upload first post</Button>
            </NewPostDialog>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[2px]">
          {posts.map((post) => (
            <button
              key={post.id}
              className="relative aspect-square group overflow-hidden bg-secondary"
              onClick={() => setSelectedPost(post)}
            >
              {/* Media thumbnail */}
              {post.media && post.media.length > 0 ? (
                post.media[0].mediaType === "VIDEO" ? (
                  <>
                    <video src={post.media[0].mediaUrl} className="w-full h-full object-cover" muted />
                    <Play size={16} className="absolute top-2 right-2 text-white drop-shadow" fill="white" />
                  </>
                ) : (
                  <img src={post.media[0].mediaUrl} alt="Post" className="w-full h-full object-cover" />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon size={24} className="text-muted-foreground opacity-40" />
                </div>
              )}

              {/* Carousel indicator */}
              {post.type === "CAROUSEL" && (
                <div className="absolute top-2 right-2">
                  <Grid3X3 size={14} className="text-white drop-shadow" />
                </div>
              )}

              {/* Status overlay on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Badge className={`text-[10px] text-white border-0 ${statusColors[post.status]}`}>
                  {statusLabels[post.status]}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Post detail modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          account={account}
          open={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
