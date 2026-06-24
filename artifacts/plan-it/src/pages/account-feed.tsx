import { useListPosts, getListPostsQueryKey, useGetClient, getGetClientQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { InstagramFeed } from "@/components/instagram-feed";
import { LinkedInFeed } from "@/components/linkedin-feed";
import { getPlatformIcon } from "@/components/platform-icon";
import { NewPostDialog } from "@/components/new-post-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PostCard } from "@/components/post-card";

export default function AccountFeed() {
  const { clientId, accountId } = useParams<{ clientId: string; accountId: string }>();

  const { data: posts, isLoading: postsLoading } = useListPosts(accountId || "", {
    query: { enabled: !!accountId, queryKey: getListPostsQueryKey(accountId || "") },
  });

  const { data: client, isLoading: clientLoading } = useGetClient(clientId || "", {
    query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId || "") },
  });

  const account = client?.socialAccounts?.find((a) => a.id === accountId);
  const isLoading = postsLoading || clientLoading;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Back nav */}
        <div className="flex items-center gap-4 text-muted-foreground">
          <Link
            href={`/clients/${clientId}`}
            className="hover:text-foreground transition-colors flex items-center gap-1 text-sm"
          >
            <ArrowLeft size={15} />
            <span>Back to {client?.name || "Client"}</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-0.5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          </div>
        ) : account ? (
          <>
            {account.platform === "INSTAGRAM" || account.platform === "TIKTOK" || account.platform === "FACEBOOK" ? (
              <InstagramFeed
                account={account}
                posts={posts || []}
                accountId={accountId || ""}
              />
            ) : account.platform === "LINKEDIN" ? (
              <LinkedInFeed
                account={account}
                posts={posts || []}
                accountId={accountId || ""}
              />
            ) : (
              /* Fallback for any other platform */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">{account.handle}</h1>
                  <NewPostDialog accountId={accountId || ""}>
                    <Button className="gap-2">
                      <Plus size={16} /> New Post
                    </Button>
                  </NewPostDialog>
                </div>
                <div className="grid gap-6 max-w-lg mx-auto">
                  {(posts || []).map((post) => (
                    <PostCard key={post.id} post={post} platform={account.platform} />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-muted-foreground py-20">Account not found</div>
        )}
      </div>
    </AppLayout>
  );
}
