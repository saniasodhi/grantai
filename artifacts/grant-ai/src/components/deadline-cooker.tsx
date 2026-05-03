import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSoundEnabled } from "@/lib/sounds";

interface DeadlineCookerProps {
  grantName: string;
  grantId: number;
  applicationId?: number;
  deadline: Date;
  winProbability: number | null;
  draftLength: number;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function getTimeLeft(deadline: Date): TimeLeft {
  const total = deadline.getTime() - Date.now();
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / 1000 / 60 / 60) % 24);
  const days = Math.floor(total / 1000 / 60 / 60 / 24);
  return { days, hours, minutes, seconds, total };
}

export function DeadlineCooker({
  grantName,
  grantId,
  applicationId,
  deadline,
  winProbability,
}: DeadlineCookerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(deadline));
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSecRef = useRef(-1);

  useEffect(() => {
    tickRef.current = setInterval(() => {
      const t = getTimeLeft(deadline);
      setTimeLeft(t);

      if (isSoundEnabled() && t.seconds !== lastSecRef.current && t.total > 0) {
        lastSecRef.current = t.seconds;
        try {
          if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
          const ac = audioCtxRef.current;
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = "sine";
          osc.frequency.value = t.days < 7 ? 880 : 440;
          gain.gain.setValueAtTime(0.025, ac.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.07);
          osc.connect(gain);
          gain.connect(ac.destination);
          osc.start(ac.currentTime);
          osc.stop(ac.currentTime + 0.07);
        } catch { /* ignore */ }
      }
    }, 1000) as unknown as ReturnType<typeof setInterval>;

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [deadline]);

  // Only render if within 30 days and deadline hasn't passed
  if (timeLeft.total <= 0 || timeLeft.days >= 30) return null;

  const isUrgent = timeLeft.days < 7;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-center gap-4 rounded-xl border px-4 py-3 bg-[#131826] ${
        isUrgent ? "border-red-500/20" : "border-amber-500/15"
      }`}
    >
      <Clock className={`h-4 w-4 shrink-0 ${isUrgent ? "text-red-400" : "text-amber-400"}`} />

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-[#F8FAFC]">{grantName}</p>
        <p className="text-xs text-[#94A3B8]">
          {isUrgent ? "Deadline approaching fast" : "Upcoming deadline"}
          {winProbability != null && ` · ${winProbability}% win probability`}
        </p>
      </div>

      {/* Compact countdown */}
      <div className={`flex items-center gap-0.5 font-mono text-sm font-bold tabular-nums ${isUrgent ? "text-red-400" : "text-amber-400"}`}>
        <span>{pad(timeLeft.days)}d</span>
        <span className="mx-1 text-white/20">:</span>
        <span className="text-[#94A3B8]">{pad(timeLeft.hours)}h</span>
        <span className="mx-1 text-white/20">:</span>
        <span className="text-[#94A3B8]">{pad(timeLeft.minutes)}m</span>
      </div>

      <Link href={applicationId ? `/applications/${applicationId}` : `/grants/${grantId}`}>
        <Button size="sm" className="h-8 shrink-0 gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600">
          <Zap className="h-3 w-3" />
          {applicationId ? "Continue" : "Apply"}
        </Button>
      </Link>
    </motion.div>
  );
}
