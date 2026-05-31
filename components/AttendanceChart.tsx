"use client";
import { Study, UserData } from "@/lib/types";

interface AttendanceChartProps {
  studies: Study[];
  userData: UserData;
  goal: number;
}

export default function AttendanceChart({ studies, userData, goal }: AttendanceChartProps) {
  const sessions = studies
    .filter((s) => !s.draft && userData.attendance[String(s.id)])
    .map((s) => ({
      label: s.date.replace(/,?\s*\d{4}$/, ""),
      count: userData.attendance[String(s.id)],
      title: s.title,
    }))
    .slice(0, 12)
    .reverse();

  if (!sessions.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text2)", fontFamily: "Arial, sans-serif", fontSize: 14 }}>
        No attendance recorded yet. Save attendance in a study to see the chart.
      </div>
    );
  }

  const max = Math.max(...sessions.map((s) => s.count), goal, 1);

  return (
    <div style={{ padding: "4px 0 8px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, padding: "0 4px" }}>
        {/* Goal line */}
        <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 8, flex: 1, height: "100%" }}>
          <div style={{
            position: "absolute",
            bottom: `${(goal / max) * 100}%`,
            left: 0,
            right: 0,
            borderTop: "2px dashed var(--gold)",
            zIndex: 1,
          }}>
            <span style={{ position: "absolute", right: 0, top: -18, fontSize: 10, fontFamily: "Arial, sans-serif", color: "var(--gold)", fontWeight: 700 }}>
              Goal: {goal}
            </span>
          </div>
          {sessions.map((s, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "Arial, sans-serif", color: "var(--text)" }}>{s.count}</span>
              <div
                title={s.title}
                style={{
                  width: "100%",
                  height: `${(s.count / max) * 100}%`,
                  background: s.count >= goal ? "#2e8b57" : "var(--accent)",
                  borderRadius: "4px 4px 0 0",
                  minHeight: 4,
                  transition: "height 0.3s ease",
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, padding: "6px 4px 0" }}>
        {sessions.map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: 10, fontFamily: "Arial, sans-serif", color: "var(--text2)", lineHeight: 1.2, overflow: "hidden" }}>
            {s.label}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 10, fontFamily: "Arial, sans-serif", fontSize: 11 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 12, background: "#2e8b57", borderRadius: 2, display: "inline-block" }} /> Met goal
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 12, background: "var(--accent)", borderRadius: 2, display: "inline-block" }} /> Below goal
        </span>
      </div>
    </div>
  );
}
