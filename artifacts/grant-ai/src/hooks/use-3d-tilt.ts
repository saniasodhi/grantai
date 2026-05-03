import { useRef, useCallback } from "react";

export function use3DTilt(max = 10) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(700px) rotateY(${x * max}deg) rotateX(${-y * max}deg) scale3d(1.03,1.03,1.03)`;
      el.style.boxShadow = `${-x * 24}px ${-y * 24}px 48px rgba(59,130,246,0.18), 0 8px 32px rgba(0,0,0,0.3)`;
      el.style.transition = "box-shadow 0.05s";
    },
    [max],
  );

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    el.style.boxShadow = "";
    el.style.transition = "transform 0.4s ease, box-shadow 0.4s ease";
  }, []);

  return { ref, handleMove, handleLeave };
}
