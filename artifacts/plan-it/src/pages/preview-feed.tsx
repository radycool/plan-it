import { useGetPreview, getGetPreviewQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/post-card";
import { getPlatformIcon } from "@/components/platform-icon";

export default function PreviewFeed() {
  const { token } = useParams<{ token: string }>();

  const { data: preview, isLoading } = useGetPreview(token || "", {
    query: { enabled: !!token, queryKey: getGetPreviewQueryKey(token || "") }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8 max-w-4xl mx-auto space-y-8">
        <Skeleton className="h-16 w-64" />
        <Skeleton className="h-[500px] max-w-lg mx-auto rounded-xl" />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invalid or Expired Link</h1>
          <p className="text-muted-foreground mt-2">This preview link is no longer active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          {preview.client.logoUrl ? (
            <img src={preview.client.logoUrl} alt={preview.client.name} className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center font-bold text-muted-foreground">
              {preview.client.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-display font-bold text-lg leading-tight">{preview.client.name}</h1>
            <p className="text-xs text-muted-foreground">Content Preview</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-12">
        {preview.accounts.map((accountData) => (
          <div key={accountData.account.id} className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-border">
              {(() => { const Icon = getPlatformIcon(accountData.account.platform); const cls = accountData.account.platform === "INSTAGRAM" ? "text-pink-500" : accountData.account.platform === "LINKEDIN" ? "text-blue-500" : accountData.account.platform === "TIKTOK" ? "text-foreground" : "text-blue-600"; return <Icon className={cls} />; })()}
              <h2 className="text-xl font-semibold">{accountData.account.handle}</h2>
            </div>
            
            <div className="grid gap-8 max-w-lg mx-auto">
              {accountData.posts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  platform={accountData.account.platform} 
                  readOnly 
                />
              ))}
              {!accountData.posts.length && (
                <div className="text-center text-muted-foreground p-8 border border-dashed border-border rounded-xl">
                  No posts pending review for this account.
                </div>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
