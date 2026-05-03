import React, { useState } from "react";
import { useLocation } from "wouter";
import { useListMatches, useGetUser } from "@workspace/api-client-react";
import { getListMatchesQueryKey, getGetUserQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Swords, ChevronLeft, Trophy, Clock, DollarSign, Zap } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { safeSuccess } from "@/lib/sounds";
import confetti from "canvas-confetti";
import { format } from "date-fns";

interface BattleGrant {
  grantId: number;
  pros: string[];
  cons: string[];
  strengthScore: number;
  difficultyScore: number;
  timeToWrite: string;
  grant: {
    id: number;
    name: string;
    funder: string;
    amount: number | null;
    deadline: string | null;
    focusArea: string;
  };
}

interface BattleResult {
  grants: BattleGrant[];
  verdict: {
    winnerId: number;
    recommendation: string;
    strategy: string;
  };
}

type MatchItem = {
  grantId: number;
  fitScore: number;
  winProbability: number | null;
  grant: {
    id: number;
    name: string;
    funder: string;
    amount: number | null;
    deadline: string | null;
    focusArea: string;
  };
};

function StatBar({ label, value, color, delay = 0 }: { label: string; value: number; color: string; delay?: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-white/50">
        <span>{label}</span>
        <span className="font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.9, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function VsLightning() {
  return (
    <div className="relative flex flex-col items-center justify-center z-10">
      {/* Particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-emerald-400"
          animate={{
            x: [0, (i % 2 === 0 ? 1 : -1) * (20 + i * 8)],
            y: [0, (i < 3 ? -1 : 1) * (15 + i * 6)],
            opacity: [0.8, 0],
            scale: [1, 0],
          }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeOut" }}
        />
      ))}
      <motion.div
        animate={{
          textShadow: [
            "0 0 20px #10b981, 0 0 40px #3b82f6",
            "0 0 40px #10b981, 0 0 80px #3b82f6",
            "0 0 20px #10b981, 0 0 40px #3b82f6",
          ],
          scale: [1, 1.08, 1],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-3xl font-black text-emerald-400 select-none"
      >
        ⚔️
      </motion.div>
      <span className="mt-1 text-xs font-black tracking-widest text-white/30 uppercase">VS</span>
    </div>
  );
}

export default function GrantBattle() {
  const userIdStr = localStorage.getItem("grantai_user_id");
  const userId = userIdStr ? parseInt(userIdStr, 10) : 0;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: user } = useGetUser(userId, {
    query: { enabled: !!userId, queryKey: getGetUserQueryKey(userId) },
  });
  const { data: matches, isLoading } = useListMatches(
    { userId },
    { query: { enabled: !!userId, queryKey: getListMatchesQueryKey({ userId }) } }
  );

  const [selected, setSelected] = useState<number[]>([]);
  const [isBattling, setIsBattling] = useState(false);
  const [result, setResult] = useState<BattleResult | null>(null);

  const toggleSelect = (grantId: number) => {
    setSelected((prev) =>
      prev.includes(grantId)
        ? prev.filter((id) => id !== grantId)
        : prev.length < 3
        ? [...prev, grantId]
        : prev
    );
  };

  const handleBattle = async () => {
    if (selected.length < 2) return;
    setIsBattling(true);
    setResult(null);

    try {
      const res = await fetch("/api/battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantIds: selected,
          userProfile: {
            orgName: user?.orgName,
            mission: user?.mission,
            focusArea: user?.focusAreas,
          },
        }),
      });
      if (!res.ok) throw new Error("Battle failed");
      const data = await res.json() as BattleResult;
      setResult(data);

      // Celebrate
      safeSuccess();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.4 }, colors: ["#fbbf24", "#f59e0b", "#ef4444"] });
    } catch {
      toast({ variant: "destructive", title: "Battle failed", description: "Could not run the analysis. Try again." });
    } finally {
      setIsBattling(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center gap-4">
          <Swords className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-2xl font-bold">No matches to battle yet</h2>
          <p className="text-muted-foreground max-w-sm">Generate your grant matches on the dashboard first, then come back to battle them head-to-head.</p>
          <Link href="/dashboard"><Button>Go to Dashboard</Button></Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              ⚔️ Grant Battle Mode
            </h1>
            <p className="text-muted-foreground mt-1">
              Select 2–3 grants to battle head-to-head. Claude will pick your best shot.
            </p>
          </div>
        </div>

        {/* Selection grid */}
        {!result && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(matches as MatchItem[]).map((match) => {
                const isSelected = selected.includes(match.grantId);
                const isDisabled = !isSelected && selected.length >= 3;
                return (
                  <motion.button
                    key={match.grantId}
                    onClick={() => !isDisabled && toggleSelect(match.grantId)}
                    whileHover={!isDisabled ? { y: -2 } : {}}
                    whileTap={!isDisabled ? { scale: 0.97 } : {}}
                    className={`relative rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-yellow-500/60 bg-yellow-500/10 shadow-lg shadow-yellow-500/10"
                        : isDisabled
                        ? "cursor-not-allowed border-white/5 bg-white/2 opacity-40"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                    }`}
                  >
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-xs font-black text-black"
                      >
                        {selected.indexOf(match.grantId) + 1}
                      </motion.div>
                    )}
                    <div className="space-y-2 pr-8">
                      <p className="text-xs font-semibold text-blue-400">{match.fitScore}% fit</p>
                      <h3 className="font-bold text-white text-sm leading-tight line-clamp-2">{match.grant.name}</h3>
                      <p className="text-xs text-white/40">{match.grant.funder}</p>
                      <div className="flex items-center gap-3 text-xs text-white/30">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {match.grant.amount ? `$${(match.grant.amount / 1000).toFixed(0)}K` : "Varies"}
                        </span>
                        {match.grant.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(match.grant.deadline), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Battle button */}
            <div className="flex items-center justify-center gap-4">
              <p className="text-sm text-white/40">
                {selected.length === 0
                  ? "Select 2 or 3 grants above"
                  : selected.length === 1
                  ? "Select 1 more grant"
                  : `${selected.length} grants selected — ready to battle!`}
              </p>
              <motion.button
                onClick={handleBattle}
                disabled={selected.length < 2 || isBattling}
                whileHover={selected.length >= 2 ? { scale: 1.04 } : {}}
                whileTap={selected.length >= 2 ? { scale: 0.97 } : {}}
                className="relative overflow-hidden rounded-xl px-8 py-3.5 text-base font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: selected.length >= 2 ? "linear-gradient(135deg, #fbbf24, #f59e0b)" : "#333",
                  boxShadow: selected.length >= 2 ? "0 0 24px rgba(251,191,36,0.4)" : "none",
                }}
              >
                {isBattling ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Claude is analyzing…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Swords className="h-4 w-4" />
                    ⚔️ Start Battle
                  </span>
                )}
                {selected.length >= 2 && !isBattling && (
                  <motion.div
                    className="absolute inset-0 bg-white/20"
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                  />
                )}
              </motion.button>
            </div>
          </>
        )}

        {/* Battle Results */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              {/* Grant panels */}
              <div className={`grid gap-4 ${result.grants.length === 2 ? "md:grid-cols-[1fr_auto_1fr]" : "md:grid-cols-[1fr_auto_1fr_auto_1fr]"}`}>
                {result.grants.map((bg, idx) => {
                  const isWinner = bg.grantId === result.verdict.winnerId;
                  const panelBorder = isWinner
                    ? "border-emerald-500/40"
                    : "border-white/[0.08]";
                  const panelGlow = isWinner
                    ? "0 0 24px rgba(16,185,129,0.15), 0 4px 16px rgba(0,0,0,0.4)"
                    : "0 4px 12px rgba(0,0,0,0.3)";

                  return (
                    <React.Fragment key={bg.grantId}>
                      <motion.div
                        initial={{ opacity: 0, x: idx === 0 ? -40 : 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: idx * 0.15 }}
                        className={`relative rounded-2xl border ${panelBorder} p-6 space-y-5`}
                        style={{
                          background: "linear-gradient(160deg, rgba(10,20,40,0.95), rgba(5,10,20,0.95))",
                          boxShadow: panelGlow,
                        }}
                      >
                        {isWinner && (
                          <motion.div
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
                            className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400"
                          >
                            <Trophy className="h-3 w-3" />
                            RECOMMENDED
                          </motion.div>
                        )}

                        {/* Grant header */}
                        <div className="pt-2">
                          <h3 className="font-extrabold text-white leading-tight">{bg.grant.name}</h3>
                          <p className="text-sm text-white/40 mt-1">{bg.grant.funder}</p>
                        </div>

                        {/* Key stats */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-lg bg-white/5 p-2.5">
                            <p className="text-xs text-white/30">Amount</p>
                            <p className="font-bold text-white">
                              {bg.grant.amount ? `$${(bg.grant.amount / 1000).toFixed(0)}K` : "Variable"}
                            </p>
                          </div>
                          <div className="rounded-lg bg-white/5 p-2.5">
                            <p className="text-xs text-white/30">Deadline</p>
                            <p className="font-bold text-white">
                              {bg.grant.deadline ? format(new Date(bg.grant.deadline), "MMM d") : "Rolling"}
                            </p>
                          </div>
                        </div>

                        {/* Score bars */}
                        <div className="space-y-3">
                          <StatBar label="Grant Strength" value={bg.strengthScore} color="#3b82f6" delay={0.4 + idx * 0.1} />
                          <StatBar label="Application Difficulty" value={bg.difficultyScore} color="#f59e0b" delay={0.55 + idx * 0.1} />
                        </div>

                        {/* Time to write */}
                        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/50">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          Est. writing time: <span className="font-semibold text-white/80 ml-1">{bg.timeToWrite}</span>
                        </div>

                        {/* Pros */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Pros</p>
                          {bg.pros.map((pro, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.7 + i * 0.1 }}
                              className="flex gap-2 text-sm text-white/70"
                            >
                              <span className="mt-0.5 text-emerald-400 shrink-0">✓</span>
                              {pro}
                            </motion.div>
                          ))}
                        </div>

                        {/* Cons */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Cons</p>
                          {bg.cons.map((con, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 1 + i * 0.1 }}
                              className="flex gap-2 text-sm text-white/70"
                            >
                              <span className="mt-0.5 text-red-400 shrink-0">✗</span>
                              {con}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>

                      {/* VS divider between panels */}
                      {idx < result.grants.length - 1 && (
                        <div key={`vs-${idx}`} className="hidden md:flex items-center justify-center">
                          <VsLightning />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Claude's Verdict */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#131826] p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-xl">
                    🏆
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500/60">Claude's Verdict</p>
                      <h3 className="mt-1 text-base font-bold text-white">Recommended Action</h3>
                    </div>
                    <p className="text-sm text-white/70 leading-relaxed">{result.verdict.recommendation}</p>
                    <div className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                      <Zap className="h-3.5 w-3.5 shrink-0 text-blue-400 mt-0.5" />
                      <p className="text-xs text-white/50 italic">{result.verdict.strategy}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Actions */}
              <div className="flex items-center gap-4 justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="border border-white/[0.08] text-[#94A3B8] hover:bg-white/[0.04] hover:text-white"
                  onClick={() => { setResult(null); setSelected([]); }}
                >
                  ← Run Again
                </Button>
                {result.verdict.winnerId && (
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600"
                    onClick={() => navigate(`/grants/${result.verdict.winnerId}`)}
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    Apply for Winner
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
