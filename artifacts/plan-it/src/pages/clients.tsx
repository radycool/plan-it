import { useListClients, getListClientsQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Plus, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewClientDialog } from "@/components/new-client-dialog";

export default function Clients() {
  const { data: clients, isLoading } = useListClients({
    query: {
      queryKey: getListClientsQueryKey()
    }
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Clients</h1>
            <p className="text-muted-foreground mt-1">Manage your agency's clients and their social accounts.</p>
          </div>
          <NewClientDialog>
            <Button className="gap-2">
              <Plus size={16} />
              <span>New Client</span>
            </Button>
          </NewClientDialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients?.map((client) => (
              <Link key={client.id} href={`/clients/${client.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group bg-card border-border">
                  <CardHeader className="pb-2 flex flex-row justify-between items-start">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {client.name}
                    </CardTitle>
                    {client.logoUrl ? (
                      <img src={client.logoUrl} alt={client.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg font-bold text-muted-foreground">
                        {client.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users size={14} />
                        <span>{client.accountCount || 0} Accounts</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className={client.pendingCount ? "text-amber-500" : ""} />
                        <span className={client.pendingCount ? "text-amber-500 font-medium" : ""}>
                          {client.pendingCount || 0} Pending
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            
            {!clients?.length && (
              <div className="col-span-full p-12 text-center border border-dashed border-border rounded-xl">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">No clients yet</h3>
                <p className="text-muted-foreground mt-1 mb-4">Add your first client to start managing their content.</p>
                <NewClientDialog>
                  <Button>Add Client</Button>
                </NewClientDialog>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
