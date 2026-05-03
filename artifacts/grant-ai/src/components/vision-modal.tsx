import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { X, Upload, Link2, Camera, Loader2, CheckCircle2, Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { safeSuccess } from "@/lib/sounds";
import confetti from "canvas-confetti";

interface VisionProfile {
  org_name: string;
  org_type: string;
  mission_statement: string;
  location: string;
  focus_areas: string[];
  funding_needed: string;
  visual_observations: string[];
}

interface VisionModalProps {
  open: boolean;
  onClose: () => void;
  prefillImageUrl?: string;
}

const STAGES = [
  { icon: "🔍", label: "Analyzing visual elements..." },
  { icon: "🧠", label: "Understanding your mission..." },
  { icon: "✨", label: "Building your profile..." },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function VisionModal({ open, onClose, prefillImageUrl }: VisionModalProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [phase, setPhase] = useState<"upload" | "analyzing" | "confirm">("upload");
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [isDragging, setIsDragging] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imageMediaType, setImageMediaType] = useState("image/jpeg");
  const [urlInput, setUrlInput] = useState("");
  const [analysisStage, setAnalysisStage] = useState(0);
  const [observations, setObservations] = useState<string[]>([]);
  const [profile, setProfile] = useState<VisionProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editMission, setEditMission] = useState("");
  const [editFocusAreas, setEditFocusAreas] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editFunding, setEditFunding] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && prefillImageUrl) {
      setUploadMode("url");
      setUrlInput(prefillImageUrl);
      setImagePreviewUrl(prefillImageUrl);
    }
  }, [open, prefillImageUrl]);

  useEffect(() => {
    if (!open) {
      setPhase("upload");
      setImagePreviewUrl("");
      setImageBase64("");
      setUrlInput("");
      setAnalysisStage(0);
      setObservations([]);
      setProfile(null);
      setIsConfirming(false);
    }
  }, [open]);

  const readFileAsBase64 = (file: File): Promise<{ base64: string; mediaType: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const [header, data] = result.split(",");
        const mediaType = header.match(/:(.*?);/)?.[1] || "image/jpeg";
        resolve({ base64: data, mediaType });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Not an image", description: "Please drop an image file." });
      return;
    }
    const preview = URL.createObjectURL(file);
    setImagePreviewUrl(preview);
    const { base64, mediaType } = await readFileAsBase64(file);
    setImageBase64(base64);
    setImageMediaType(mediaType);
  }, [toast]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const runAnalysis = async () => {
    const isUrl = uploadMode === "url";
    const imageSource = isUrl ? urlInput : imageBase64;
    if (!imageSource) {
      toast({ variant: "destructive", title: "No image", description: "Upload an image or paste a URL first." });
      return;
    }

    setPhase("analyzing");
    setAnalysisStage(0);
    setObservations([]);

    const stageTimer = (stage: number) =>
      setTimeout(() => setAnalysisStage(stage), stage * 1500);
    stageTimer(1);
    stageTimer(2);

    try {
      const body = isUrl
        ? { image_url: urlInput }
        : { image_base64: imageBase64, media_type: imageMediaType };

      const res = await fetch(`${BASE}/api/vision-onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Analysis failed");
      }

      const data: VisionProfile = await res.json();
      setProfile(data);

      // Reveal observations one by one with 700ms stagger
      data.visual_observations.forEach((obs, i) => {
        setTimeout(() => setObservations((prev) => [...prev, obs]), 4700 + i * 700);
      });

      setTimeout(() => {
        setEditName(data.org_name);
        setEditMission(data.mission_statement);
        setEditFocusAreas(data.focus_areas.join(", "));
        setEditLocation(data.location);
        setEditFunding(data.funding_needed);
        setPhase("confirm");
      }, 4700 + data.visual_observations.length * 700 + 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ variant: "destructive", title: "Vision analysis failed", description: msg });
      setPhase("upload");
    }
  };

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      // Parse funding string like "$50,000 - $150,000" → take the lower bound as a number
      const fundingRaw = editFunding.replace(/[^0-9]/g, "").slice(0, 7);
      const fundingNeed = fundingRaw ? parseInt(fundingRaw, 10) : null;

      const userRes = await fetch(`${BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: editName,
          orgType: profile?.org_type || "Other",
          mission: editMission,
          location: editLocation,
          focusAreas: editFocusAreas,
          fundingNeed: isNaN(fundingNeed as number) ? null : fundingNeed,
        }),
      });
      if (!userRes.ok) throw new Error("Failed to create user profile");
      const user = await userRes.json();
      localStorage.setItem("grantai_user_id", String(user.id));

      const matchRes = await fetch(`${BASE}/api/matches/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!matchRes.ok) throw new Error("Failed to generate matches");

      safeSuccess();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
        colors: ["#10b981", "#3b82f6", "#f8fafc"],
      });

      setTimeout(() => {
        onClose();
        setLocation("/dashboard");
      }, 800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast({ variant: "destructive", title: "Setup failed", description: msg });
      setIsConfirming(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(5, 8, 20, 0.85)", backdropFilter: "blur(12px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.08]"
          style={{
            background: "linear-gradient(160deg, #0d1a2e 0%, #0a0e1a 60%, #0d1420 100%)",
          }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/[0.06] hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Upload Phase */}
          {phase === "upload" && (
            <div className="p-8">
              <div className="mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
                    <Camera className="h-4 w-4 text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Vision Onboarding</h2>
                </div>
                <p className="mt-2 text-sm text-white/50">
                  Share an image of your nonprofit — a website screenshot, logo, flyer, or team photo — and Claude will build your profile instantly.
                </p>
              </div>

              {/* Mode toggle */}
              <div className="mb-5 flex gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] p-1">
                {(["file", "url"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setUploadMode(m)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-all ${
                      uploadMode === m
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {m === "file" ? <Upload className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                    {m === "file" ? "Upload image" : "Paste URL"}
                  </button>
                ))}
              </div>

              {uploadMode === "file" ? (
                <div>
                  <motion.div
                    animate={isDragging ? { borderColor: "#10b981", background: "rgba(16,185,129,0.05)" } : {}}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] transition-all hover:border-white/[0.22] hover:bg-white/[0.04]"
                  >
                    {isDragging && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        animate={{
                          boxShadow: [
                            "inset 0 0 0 2px rgba(16,185,129,0.4)",
                            "inset 0 0 0 2px rgba(16,185,129,0.7)",
                            "inset 0 0 0 2px rgba(16,185,129,0.4)",
                          ],
                        }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                    {imagePreviewUrl ? (
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src={imagePreviewUrl}
                          alt="Preview"
                          className="max-h-32 max-w-xs rounded-lg object-contain"
                        />
                        <p className="text-xs text-emerald-400">Image ready · Click to change</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
                          <Upload className="h-5 w-5 text-white/40" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-white/70">Drop an image here</p>
                          <p className="mt-0.5 text-xs text-white/30">or click to browse · PNG, JPG, WebP</p>
                        </div>
                      </>
                    )}
                  </motion.div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setImagePreviewUrl(e.target.value);
                    }}
                    placeholder="https://yourorg.org/screenshot.jpg"
                    className="border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/25"
                  />
                  {imagePreviewUrl && (
                    <div className="flex justify-center overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        className="max-h-32 rounded-lg object-contain"
                        onError={() => setImagePreviewUrl("")}
                      />
                    </div>
                  )}
                </div>
              )}

              <p className="mt-4 text-xs text-white/25">
                Acceptable: website screenshots, logos, flyers, team photos, field work photos
              </p>

              <Button
                onClick={runAnalysis}
                disabled={uploadMode === "file" ? !imageBase64 : !urlInput}
                className="mt-5 w-full gap-2 bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" />
                Analyze with Claude Vision
              </Button>
            </div>
          )}

          {/* Analyzing Phase */}
          {phase === "analyzing" && (
            <div className="p-8">
              <div className="mb-6 text-center">
                <h2 className="text-lg font-bold text-white">Claude is reading your image</h2>
                <p className="mt-1 text-sm text-white/40">This takes about 5–8 seconds</p>
              </div>

              {/* Image with pulsing border */}
              {imagePreviewUrl && (
                <div className="mb-6 flex justify-center">
                  <motion.div
                    animate={{
                      boxShadow: [
                        "0 0 0 2px rgba(16,185,129,0.3), 0 0 24px rgba(16,185,129,0.1)",
                        "0 0 0 2px rgba(16,185,129,0.7), 0 0 40px rgba(16,185,129,0.2)",
                        "0 0 0 2px rgba(16,185,129,0.3), 0 0 24px rgba(16,185,129,0.1)",
                      ],
                    }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="overflow-hidden rounded-xl"
                  >
                    <img
                      src={imagePreviewUrl}
                      alt="Analyzing"
                      className="max-h-36 max-w-[280px] object-contain"
                    />
                  </motion.div>
                </div>
              )}

              {/* Stage progress */}
              <div className="mb-6 space-y-3">
                {STAGES.map((stage, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: analysisStage >= i ? 1 : 0.3 }}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all ${
                      analysisStage === i
                        ? "border-emerald-500/30 bg-emerald-500/8"
                        : analysisStage > i
                        ? "border-white/[0.04] bg-white/[0.02]"
                        : "border-white/[0.04]"
                    }`}
                  >
                    <span className="text-lg">{stage.icon}</span>
                    <span className="flex-1 text-sm font-medium text-white/80">{stage.label}</span>
                    {analysisStage > i && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {analysisStage === i && <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />}
                  </motion.div>
                ))}
              </div>

              {/* Observations typewriter */}
              {observations.length > 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-400/60">
                    Claude's observations
                  </p>
                  <ul className="space-y-2">
                    <AnimatePresence>
                      {observations.map((obs, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4 }}
                          className="flex items-start gap-2 text-xs text-white/60"
                        >
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          {obs}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Confirm Phase */}
          {phase === "confirm" && profile && (
            <div className="p-8">
              <div className="mb-6 flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">We built your profile from your image!</h2>
                  <p className="text-sm text-white/45">Review and edit before we find your grants.</p>
                </div>
              </div>

              {imagePreviewUrl && (
                <div className="mb-5 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <img
                    src={imagePreviewUrl}
                    alt="Source"
                    className="h-12 w-12 rounded-lg object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                  <div>
                    <p className="text-xs text-white/30">Analyzed image</p>
                    <p className="text-xs font-medium text-emerald-400">{profile.org_type} · {profile.location}</p>
                  </div>
                  <button
                    onClick={() => setPhase("upload")}
                    className="ml-auto flex items-center gap-1 rounded-md border border-white/[0.06] px-2 py-1 text-xs text-white/30 hover:text-white/60"
                  >
                    <RefreshCw className="h-3 w-3" /> Retry
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Organization name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="border-white/[0.08] bg-white/[0.03] text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Mission statement</label>
                  <Input
                    value={editMission}
                    onChange={(e) => setEditMission(e.target.value)}
                    className="border-white/[0.08] bg-white/[0.03] text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/40">Location</label>
                    <Input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="border-white/[0.08] bg-white/[0.03] text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-white/40">Annual funding goal</label>
                    <Input
                      value={editFunding}
                      onChange={(e) => setEditFunding(e.target.value)}
                      className="border-white/[0.08] bg-white/[0.03] text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/40">Focus areas (comma-separated)</label>
                  <Input
                    value={editFocusAreas}
                    onChange={(e) => setEditFocusAreas(e.target.value)}
                    className="border-white/[0.08] bg-white/[0.03] text-white"
                  />
                </div>
              </div>

              <Button
                onClick={handleConfirm}
                disabled={isConfirming || !editName || !editMission}
                className="mt-6 w-full gap-2 bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40"
              >
                {isConfirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {isConfirming ? "Finding your grants..." : "Confirm & Find Grants"}
              </Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
