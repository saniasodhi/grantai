import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, Loader2, X, TrendingUp, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface MagicMatch {
  grantId: number;
  fitScore: number;
  winProbability: number;
  reasoning: string;
  grant: {
    id: number;
    name: string;
    funder: string;
    amount: number | null;
    focusArea: string;
    location: string;
    description: string;
    eligibility: string;
    deadline?: string | null;
  };
}

interface MagicResult {
  inferredProfile: { orgName: string; mission: string; focusArea: string };
  matches: MagicMatch[];
  draft: string;
  topGrantName: string;
  topGrantFunder: string;
}

interface MagicModeModalProps {
  open: boolean;
  onClose: () => void;
  prefillDescription?: string;
}

const STEPS = [
  { emoji: "🧠", label: "Analyzing your mission..." },
  { emoji: "🔍", label: "Searching 50,000+ grants..." },
  { emoji: "📊", label: "Calculating fit scores..." },
  { emoji: "✍️", label: "Drafting your first application..." },
];

const STEP_DURATION = 1600;

export function MagicModeModal({ open, onClose, prefillDescription }: MagicModeModalProps) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"input" | "loading" | "result">("input");
  const [description, setDescription] = useState(prefillDescription ?? "");
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [result, setResult] = useState<MagicResult | null>(null);
  const [showDraft, setShowDraft] = useState(false);
  const [draftExpanded, setDraftExpanded] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiPromiseRef = useRef<Promise<MagicResult | null> | null>(null);

  // Update description when prefill changes (for showcase)
  useEffect(() => {
    if (prefillDescription !== undefined) setDescription(prefillDescription);
  }, [prefillDescription]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setPhase("input");
        setCurrentStep(0);
        setCompletedSteps([]);
        setResult(null);
        setShowDraft(false);
        setDraftExpanded(false);
        apiPromiseRef.current = null;
        if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      }, 300);
    } else {
      setDescription(prefillDescription ?? "");
    }
  }, [open, prefillDescription]);

  const runMagic = async () => {
    if (!description.trim() || description.trim().length < 5) return;

    setPhase("loading");
    setCurrentStep(0);
    setCompletedSteps([]);
    setResult(null);

    // Start API call immediately
    const apiCall: Promise<MagicResult | null> = fetch("/api/magic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: description.trim() }),
    })
      .then((r) => r.json())
      .catch(() => null);

    apiPromiseRef.current = apiCall;

    // Step animation — each step shows for STEP_DURATION ms
    let step = 0;
    const advanceStep = () => {
      setCompletedSteps((prev) => [...prev, step]);
      step++;
      if (step < STEPS.length) {
        setCurrentStep(step);
      } else {
        // All steps done — wait for API then reveal
        if (stepTimerRef.current) clearInterval(stepTimerRef.current);
        apiCall.then((data) => {
          if (!data || !data.matches) {
            toast({ variant: "destructive", title: "Magic failed", description: "Could not process your request. Please try again." });
            setPhase("input");
            return;
          }
          setResult(data);
          setPhase("result");
          // Stagger the draft reveal
          setTimeout(() => setShowDraft(true), 600);
        });
      }
    };

    setCurrentStep(0);
    stepTimerRef.current = setInterval(advanceStep, STEP_DURATION);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runMagic();
  };

  const getFitColor = (score: number) => {
    if (score >= 85) return "from-emerald-500 to-teal-500";
    if (score >= 70) return "from-blue-500 to-indigo-500";
    return "from-yellow-500 to-orange-500";
  };

  const getWinColor = (prob: number) => {
    if (prob >= 25) return "text-emerald-400";
    if (prob >= 15) return "text-blue-400";
    return "text-yellow-400";
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="relative z-10 w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #0a0f1e 0%, #0d1a2e 40%, #071a14 100%)",
              border: "1px solid rgba(99,179,237,0.2)",
              boxShadow: "0 0 60px rgba(59,130,246,0.15), 0 0 120px rgba(16,185,129,0.08)",
            }}
          >
            {/* Gradient header glow */}
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(99,179,237,0.6), rgba(16,185,129,0.6), transparent)" }}
            />

            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #10b981)" }}
                  >
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Autopilot</h2>
                    <p className="text-xs text-blue-300/70">AI does the discovery for you</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* INPUT PHASE */}
              <AnimatePresence mode="wait">
                {phase === "input" && (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-6"
                  >
                    <div>
                      <label className="block text-sm font-medium text-blue-200 mb-3">
                        Describe your organization in one sentence
                      </label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g., We're a nonprofit teaching girls coding in rural India"
                        rows={3}
                        className="resize-none text-base border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-500/50 focus:ring-blue-500/20"
                        autoFocus
                        data-testid="magic-description-input"
                      />
                      <p className="mt-2 text-xs text-white/30">Tip: ⌘+Enter to generate</p>
                    </div>
                    <motion.button
                      onClick={runMagic}
                      disabled={description.trim().length < 5}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full relative overflow-hidden rounded-xl py-4 text-base font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)" }}
                      data-testid="magic-generate-button"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <span className="text-base">🎯</span>
                        Generate
                      </span>
                      <motion.div
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.1), transparent)" }}
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                      />
                    </motion.button>
                  </motion.div>
                )}

                {/* LOADING PHASE */}
                {phase === "loading" && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-4 py-4"
                  >
                    {STEPS.map((step, i) => {
                      const isDone = completedSteps.includes(i);
                      const isActive = currentStep === i && !isDone;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: isActive || isDone ? 1 : 0.35, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`flex items-center gap-4 rounded-xl p-4 transition-all duration-500 ${
                            isActive
                              ? "bg-white/8 border border-blue-500/30"
                              : isDone
                              ? "bg-white/4 border border-emerald-500/20"
                              : "border border-transparent"
                          }`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg">
                            {isDone ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 400 }}
                              >
                                <Check className="h-5 w-5 text-emerald-400" />
                              </motion.div>
                            ) : isActive ? (
                              <motion.span
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                              >
                                {step.emoji}
                              </motion.span>
                            ) : (
                              <span className="opacity-40">{step.emoji}</span>
                            )}
                          </div>
                          <span className={`text-base font-medium ${isDone ? "text-emerald-300" : isActive ? "text-white" : "text-white/40"}`}>
                            {step.label}
                          </span>
                          {isActive && (
                            <motion.div className="ml-auto">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}

                {/* RESULT PHASE */}
                {phase === "result" && result && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-8"
                  >
                    {/* Inferred profile badge */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
                        <Check className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{result.inferredProfile.orgName}</p>
                        <p className="text-xs text-blue-300/70">{result.inferredProfile.focusArea} · {result.inferredProfile.mission}</p>
                      </div>
                    </motion.div>

                    {/* Top 3 matches */}
                    <div>
                      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-blue-300/60">
                        Top 3 Matches Found
                      </h3>
                      <div className="space-y-3">
                        {result.matches.slice(0, 3).map((match, i) => (
                          <motion.div
                            key={match.grantId}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.12 }}
                            className={`relative overflow-hidden rounded-xl border p-5 ${
                              i === 0
                                ? "border-blue-500/40 bg-blue-500/8"
                                : "border-white/10 bg-white/4"
                            }`}
                          >
                            {i === 0 && (
                              <div className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 px-2.5 py-0.5 text-xs font-bold text-white">
                                #1 Match
                              </div>
                            )}
                            <div className="flex items-start justify-between gap-8 pr-16">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-white leading-tight">{match.grant.name}</p>
                                <p className="mt-0.5 text-sm text-white/50">{match.grant.funder}</p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                <div
                                  className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-base font-black text-white ${getFitColor(match.fitScore)}`}
                                >
                                  {match.fitScore}
                                </div>
                                <span className="text-xs text-white/30">fit score</span>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-4 text-sm">
                              {match.grant.amount && (
                                <span className="flex items-center gap-1 text-emerald-400">
                                  <DollarSign className="h-3.5 w-3.5" />
                                  {(match.grant.amount / 1000).toFixed(0)}K
                                </span>
                              )}
                              <span className={`flex items-center gap-1 ${getWinColor(match.winProbability)}`}>
                                <TrendingUp className="h-3.5 w-3.5" />
                                {match.winProbability}% win
                              </span>
                              <span className="text-white/30">·</span>
                              <span className="text-white/40 text-xs">{match.grant.focusArea}</span>
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-white/50">{match.reasoning}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Draft Application */}
                    <AnimatePresence>
                      {showDraft && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5 }}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 overflow-hidden"
                        >
                          <button
                            onClick={() => setDraftExpanded(!draftExpanded)}
                            className="flex w-full items-center justify-between p-5 text-left hover:bg-white/3 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                                <span className="text-base">✍️</span>
                              </div>
                              <div>
                                <p className="font-bold text-emerald-300 text-sm">Application Draft Ready</p>
                                <p className="text-xs text-white/40">For {result.topGrantName}</p>
                              </div>
                            </div>
                            {draftExpanded
                              ? <ChevronUp className="h-4 w-4 text-white/40" />
                              : <ChevronDown className="h-4 w-4 text-white/40" />
                            }
                          </button>

                          <AnimatePresence>
                            {draftExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-emerald-500/20 p-5">
                                  <p className="whitespace-pre-wrap text-sm leading-7 text-white/80 font-mono">
                                    {result.draft}
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {!draftExpanded && (
                            <div className="px-5 pb-4">
                              <p className="line-clamp-2 text-sm leading-relaxed text-white/50 font-mono">
                                {result.draft}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* CTA */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex flex-col gap-3 border-t border-white/10 pt-6"
                    >
                      <p className="text-center text-sm text-white/50">
                        Ready to apply? Save these matches to your dashboard.
                      </p>
                      <motion.a
                        href="/onboard"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="relative overflow-hidden rounded-xl py-4 text-center text-base font-bold text-white block"
                        style={{ background: "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)" }}
                        data-testid="magic-save-button"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          Save to my dashboard — it's free
                        </span>
                        <motion.div
                          className="absolute inset-0"
                          style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12), transparent)" }}
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 0.5 }}
                        />
                      </motion.a>
                      <button
                        onClick={() => { setPhase("input"); setResult(null); setShowDraft(false); }}
                        className="text-center text-sm text-white/30 hover:text-white/60 transition-colors"
                      >
                        Try a different description
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
