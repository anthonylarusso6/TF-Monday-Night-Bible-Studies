"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const SECTIONS = [
  { label: "Opening",        minutes: 5,  color: "#0f4f6a" },
  { label: "Verse Breakdown",minutes: 10, color: "#1a7a9e" },
  { label: "Discussion",     minutes: 15, color: "#047857" },
  { label: "Takeaways",      minutes: 7,  color: "#b45309" },
  { label: "Prayer & Wrap",  minutes: 3,  color: "#6d28d9" },
];
const TOTAL = SECTIONS.reduce((s, x) => s + x.minutes * 60, 0); // 40 min in seconds

interface SessionTimerProps {
  onClose: () => void;
}

export default function SessionTimer({ onClose }: SessionTimerProps) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [warned, setWarned] = useState<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const remaining = Math.max(0, TOTAL - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const done = remaining === 0;

  // Which section are we in?
  let sectionElapsed = elapsed;
  let currentSectionIdx = 0;
  let sectionRemaining = 0;
  let accumulated = 0;
  for (let i = 0; i < SECTIONS.length; i++) {
    const sectionSecs = SECTIONS[i].minutes * 60;
    if (sectionElapsed < sectionSecs) {
      currentSectionIdx = i;
      sectionRemaining = sectionSecs - sectionElapsed;
      break;
    }
    sectionElapsed -= sectionSecs;
    accumulated += sectionSecs;
    if (i === SECTIONS.length - 1) {
      currentSectionIdx = i;
      sectionRemaining = 0;
    }
  }
  const currentSection = SECTIONS[currentSectionIdx];
  const sectionProgress = 1 - sectionRemaining / (currentSection.minutes * 60);
  const totalProgress = elapsed / TOTAL;

  // Beep when entering last minute of a section
  const beep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        // Warn when 60 seconds left in any section
        let acc = 0;
        for (let i = 0; i < SECTIONS.length; i++) {
          acc += SECTIONS[i].minutes * 60;
          const warnAt = acc - 60;
          if (next === warnAt && !warned.has(i)) {
            setWarned(w => new Set(w).add(i));
            beep();
          }
        }
        if (next >= TOTAL) { clearInterval(intervalRef.current!); beep(); beep(); }
        return Math.min(next, TOTAL);
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, warned, beep]);

  function reset() { setElapsed(0); setRunning(false); setWarned(new Set()); }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(5,18,28,0.92)", zIndex: 2000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, backdropFilter: "blur(8px)" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.1)", border: "none", color: "white", borderRadius: 10, padding: "8px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>✕ Close</button>

      {/* Current section */}
      <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
        {done ? "Session Complete" : `Section ${currentSectionIdx + 1} of ${SECTIONS.length}`}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "white", marginBottom: 24 }}>
        {done ? "🎉 Time's Up!" : currentSection.label}
      </div>

      {/* Big timer */}
      <div style={{ fontSize: "clamp(64px,18vw,96px)", fontWeight: 900, color: done ? "#ef4444" : "white", fontVariantNumeric: "tabular-nums", letterSpacing: "-2px", lineHeight: 1, marginBottom: 8 }}>
        {String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
      </div>
      <div style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 32 }}>
        {done ? "" : `${Math.floor(sectionRemaining / 60)}:${String(sectionRemaining % 60).padStart(2,"0")} left in this section`}
      </div>

      {/* Section progress bar */}
      {!done && (
        <div style={{ width: "100%", maxWidth: 320, marginBottom: 32 }}>
          <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ height: "100%", background: currentSection.color, borderRadius: 3, width: `${sectionProgress * 100}%`, transition: "width 1s linear" }} />
          </div>
          {/* Total progress dots */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
            {SECTIONS.map((s, i) => {
              const sStart = SECTIONS.slice(0,i).reduce((a,x)=>a+x.minutes*60,0);
              const sEnd = sStart + s.minutes * 60;
              const done_ = elapsed >= sEnd;
              const active_ = i === currentSectionIdx;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: done_ ? 0.4 : 1 }}>
                  <div style={{ width: active_ ? 28 : 8, height: 6, borderRadius: 3, background: done_ ? "rgba(255,255,255,0.3)" : active_ ? s.color : "rgba(255,255,255,0.15)", transition: "all 0.3s" }} />
                  {active_ && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>{s.label}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Section list */}
      <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap", justifyContent: "center" }}>
        {SECTIONS.map((s, i) => {
          const sStart = SECTIONS.slice(0,i).reduce((a,x)=>a+x.minutes*60,0);
          const isDone = elapsed >= sStart + s.minutes * 60;
          const isActive = i === currentSectionIdx && !done;
          return (
            <div key={i} style={{ padding: "6px 12px", borderRadius: 20, background: isActive ? s.color : isDone ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)", color: isActive ? "white" : isDone ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: isActive ? 700 : 500, border: `1px solid ${isActive ? s.color : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", gap: 5 }}>
              {isDone && "✓ "}{s.label} <span style={{ opacity: 0.6 }}>{s.minutes}m</span>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12 }}>
        {!done && (
          <button
            onClick={() => setRunning(r => !r)}
            style={{ padding: "14px 36px", background: running ? "#dc2626" : "#047857", color: "white", border: "none", borderRadius: 14, fontSize: 18, fontWeight: 800, cursor: "pointer", minWidth: 140 }}
          >
            {running ? "⏸ Pause" : elapsed === 0 ? "▶ Start" : "▶ Resume"}
          </button>
        )}
        <button onClick={reset} style={{ padding: "14px 24px", background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
          ↺ Reset
        </button>
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
        Total: 40 minutes · Beeps at 1 min warning per section
      </div>
    </div>
  );
}
