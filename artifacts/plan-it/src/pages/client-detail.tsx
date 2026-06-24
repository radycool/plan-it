import { useGetClient, getGetClientQueryKey, useGetClientSummary, getGetClientSummaryQueryKey, useCreateShareLink } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getPlatformIcon } from "@/components/platform-icon";
import { Share2, ArrowLeft, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { NewAccountDialog } from "@/components/new-account-dialog";

export default function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const { toast } = useToast();

  const { data: client, isLoading: isClientLoading } = useGetClient(clientId || "", {
    query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId || "") }
  });

  const { data: summary, isLoading: isSummaryLoading } = useGetClientSummary(clientId || "", {
    query: { enabled: !!clientId, queryKey: getGetClientSummaryQueryKey(clientId || "") }
  });

  const createShareLink = useCreateShareLink();

  const handleShare = () => {
    if (!clientId) return;
    createShareLink.mutate(
      { data: { clientId } },
      {
        onSuccess: (data) => {
          navigator.clipboard.writeText(data.url);
          toast({
            title: "Link copied!",
            description: "Preview link has been copied to your clipboard.",
          });
        },
        onError: () => {
          toast({
            title: "Failed to create link",
            description: "Please try again later.",
            variant: "destructive",
          });
        }
      }
    );
  };

  if (isClientLoading || isSummaryLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!client) return <AppLayout><div>Client not found</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-4 text-muted-foreground">
          <Link href="/clients" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft size={16} />
            <span>Back to Clients</span>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {client.logoUrl ? (
              <img src={client.logoUrl} alt={client.name} className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-secondary flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {client.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">{client.name}</h1>
              <p className="text-muted-foreground">Manage social accounts and content</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2" onClick={handleShare}>
              <Share2 size={16} />
              <span>Share Link</span>
            </Button>
            <NewAccountDialog clientId={client.id}>
              <Button className="gap-2">
                <Plus size={16} />
                <span>Add Account</span>
              </Button>
            </NewAccountDialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary?.totalPosts || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-500">{summary?.byStatus?.PENDING_APPROVAL || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Needs Changes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{summary?.byStatus?.CHANGES_REQUESTED || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">{summary?.byStatus?.APPROVED || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Accounts */}
        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold">Social Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {client.socialAccounts?.map((account) => {
              const Icon = getPlatformIcon(account.platform);
              
              const platformColor = 
                account.platform === "INSTAGRAM" ? "text-pink-500" :
                account.platform === "LINKEDIN" ? "text-blue-500" :
                account.platform === "TIKTOK" ? "text-foreground" :
                "text-blue-600";

              return (
                <Link key={account.id} href={`/clients/${client.id}/accounts/${account.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/50 cursor-pointer transition-colors group">
                    <div className="flex items-center gap-4">
                      {account.avatarUrl ? (
                        <img src={account.avatarUrl} alt={account.handle} className="h-12 w-12 rounded-full" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                          <Icon className={`text-xl ${platformColor}`} />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold group-hover:text-primary transition-colors">{account.handle}</h3>
                          <Icon className={`text-xs ${platformColor}`} />
                        </div>
                        <p className="text-sm text-muted-foreground">{account.platform}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <div>{account.postCount || 0} Posts</div>
                      {!!account.pendingCount && (
                        <div className="text-amber-500 font-medium">{account.pendingCount} Pending</div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
            
            {!client.socialAccounts?.length && (
              <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
                No social accounts linked yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
