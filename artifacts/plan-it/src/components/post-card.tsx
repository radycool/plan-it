import { useState } from "react";
import { format } from "date-fns";
import { 
  Post, 
  PostStatus, 
  SocialAccountPlatform, 
  useUpdatePostStatus,
  useAddComment
} from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Check, X, Send, Image as ImageIcon } from "lucide-react";
import { getPlatformIcon } from "@/components/platform-icon";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface PostCardProps {
  post: Post;
  platform: string;
  readOnly?: boolean;
}

export function PostCard({ post, platform, readOnly = false }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatus = useUpdatePostStatus();
  const addComment = useAddComment();

  const handleStatusUpdate = (status: PostStatus) => {
    updateStatus.mutate(
      { 
        postId: post.id, 
        data: { status } 
      },
      {
        onSuccess: () => {
          toast({ title: "Status updated" });
          queryClient.invalidateQueries({ queryKey: [`/api/accounts/${post.socialAccountId}/posts`] });
        },
        onError: () => {
          toast({ title: "Failed to update status", variant: "destructive" });
        }
      }
    );
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment.mutate(
      {
        postId: post.id,
        data: { body: newComment }
      },
      {
        onSuccess: () => {
          setNewComment("");
          queryClient.invalidateQueries({ queryKey: [`/api/accounts/${post.socialAccountId}/posts`] });
        }
      }
    );
  };

  const isSquare = platform === "INSTAGRAM" || platform === "TIKTOK";
  const aspectRatio = isSquare ? "aspect-square" : "aspect-video"; // approximate 16:10 with video

  const statusColors = {
    DRAFT: "bg-muted text-muted-foreground",
    PENDING_APPROVAL: "bg-amber-500/20 text-amber-500 border-amber-500/30",
    APPROVED: "bg-green-500/20 text-green-500 border-green-500/30",
    CHANGES_REQUESTED: "bg-destructive/20 text-destructive border-destructive/30",
    SCHEDULED: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    PUBLISHED: "bg-purple-500/20 text-purple-500 border-purple-500/30",
  };

  const PlatformIcon = getPlatformIcon(platform);

  return (
    <Card className="overflow-hidden border-border bg-card">
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 border-b border-border">
        <div className="flex items-center gap-2">
          <PlatformIcon className="text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {format(new Date(post.createdAt), "MMM d, yyyy")}
          </span>
        </div>
        <Badge variant="outline" className={statusColors[post.status]}>
          {post.status.replace("_", " ")}
        </Badge>
      </CardHeader>
      
      <div className={`w-full bg-secondary flex items-center justify-center overflow-hidden ${aspectRatio}`}>
        {post.media && post.media.length > 0 ? (
          post.media[0].mediaType === "IMAGE" ? (
            <img src={post.media[0].mediaUrl} alt="Post media" className="w-full h-full object-cover" />
          ) : (
            <video src={post.media[0].mediaUrl} controls className="w-full h-full object-cover" />
          )
        ) : (
          <div className="text-muted-foreground flex flex-col items-center">
            <ImageIcon size={32} className="mb-2 opacity-50" />
            <span>No media</span>
          </div>
        )}
      </div>

      <CardContent className="p-4 space-y-4">
        <div className="text-sm whitespace-pre-wrap">{post.caption || <span className="text-muted-foreground italic">No caption provided</span>}</div>
      </CardContent>

      <CardFooter className="p-4 border-t border-border flex flex-col gap-4">
        {!readOnly && (
          <div className="flex w-full items-center justify-between">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={() => setShowComments(!showComments)}>
              <MessageSquare size={16} />
              <span>{post.comments?.length || 0} Comments</span>
            </Button>

            <div className="flex items-center gap-2">
              {post.status === "PENDING_APPROVAL" && (
                <>
                  <Button size="sm" variant="outline" className="gap-1 border-destructive text-destructive hover:bg-destructive/10" onClick={() => handleStatusUpdate("CHANGES_REQUESTED" as PostStatus)}>
                    <X size={14} /> Request Changes
                  </Button>
                  <Button size="sm" className="gap-1 bg-green-500 hover:bg-green-600 text-white" onClick={() => handleStatusUpdate("APPROVED" as PostStatus)}>
                    <Check size={14} /> Approve
                  </Button>
                </>
              )}
              {post.status === "DRAFT" && (
                <Button size="sm" className="gap-1" onClick={() => handleStatusUpdate("PENDING_APPROVAL" as PostStatus)}>
                  Request Approval
                </Button>
              )}
            </div>
          </div>
        )}

        {showComments && (
          <div className="w-full space-y-4 pt-4 border-t border-border">
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {post.comments?.map((comment) => (
                <div key={comment.id} className="bg-secondary p-3 rounded-lg text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium">{comment.userName || comment.userEmail}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(comment.createdAt), "MMM d")}</span>
                  </div>
                  <p className="text-foreground/90">{comment.body}</p>
                </div>
              ))}
              {!post.comments?.length && (
                <div className="text-center text-sm text-muted-foreground py-2">No comments yet.</div>
              )}
            </div>
            {!readOnly && (
              <div className="flex gap-2">
                <Textarea 
                  placeholder="Add a comment..." 
                  className="min-h-[80px] resize-none"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button size="icon" className="shrink-0" onClick={handleAddComment} disabled={addComment.isPending}>
                  <Send size={16} />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
