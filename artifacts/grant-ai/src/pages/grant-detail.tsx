import { useRoute, Link, useLocation } from "wouter";
import { useGetGrant, useListMatches, useCreateApplication, getGetGrantQueryKey, getListMatchesQueryKey } from "@workspace/api-client-react";
import { ArrowLeft, ExternalLink, Calendar, DollarSign, MapPin, Building, Target, Loader2, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { AskClaude } from "@/components/ask-claude";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function GrantDetail() {
  const [, params] = useRoute("/grants/:id");
  const grantId = parseInt(params?.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const userIdStr = localStorage.getItem("grantai_user_id");
  const userId = userIdStr ? parseInt(userIdStr, 10) : 0;

  const { data: grant, isLoading: grantLoading } = useGetGrant(grantId, {
    query: { enabled: !!grantId, queryKey: getGetGrantQueryKey(grantId) },
  });

  const { data: matches, isLoading: matchesLoading } = useListMatches(
    { userId },
    { query: { enabled: !!userId, queryKey: getListMatchesQueryKey({ userId }) } },
  );

  const createApplication = useCreateApplication();

  const handleStartApplication = () => {
    createApplication.mutate(
      { data: { userId, grantId, status: "draft" } },
      {
        onSuccess: (app) => {
          toast({ title: "Workspace created", description: "Application workspace is ready." });
          setLocation(`/applications/${app.id}`);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "Could not create application workspace." });
        }
      }
    );
  };

  const match = matches?.find(m => m.grantId === grantId);
  const fitScore = match?.fitScore || 0;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
    if (score >= 70) return "bg-blue-500/20 text-blue-500 border-blue-500/30";
    return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
  };

  if (grantLoading || matchesLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-12 w-3/4" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!grant) return null;

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-8 pb-12">
        <Link href="/dashboard">
          <Button variant="ghost" className="pl-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-white/10 text-foreground">
                <Target className="mr-1 h-3 w-3" /> {grant.focusArea}
              </Badge>
              {match && (
                <Badge variant="outline" className={`font-mono font-bold ${getScoreColor(fitScore)}`}>
                  {fitScore}% AI Fit Score
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">
              {grant.name}
            </h1>
            <div className="flex items-center gap-2 text-lg text-muted-foreground">
              <Building className="h-5 w-5" />
              <span>{grant.funder}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            {grant.website && (
              <a href={grant.website} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="w-full border-white/20 hover:bg-white/5 sm:w-auto">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Website
                </Button>
              </a>
            )}
            <Button 
              onClick={handleStartApplication}
              disabled={createApplication.isPending}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
              data-testid="button-start-application"
            >
              {createApplication.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Start Application
            </Button>
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:grid-cols-4">
          <div className="space-y-1 p-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <DollarSign className="mr-1 h-4 w-4" /> Amount
            </div>
            <div className="text-lg font-semibold text-foreground">
              {grant.amount ? `$${grant.amount.toLocaleString()}` : "Variable"}
            </div>
          </div>
          <div className="space-y-1 p-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="mr-1 h-4 w-4" /> Deadline
            </div>
            <div className="text-lg font-semibold text-foreground">
              {grant.deadline ? format(new Date(grant.deadline), "MMM d, yyyy") : "Rolling"}
            </div>
          </div>
          <div className="space-y-1 p-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-1 h-4 w-4" /> Location
            </div>
            <div className="text-lg font-semibold text-foreground">
              {grant.location}
            </div>
          </div>
          <div className="space-y-1 p-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Target className="mr-1 h-4 w-4" /> Category
            </div>
            <div className="text-lg font-semibold text-foreground">
              {grant.focusArea}
            </div>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-8 md:col-span-2">
            {/* Description */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">Description</h2>
              <div className="prose prose-invert max-w-none text-muted-foreground">
                <p className="whitespace-pre-line">{grant.description}</p>
              </div>
            </section>

            {/* Eligibility */}
            <section className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-6">
              <h2 className="text-xl font-bold text-foreground">Eligibility Requirements</h2>
              <div className="text-muted-foreground">
                <p className="whitespace-pre-line">{grant.eligibility}</p>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            {/* Match Reasoning */}
            {match && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                <div className="mb-4 flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <h3 className="font-bold">AI Match Analysis</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {match.reasoning}
                </p>
              </div>
            )}
            
            {/* Actions card */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <h3 className="font-bold text-foreground mb-4">Ready to apply?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Our AI can draft your responses based on your organization profile and this grant's specific requirements.
              </p>
              <Button 
                onClick={handleStartApplication}
                disabled={createApplication.isPending}
                className="w-full bg-primary"
              >
                Create Workspace
              </Button>
            </div>
          </div>
        </div>
      </div>
      <AskClaude />
    </AppLayout>
  );
}
