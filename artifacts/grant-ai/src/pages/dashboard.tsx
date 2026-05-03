import { useState, useCallback, useMemo } from "react";
import { Link } from "wouter";
import {
  useGetUser, useListMatches, useGenerateMatches, useGetGrantStats, useListApplications,
  getListMatchesQueryKey, getGetUserQueryKey, getGetGrantStatsQueryKey, getListApplicationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Calendar, DollarSign, Target, ArrowRight, Loader2, Volume2, VolumeX, Swords, Mic, RefreshCw, Camera, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { MagicModeModal } from "@/components/magic-mode-modal";
import { AskClaude } from "@/components/ask-claude";
import { WinGauge } from "@/components/win-gauge";
import { GrantUniverse } from "@/components/grant-universe";
import { AiThinkingOverlay } from "@/components/ai-thinking-overlay";
import { DeadlineCooker } from "@/components/deadline-cooker";
import { PitchModal } from "@/components/pitch-modal";
import { VisionModal } from "@/components/vision-modal";
import { safeDing, safeSuccess, isSoundEnabled, toggleSound } from "@/lib/sounds";
import confetti from "canvas-confetti";

const CARD_BG = "bg-[#131826]";
const CARD_BORDER = "border border-white/[0.08]";

export default function Dashboard() {
  const userIdStr = localStorage.getItem("grantai_user_id");
  const userId = userIdStr ? parseInt(userIdStr, 10) : 0;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [magicOpen, setMagicOpen] = useState(false);
  const [pitchOpen, setPitchOpen] = useState(false);
  const [visionOpen, setVisionOpen] = useState(false);
  const [visionBannerDismissed, setVisionBannerDismissed] = useState(
    () => localStorage.getItem("vision_banner_dismissed") === "1",
  );
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  const { data: user, isLoading: userLoading } = useGetUser(userId, {
    query: { enabled: !!userId, queryKey: getGetUserQueryKey(userId) },
  });

  const { data: stats, isLoading: statsLoading } = useGetGrantStats({
    query: { enabled: !!userId, queryKey: getGetGrantStatsQueryKey() },
  });

  const { data: matches, isLoading: matchesLoading } = useListMatches(
    { userId },
    { query: { enabled: !!userId, queryKey: getListMatchesQueryKey({ userId }) } },
  );

  const { data: applications } = useListApplications(
    { userId },
    { query: { enabled: !!userId, queryKey: getListApplicationsQueryKey({ userId }) } },
  );

  const generateMatches = useGenerateMatches();

  const urgentMatch = useMemo(() => {
    if (!matches || matches.length === 0) return null;
    const withDeadline = matches.filter((m) => m.grant.deadline);
    if (withDeadline.length === 0) return null;
    return withDeadline.sort(
      (a, b) => new Date(a.grant.deadline!).getTime() - new Date(b.grant.deadline!).getTime(),
    )[0];
  }, [matches]);

  const urgentApp = useMemo(() => {
    if (!urgentMatch || !applications) return undefined;
    return applications.find((a) => a.grantId === urgentMatch.grantId);
  }, [urgentMatch, applications]);

  const handleGenerate = () => {
    generateMatches.mutate(
      { data: { userId } },
      {
        onSuccess: () => {
          toast({ title: "Matches refreshed", description: "Found new relevant grants for your organization." });
          queryClient.invalidateQueries({ queryKey: getListMatchesQueryKey({ userId }) });
          safeSuccess();
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 }, colors: ["#10b981", "#3b82f6"] });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Generation failed", description: "Could not generate matches right now." });
        },
      },
    );
  };

  const handleSoundToggle = useCallback(() => {
    const newState = toggleSound();
    setSoundOn(newState);
    if (newState) safeDing();
  }, []);

  const getFitColor = (score: number) => {
    if (score >= 85) return { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", bar: "bg-emerald-500" };
    if (score >= 70) return { badge: "bg-blue-500/15 text-blue-400 border-blue-500/25", bar: "bg-blue-500" };
    return { badge: "bg-slate-500/15 text-slate-400 border-slate-500/25", bar: "bg-slate-400" };
  };

  if (userLoading || statsLoading || matchesLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <AiThinkingOverlay visible={generateMatches.isPending} phase="matching" />

      <div className="space-y-8 pb-8">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#F8FAFC]">
              {user?.orgName}
            </h1>
            <p className="mt-1 text-sm text-[#94A3B8]">
              {matches && matches.length > 0
                ? `${matches.length} grants matched · best fit ${matches[0]?.fitScore}%`
                : "Run the AI engine to find your best grant matches."}
            </p>
          </div>

          {/* Action bar — all same height h-9 */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSoundToggle}
              aria-label={soundOn ? "Mute sounds" : "Enable sounds"}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-[#94A3B8] transition-colors hover:bg-white/[0.04] hover:text-[#F8FAFC]"
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPitchOpen(true)}
              className="h-9 gap-1.5 border border-white/[0.08] text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#F8FAFC]"
            >
              <Mic className="h-3.5 w-3.5" />
              Pitch
            </Button>

            {matches && matches.length >= 2 && (
              <Link href="/battle">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 border border-white/[0.08] text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#F8FAFC]"
                >
                  <Swords className="h-3.5 w-3.5" />
                  Battle
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              disabled={generateMatches.isPending}
              className="h-9 gap-1.5 border border-white/[0.08] text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#F8FAFC] disabled:opacity-40"
              data-testid="button-generate-matches"
            >
              {generateMatches.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />}
              {matches && matches.length > 0 ? "Refresh" : "Generate"}
            </Button>

            <Button
              size="sm"
              onClick={() => setMagicOpen(true)}
              className="h-9 gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600"
              data-testid="button-magic-mode"
            >
              <span className="text-sm">🎯</span>
              Autopilot
            </Button>
          </div>
        </div>

        {/* ── Vision onboarding banner ── */}
        <AnimatePresence>
          {!visionBannerDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
            >
              <Camera className="h-4 w-4 shrink-0 text-emerald-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F8FAFC]">New: Vision Onboarding</p>
                <p className="text-xs text-[#94A3B8]">Let Claude analyze a photo of your org and build your profile automatically.</p>
              </div>
              <Button
                size="sm"
                onClick={() => setVisionOpen(true)}
                className="h-8 shrink-0 gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600"
              >
                <Camera className="h-3 w-3" />
                Try it
              </Button>
              <button
                onClick={() => {
                  setVisionBannerDismissed(true);
                  localStorage.setItem("vision_banner_dismissed", "1");
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/25 transition-colors hover:bg-white/[0.06] hover:text-white/60"
                aria-label="Dismiss banner"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Deadline strip (only if < 30 days) ── */}
        {urgentMatch && urgentMatch.grant.deadline && (
          <DeadlineCooker
            grantName={urgentMatch.grant.name}
            grantId={urgentMatch.grantId}
            applicationId={urgentApp?.id}
            deadline={new Date(urgentMatch.grant.deadline)}
            winProbability={urgentMatch.winProbability ?? null}
            draftLength={urgentApp?.draftText?.length ?? 0}
          />
        )}

        {/* ── Stats row ── */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Indexed Grants",
              value: stats?.totalGrants?.toLocaleString() ?? "0",
              sub: `across ${stats?.byFocusArea?.length ?? 0} focus areas`,
              icon: <Target className="h-4 w-4 text-[#94A3B8]" />,
            },
            {
              label: "Total Funding Pool",
              value: `$${((stats?.totalFunding ?? 0) / 1_000_000).toFixed(1)}M`,
              sub: "available to apply for",
              icon: <DollarSign className="h-4 w-4 text-[#94A3B8]" />,
            },
            {
              label: "Upcoming Deadlines",
              value: String(stats?.upcomingDeadlines ?? "0"),
              sub: "closing within 30 days",
              icon: <Calendar className="h-4 w-4 text-[#94A3B8]" />,
            },
          ].map(({ label, value, sub, icon }) => (
            <div key={label} className={`rounded-xl ${CARD_BG} ${CARD_BORDER} p-6`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium uppercase tracking-wider text-[#94A3B8]">{label}</p>
                {icon}
              </div>
              <p className="text-2xl font-bold text-[#F8FAFC]">{value}</p>
              <p className="mt-1 text-xs text-[#94A3B8]">{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Matches grid ── */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#F8FAFC]">Your Top Matches</h2>
          </div>

          {matches && matches.length > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {matches.map((match, idx) => {
                  const colors = getFitColor(match.fitScore);
                  return (
                    <motion.div
                      key={match.grantId}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: idx * 0.05 }}
                      className="group"
                    >
                      <div
                        className={`flex h-full flex-col justify-between rounded-xl ${CARD_BG} ${CARD_BORDER} p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-sm`}
                        data-testid={`card-match-${match.grantId}`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant="outline" className={`font-mono text-xs font-semibold ${colors.badge}`}>
                              {match.fitScore}% Fit
                            </Badge>
                            <span className="text-xs text-[#94A3B8]">{match.grant.focusArea}</span>
                          </div>

                          <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                            <motion.div
                              className={`h-full rounded-full ${colors.bar}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${match.fitScore}%` }}
                              transition={{ duration: 0.7, delay: idx * 0.05 + 0.2, ease: "easeOut" }}
                            />
                          </div>

                          <div>
                            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#F8FAFC]">
                              {match.grant.name}
                            </h3>
                            <p className="mt-0.5 text-xs text-[#94A3B8]">{match.grant.funder}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-md bg-white/[0.04] px-3 py-2">
                              <span className="block text-[#94A3B8]">Amount</span>
                              <span className="font-medium text-[#F8FAFC]">
                                {match.grant.amount ? `$${match.grant.amount.toLocaleString()}` : "Variable"}
                              </span>
                            </div>
                            <div className="rounded-md bg-white/[0.04] px-3 py-2">
                              <span className="block text-[#94A3B8]">Deadline</span>
                              <span className="font-medium text-[#F8FAFC]">
                                {match.grant.deadline ? format(new Date(match.grant.deadline), "MMM d") : "Rolling"}
                              </span>
                            </div>
                          </div>

                          {match.winProbability != null && (
                            <div className="flex items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                              <WinGauge value={match.winProbability} size={44} strokeWidth={4} />
                              <div>
                                <p className="text-xs text-[#94A3B8]">Win probability</p>
                                <p className="text-[11px] text-[#94A3B8]/60">AI-estimated</p>
                              </div>
                            </div>
                          )}

                          <p className="line-clamp-2 text-xs leading-relaxed text-[#94A3B8]">
                            {match.reasoning}
                          </p>
                        </div>

                        <div className="mt-4 border-t border-white/[0.06] pt-4">
                          <Link href={`/grants/${match.grantId}`}>
                            <Button
                              variant="ghost"
                              className="w-full justify-between text-xs text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#F8FAFC]"
                              onClick={() => safeDing()}
                            >
                              View Details & Apply
                              <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-8">
                <GrantUniverse
                  matches={matches.map((m) => ({
                    grantId: m.grantId,
                    name: m.grant.name,
                    funder: m.grant.funder,
                    fitScore: m.fitScore,
                    amount: m.grant.amount ?? null,
                    winProbability: m.winProbability ?? null,
                    focusArea: m.grant.focusArea,
                  }))}
                />
              </div>
            </>
          ) : (
            <div className={`flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] ${CARD_BG} p-8 text-center`}>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                <Target className="h-5 w-5 text-emerald-500" />
              </div>
              <h3 className="text-base font-semibold text-[#F8FAFC]">No matches yet</h3>
              <p className="mt-2 max-w-sm text-sm text-[#94A3B8]">
                Run the AI matching engine to scan all 50 grants and surface the best opportunities for your mission.
              </p>
              <Button
                onClick={handleGenerate}
                disabled={generateMatches.isPending}
                size="sm"
                className="mt-6 bg-emerald-500 text-white hover:bg-emerald-600"
              >
                {generateMatches.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
                Generate Matches
              </Button>
            </div>
          )}
        </div>
      </div>

      <MagicModeModal open={magicOpen} onClose={() => setMagicOpen(false)} />
      <PitchModal open={pitchOpen} onClose={() => setPitchOpen(false)} orgName={user?.orgName} />
      <VisionModal open={visionOpen} onClose={() => setVisionOpen(false)} />
      <AskClaude />
    </AppLayout>
  );
}
