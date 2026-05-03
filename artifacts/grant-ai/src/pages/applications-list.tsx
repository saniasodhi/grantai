import { Link, useLocation } from "wouter";
import { useListApplications, getListApplicationsQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { FileText, ArrowRight, Clock, CheckCircle2, Edit3, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function ApplicationsList() {
  const userIdStr = localStorage.getItem("grantai_user_id");
  const userId = userIdStr ? parseInt(userIdStr, 10) : 0;
  const [, setLocation] = useLocation();

  const { data: applications, isLoading } = useListApplications(
    { userId },
    { query: { enabled: !!userId, queryKey: getListApplicationsQueryKey({ userId }) } },
  );

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "submitted":
        return { label: "Submitted", color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30", icon: <CheckCircle2 className="mr-1 h-3 w-3" /> };
      case "in-progress":
        return { label: "In Progress", color: "bg-blue-500/20 text-blue-500 border-blue-500/30", icon: <Edit3 className="mr-1 h-3 w-3" /> };
      default:
        return { label: "Draft", color: "bg-white/10 text-muted-foreground border-white/20", icon: <Clock className="mr-1 h-3 w-3" /> };
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Applications</h1>
          <p className="text-muted-foreground mt-1">Manage your active and past grant applications.</p>
        </div>

        {applications && applications.length > 0 ? (
          <div className="space-y-4">
            {applications.map((app) => {
              const statusInfo = getStatusDisplay(app.status);
              return (
                <div 
                  key={app.id} 
                  className="group flex flex-col items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all hover:border-primary/30 sm:flex-row sm:items-center"
                  data-testid={`app-row-${app.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{app.grant.name}</h3>
                      <p className="text-sm text-muted-foreground">{app.grant.funder}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant="outline" className={`font-medium ${statusInfo.color}`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </Badge>
                        <span className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          Started {format(new Date(app.createdAt), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center">
                          <Target className="mr-1 h-3 w-3" />
                          {app.grant.amount ? `$${app.grant.amount.toLocaleString()}` : "Variable"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full sm:w-auto">
                    <Link href={`/applications/${app.id}`}>
                      <Button className="w-full sm:w-auto bg-white/10 hover:bg-primary hover:text-primary-foreground">
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5 p-8 text-center backdrop-blur-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No applications yet</h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Start applying for grants from your dashboard to track them here.
            </p>
            <Link href="/dashboard">
              <Button className="mt-6 bg-primary">
                View Matches
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
