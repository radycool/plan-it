import { useListPosts, getListPostsQueryKey, useGetClient, getGetClientQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { PostCard } from "@/components/post-card";
import { getPlatformIcon } from "@/components/platform-icon";
import { NewPostDialog } from "@/components/new-post-dialog";

export default function AccountFeed() {
  const { clientId, accountId } = useParams<{ clientId: string, accountId: string }>();

  const { data: posts, isLoading } = useListPosts(accountId || "", {
    query: { enabled: !!accountId, queryKey: getListPostsQueryKey(accountId || "") }
  });

  const { data: client } = useGetClient(clientId || "", {
    query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId || "") }
  });

  const account = client?.socialAccounts?.find(a => a.id === accountId);

  const PlatformIcon = account ? getPlatformIcon(account.platform) : null;

  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 text-muted-foreground">
          <Link href={`/clients/${clientId}`} className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft size={16} />
            <span>Back to Client</span>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {account?.avatarUrl ? (
              <img src={account.avatarUrl} alt={account.handle} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {PlatformIcon && <PlatformIcon className="text-3xl opacity-50" />}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">{account?.handle || "Loading..."}</h1>
              <p className="text-muted-foreground">{account?.platform}</p>
            </div>
          </div>
          <NewPostDialog accountId={accountId || ""}>
            <Button className="gap-2">
              <Plus size={16} />
              <span>New Post</span>
            </Button>
          </NewPostDialog>
        </div>

        <div className="space-y-6">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2].map(i => <Skeleton key={i} className="h-[500px] rounded-xl w-full max-w-lg mx-auto" />)}
            </div>
          ) : (
            <div className="grid gap-8 max-w-lg mx-auto">
              {posts?.map((post) => (
                <PostCard key={post.id} post={post} platform={account?.platform || "INSTAGRAM"} />
              ))}
              {!posts?.length && (
                <div className="p-12 text-center border border-dashed border-border rounded-xl">
                  <div className="text-muted-foreground mb-4">No posts yet</div>
                  <NewPostDialog accountId={accountId || ""}>
                    <Button variant="outline">Create your first post</Button>
                  </NewPostDialog>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
