import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Zap, Camera } from "lucide-react";
import { MagicModeModal } from "@/components/magic-mode-modal";
import { VisionModal } from "@/components/vision-modal";

const EXAMPLES = [
  {
    id: 1,
    emoji: "🎓",
    title: "EdTech for Underserved Students",
    subtitle: "Education · AI · Youth",
    description: "We're a nonprofit teaching AI and coding skills to underserved students in underfunded public schools across the US",
    color: "from-blue-600 to-indigo-600",
    glow: "rgba(99,102,241,0.3)",
    border: "border-indigo-500/30",
    bg: "bg-indigo-500/5",
  },
  {
    id: 2,
    emoji: "🌱",
    title: "Amazon Deforestation Fighter",
    subtitle: "Climate · Conservation · Global",
    description: "We're a climate nonprofit using satellite technology and indigenous partnerships to halt deforestation in the Amazon rainforest",
    color: "from-emerald-600 to-teal-600",
    glow: "rgba(16,185,129,0.3)",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
  },
  {
    id: 3,
    emoji: "♿",
    title: "Accessible Tech for Disability Rights",
    subtitle: "Disability · Technology · Inclusion",
    description: "We're a disability rights organization building open-source assistive technology tools to make the web accessible for blind and deaf users",
    color: "from-violet-600 to-purple-600",
    glow: "rgba(139,92,246,0.3)",
    border: "border-violet-500/30",
    bg: "bg-violet-500/5",
  },
];

const VISION_EXAMPLES = [
  {
    id: "v1",
    label: "Girls Who Code",
    sublabel: "Nonprofit logo · Education",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80",
    accent: "emerald",
    border: "border-emerald-500/25",
    bg: "bg-emerald-500/5",
    glow: "rgba(16,185,129,0.25)",
  },
  {
    id: "v2",
    label: "Diverse Women in Tech",
    sublabel: "Team photo · Technology",
    imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80",
    accent: "blue",
    border: "border-blue-500/25",
    bg: "bg-blue-500/5",
    glow: "rgba(59,130,246,0.25)",
  },
  {
    id: "v3",
    label: "Field Education Work",
    sublabel: "Field photo · Youth programs",
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80",
    accent: "blue",
    border: "border-sky-500/25",
    bg: "bg-sky-500/5",
    glow: "rgba(14,165,233,0.25)",
  },
];

export default function Showcase() {
  const [magicOpen, setMagicOpen] = useState(false);
  const [selectedDescription, setSelectedDescription] = useState("");
  const [visionOpen, setVisionOpen] = useState(false);
  const [visionImageUrl, setVisionImageUrl] = useState("");

  const openMagic = (description: string) => {
    setSelectedDescription(description);
    setMagicOpen(true);
  };

  const openVision = (imageUrl: string) => {
    setVisionImageUrl(imageUrl);
    setVisionOpen(true);
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(160deg, #050d1a 0%, #0a1a12 50%, #0d0a1a 100%)" }}
    >
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6">
        <a href="/" className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "linear-gradient(135deg, #3b82f6, #10b981)" }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">GrantAI</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm text-white/50 hover:text-white transition-colors">Home</a>
          <a
            href="/onboard"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto max-w-4xl px-8 py-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-300">
            <Zap className="h-3.5 w-3.5" />
            Live Demo — No signup needed
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white md:text-6xl">
            Watch Autopilot
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #3b82f6, #10b981)" }}
            >
              in Action
            </span>
          </h1>
          <p className="mt-6 text-xl text-white/50 max-w-xl mx-auto">
            Click any organization below to see our AI find matching grants and write a full application — in under 15 seconds.
          </p>
        </motion.div>

        {/* Example cards */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {EXAMPLES.map((ex, i) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
            >
              <motion.button
                onClick={() => openMagic(ex.description)}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
                className={`group w-full rounded-2xl border p-6 text-left transition-all duration-300 ${ex.border} ${ex.bg} hover:shadow-2xl`}
                style={{ boxShadow: `0 0 0 1px transparent` }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 60px ${ex.glow}`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 1px transparent`;
                }}
                data-testid={`showcase-example-${ex.id}`}
              >
                <div className="mb-4 text-4xl">{ex.emoji}</div>
                <h3 className="text-base font-bold text-white leading-tight">{ex.title}</h3>
                <p className="mt-1 text-xs text-white/40">{ex.subtitle}</p>
                <p className="mt-3 text-sm leading-relaxed text-white/60">{ex.description}</p>
                <div className="mt-5 flex items-center justify-between">
                  <span
                    className={`rounded-full bg-gradient-to-r px-3 py-1 text-xs font-bold text-white ${ex.color}`}
                  >
                    🎯 Try Autopilot
                  </span>
                  <ArrowRight className="h-4 w-4 text-white/30 transition-transform group-hover:translate-x-1 group-hover:text-white/70" />
                </div>
              </motion.button>
            </motion.div>
          ))}
        </div>

        {/* Or enter your own */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12"
        >
          <p className="text-sm text-white/30 mb-4">— or —</p>
          <motion.button
            onClick={() => openMagic("")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/70 hover:border-white/20 hover:text-white transition-all"
          >
            <Sparkles className="h-4 w-4" />
            Enter your own organization
          </motion.button>
        </motion.div>
      </div>

      {/* ── Vision Examples Section ── */}
      <div className="mx-auto max-w-4xl px-8 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300">
            <Camera className="h-3.5 w-3.5" />
            NEW — Vision Onboarding
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white">
            Claude Reads Your Image
          </h2>
          <p className="mt-3 text-base text-white/45 max-w-md mx-auto">
            Click any photo below and watch Claude instantly build a nonprofit profile from a single image — no typing required.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {VISION_EXAMPLES.map((ex, i) => (
            <motion.div
              key={ex.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <motion.button
                onClick={() => openVision(ex.imageUrl)}
                whileHover={{ scale: 1.03, y: -4 }}
                whileTap={{ scale: 0.97 }}
                className={`group relative w-full overflow-hidden rounded-2xl border text-left ${ex.border} ${ex.bg}`}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 50px ${ex.glow}`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={ex.imageUrl}
                    alt={ex.label}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">{ex.label}</p>
                      <p className="text-xs text-white/50">{ex.sublabel}</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur-sm transition-all group-hover:border-emerald-500/40 group-hover:bg-emerald-500/20">
                      <Camera className="h-3.5 w-3.5 text-white/70 group-hover:text-emerald-300" />
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-white/40">
                    Click to analyze with Claude Vision →
                  </p>
                </div>
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mx-auto max-w-4xl px-8 pb-24">
        <div className="rounded-2xl border border-white/10 bg-white/3 p-8">
          <h2 className="mb-6 text-center text-sm font-bold uppercase tracking-widest text-white/40">How Autopilot Works</h2>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { emoji: "🧠", label: "Describe your org", sub: "One sentence is all we need" },
              { emoji: "🔍", label: "AI scans 50K+ grants", sub: "Using Claude to rank by fit" },
              { emoji: "📊", label: "Fit scores calculated", sub: "With win probability analysis" },
              { emoji: "✍️", label: "Application drafted", sub: "300-word tailored letter" },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="mb-3 text-3xl">{step.emoji}</div>
                <p className="text-sm font-semibold text-white">{step.label}</p>
                <p className="mt-1 text-xs text-white/40">{step.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <MagicModeModal
        open={magicOpen}
        onClose={() => setMagicOpen(false)}
        prefillDescription={selectedDescription}
      />
      <VisionModal
        open={visionOpen}
        onClose={() => setVisionOpen(false)}
        prefillImageUrl={visionImageUrl}
      />
    </div>
  );
}
