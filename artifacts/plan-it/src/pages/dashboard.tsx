import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { AppLayout } from "@/components/layout";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetDashboard({
    query: {
      queryKey: ["/api/dashboard"]
    }
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Overview</h1>
          <p className="text-muted-foreground mt-1">Here's what's happening across your accounts today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard?.totalClients || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard?.totalPosts || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard?.pendingApproval || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Changes Requested</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboard?.changesRequested || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-display font-semibold">Recent Activity</h2>
          <div className="grid gap-3">
            {dashboard?.recentActivity?.length ? dashboard.recentActivity.map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                <div>
                  <p className="font-medium">{activity.clientName}</p>
                  <p className="text-sm text-muted-foreground">{activity.accountHandle} on {activity.platform}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    activity.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                    activity.status === 'CHANGES_REQUESTED' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                    activity.status === 'PENDING_APPROVAL' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-muted text-muted-foreground border-border'
                  }`}>
                    {activity.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(activity.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center border border-border rounded-lg bg-card text-muted-foreground">
                No recent activity.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
