import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, Copy, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

interface PitchModalProps {
  open: boolean;
  onClose: () => void;
  orgName?: string;
}

interface PitchScores {
  clarity: number;
  impact: number;
  specificity: number;
  emotionalPull: number;
  funderAppeal: number;
}

interface PitchResult {
  scores: PitchScores;
  suggestions: string[];
  improvedVersion: string;
}

const MAX_CHARS = 600;
const MAX_SECONDS = 60;

function ScoreRadar({ scores }: { scores: PitchScores }) {
  const [animatedScores, setAnimatedScores] = useState({
    clarity: 0, impact: 0, specificity: 0, emotionalPull: 0, funderAppeal: 0,
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setTimeout(() => setAnimatedScores(scores), 100);
    });
    return () => cancelAnimationFrame(frame);
  }, [scores]);

  const data = [
    { subject: "Clarity", value: animatedScores.clarity, fullMark: 100 },
    { subject: "Impact", value: animatedScores.impact, fullMark: 100 },
    { subject: "Specificity", value: animatedScores.specificity, fullMark: 100 },
    { subject: "Emotional Pull", value: animatedScores.emotionalPull, fullMark: 100 },
    { subject: "Funder Appeal", value: animatedScores.funderAppeal, fullMark: 100 },
  ];

  const avg = Math.round(
    (scores.clarity + scores.impact + scores.specificity + scores.emotionalPull + scores.funderAppeal) / 5
  );

  const avgColor = avg >= 75 ? "#10b981" : avg >= 55 ? "#3b82f6" : "#f59e0b";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.25}
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={1200}
              animationEasing="ease-out"
            />
          </RadarChart>
        </ResponsiveContainer>
        {/* Center score badge */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
            className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 bg-black/80"
            style={{ borderColor: avgColor, boxShadow: `0 0 16px ${avgColor}44` }}
          >
            <span className="text-lg font-black leading-none" style={{ color: avgColor }}>{avg}</span>
            <span className="text-[9px] text-white/40 uppercase tracking-wider">avg</span>
          </motion.div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid w-full grid-cols-5 gap-2">
        {data.map((d) => {
          const color = d.value >= 75 ? "#10b981" : d.value >= 55 ? "#3b82f6" : "#f59e0b";
          return (
            <div key={d.subject} className="flex flex-col items-center gap-1">
              <motion.span
                className="text-lg font-black"
                style={{ color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                {d.value}
              </motion.span>
              <span className="text-[9px] text-center text-white/30 leading-tight">{d.subject}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PitchModal({ open, onClose, orgName }: PitchModalProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"input" | "results">("input");
  const [pitch, setPitch] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<PitchResult | null>(null);
  const [copied, setCopied] = useState(false);

  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMode("input");
      setPitch("");
      setResult(null);
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  }, [open]);

  const startRecording = () => {
    type SpeechRecognitionCtor = new () => {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((e: { resultIndex: number; results: { isFinal: boolean; [k: number]: { transcript: string } }[] }) => void) | null;
      onerror: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SpeechRecognitionCls = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SpeechRecognitionCls) {
      toast({ title: "Mic unavailable", description: "Your browser doesn't support speech recognition. Type your pitch instead." });
      return;
    }

    const recognition = new SpeechRecognitionCls();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setPitch(finalTranscript + interim);
    };

    recognition.onerror = () => {
      stopRecording();
      toast({ title: "Recording error", description: "Mic access was denied or interrupted." });
    };

    recognition.start();
    setIsRecording(true);
    setRecordingSeconds(0);

    timerRef.current = setInterval(() => {
      setRecordingSeconds((s) => {
        if (s >= MAX_SECONDS - 1) {
          stopRecording();
          return MAX_SECONDS;
        }
        return s + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleAnalyze = async () => {
    if (!pitch.trim() || pitch.trim().length < 20) {
      toast({ title: "Too short", description: "Please type or record a pitch of at least 20 characters." });
      return;
    }
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pitch: pitch.trim(), orgName }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json() as PitchResult;
      setResult(data);
      setMode("results");
    } catch {
      toast({ variant: "destructive", title: "Analysis failed", description: "Could not analyze your pitch. Please try again." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (result?.improvedVersion) {
      navigator.clipboard.writeText(result.improvedVersion);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(2,6,23,0.85)", backdropFilter: "blur(12px)" }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl"
            style={{ background: "linear-gradient(160deg, #0d1a2e 0%, #070f1a 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0d1a2e]/90 px-6 py-4 backdrop-blur-sm">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  🎤 Pitch Perfect
                </h2>
                <p className="text-xs text-white/40 mt-0.5">
                  {mode === "input" ? "Type or record your 60-second elevator pitch" : "AI Pitch Analysis"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {mode === "input" ? (
                <>
                  {/* Recording controls */}
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={isRecording ? stopRecording : startRecording}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        isRecording
                          ? "bg-red-500/20 border border-red-500/40 text-red-400"
                          : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <motion.div
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="h-2 w-2 rounded-full bg-red-400"
                          />
                          <MicOff className="h-4 w-4" />
                          Stop ({MAX_SECONDS - recordingSeconds}s left)
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4" />
                          Record your pitch
                        </>
                      )}
                    </motion.button>
                    <span className="text-xs text-white/30">— or type below</span>
                    {isRecording && (
                      <div className="ml-auto flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-1 rounded-full bg-red-400"
                            animate={{ height: [4, 16, 4] }}
                            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <Textarea
                      value={pitch}
                      onChange={(e) => setPitch(e.target.value.slice(0, MAX_CHARS))}
                      placeholder="e.g. We're a nonprofit teaching AI and coding skills to underserved youth in Chicago. Last year, 94% of our 200 graduates found jobs, but we only reached 10% of eligible students due to funding gaps..."
                      className="min-h-[160px] bg-black/30 border-white/10 text-white placeholder:text-white/20 text-sm leading-relaxed resize-none focus-visible:ring-1 focus-visible:ring-blue-500/50"
                    />
                    <span className="absolute bottom-3 right-3 text-xs text-white/20">
                      {pitch.length}/{MAX_CHARS}
                    </span>
                  </div>

                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || pitch.trim().length < 20}
                    className="w-full h-12 text-sm font-bold"
                    style={{
                      background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                      boxShadow: "0 0 20px rgba(59,130,246,0.3)",
                    }}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing with Claude…
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Analyze My Pitch
                      </>
                    )}
                  </Button>
                </>
              ) : result ? (
                <>
                  {/* Radar chart */}
                  <ScoreRadar scores={result.scores} />

                  {/* Suggestions */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-white/40">
                      3 Ways to Improve
                    </h3>
                    {result.suggestions.map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.15 + 0.5 }}
                        className="flex gap-3 rounded-xl border border-white/5 bg-white/3 p-4"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-blue-400">
                          {i + 1}
                        </span>
                        <p className="text-sm text-white/70 leading-relaxed">{s}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Improved version */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                        ✨ Improved Version
                      </h3>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed italic">
                      "{result.improvedVersion}"
                    </p>
                  </motion.div>

                  <Button
                    onClick={() => { setMode("input"); setPitch(""); setResult(null); }}
                    variant="outline"
                    className="w-full border-white/10 bg-white/5 hover:bg-white/10"
                  >
                    Try Another Pitch
                  </Button>
                </>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
