import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AiThinkingOverlayProps {
  visible: boolean;
  phase?: "matching" | "writing";
}

const THINKING_PHRASES_MATCHING = [
  "Analyzing mission alignment...",
  "Cross-referencing eligibility criteria...",
  "Calculating impact potential...",
  "Scanning funder priorities...",
  "Mapping focus area overlap...",
  "Evaluating geographic fit...",
  "Assessing historical award patterns...",
  "Ranking by win probability...",
  "Synthesizing relevance scores...",
  "Comparing 50 funding opportunities...",
];

const THINKING_PHRASES_WRITING = [
  "Synthesizing organization mission...",
  "Aligning language to funder values...",
  "Crafting compelling narrative arc...",
  "Building impact evidence framework...",
  "Weaving in specific program details...",
  "Calibrating persuasion techniques...",
  "Generating outcome metrics...",
  "Polishing for funder alignment...",
];

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  pulseTimer: number;
  connections: number[];
}

export function AiThinkingOverlay({ visible, phase = "matching" }: AiThinkingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [termLines, setTermLines] = useState<string[]>([]);
  const phraseRef = useRef(0);

  const PHRASES = phase === "matching" ? THINKING_PHRASES_MATCHING : THINKING_PHRASES_WRITING;

  // Neural network animation
  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    const NODE_COUNT = 32;

    const nodes: Node[] = Array.from({ length: NODE_COUNT }, (_, i) => ({
      x: 80 + Math.random() * (W - 160),
      y: 80 + Math.random() * (H - 160),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      active: i < 4,
      pulseTimer: Math.random() * 100,
      connections: [],
    }));

    // Build k-nearest connections
    for (let i = 0; i < nodes.length; i++) {
      const dists = nodes
        .map((n, j) => ({ j, d: Math.hypot(n.x - nodes[i].x, n.y - nodes[i].y) }))
        .filter((e) => e.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
        .map((e) => e.j);
      nodes[i].connections = dists;
    }

    const drawFrame = () => {
      ctx.clearRect(0, 0, W, H);

      // Propagate activation
      for (const node of nodes) {
        node.pulseTimer++;
        if (node.active && node.pulseTimer % 60 === 0) {
          const target = node.connections[Math.floor(Math.random() * node.connections.length)];
          if (target !== undefined) nodes[target].active = true;
        }
        if (node.pulseTimer > 200) {
          node.active = Math.random() > 0.7;
          node.pulseTimer = 0;
        }
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 20 || node.x > W - 20) node.vx *= -1;
        if (node.y < 20 || node.y > H - 20) node.vy *= -1;
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (const j of a.connections) {
          const b = nodes[j];
          const active = a.active && b.active;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = active
            ? `rgba(59,130,246,0.6)`
            : `rgba(255,255,255,0.06)`;
          ctx.lineWidth = active ? 1.5 : 0.5;
          ctx.stroke();
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const glow = node.active ? 16 : 4;
        const color = node.active ? "#3b82f6" : "rgba(255,255,255,0.2)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.active ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowBlur = glow;
        ctx.shadowColor = node.active ? "#3b82f6" : "transparent";
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();
    return () => cancelAnimationFrame(animRef.current);
  }, [visible]);

  // Phrase cycling
  useEffect(() => {
    if (!visible) return;
    phraseRef.current = 0;
    setCurrentPhrase(0);
    const interval = setInterval(() => {
      phraseRef.current = (phraseRef.current + 1) % PHRASES.length;
      setCurrentPhrase(phraseRef.current);
    }, 2000);
    return () => clearInterval(interval);
  }, [visible, PHRASES.length]);

  // Typewriter for active phrase
  useEffect(() => {
    if (!visible) return;
    const phrase = PHRASES[currentPhrase];
    setTypedText("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedText(phrase.slice(0, i));
      if (i >= phrase.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [currentPhrase, visible, PHRASES]);

  // Terminal log lines
  useEffect(() => {
    if (!visible) { setTermLines([]); return; }
    const LOGS = [
      "> Initializing grant corpus scan...",
      "> Loading 50 grant profiles...",
      "> Vectorizing mission statement...",
      "> Computing semantic similarity...",
      "> Applying eligibility filters...",
      "> Scoring mission alignment...",
      "> Calculating win probability...",
      "> Ranking top candidates...",
      "> Preparing match report...",
    ];
    let idx = 0;
    setTermLines([]);
    const interval = setInterval(() => {
      if (idx < LOGS.length) {
        setTermLines((prev) => [...prev.slice(-5), LOGS[idx]]);
        idx++;
      }
    }, 900);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: "rgba(2,6,23,0.97)", backdropFilter: "blur(20px)" }}
        >
          {/* Neural canvas background */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
          />

          {/* Central orb */}
          <div className="relative z-10 flex flex-col items-center gap-10">
            <div className="relative flex items-center justify-center">
              {/* Concentric rings */}
              {[100, 76, 52].map((size, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border border-blue-500/30"
                  style={{ width: size, height: size }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.1, 0.4] }}
                  transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.4 }}
                />
              ))}
              {/* Core orb */}
              <motion.div
                className="relative flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  background: "radial-gradient(circle, #3b82f6 0%, #1d4ed8 60%, #1e3a8a 100%)",
                  boxShadow: "0 0 40px #3b82f688, 0 0 80px #3b82f644",
                }}
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="text-2xl">🧠</span>
              </motion.div>
            </div>

            {/* Typewriter phrase */}
            <div className="text-center space-y-2">
              <p className="text-xl font-semibold text-blue-200 h-8 font-mono">
                {typedText}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="text-blue-400"
                >
                  |
                </motion.span>
              </p>
              <p className="text-sm text-white/30">
                {phase === "matching" ? "Analyzing grant opportunities with Claude AI" : "Drafting your application with Claude AI"}
              </p>
            </div>

            {/* Terminal log */}
            <div className="w-96 rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
                <span className="ml-2 text-white/30">grant-ai — claude-sonnet-4-6</span>
              </div>
              <div className="space-y-1 min-h-[100px]">
                {termLines.map((line, i) => (
                  <motion.div
                    key={i + line}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-emerald-400"
                  >
                    {line}
                  </motion.div>
                ))}
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="text-emerald-400"
                >
                  ▋
                </motion.span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
