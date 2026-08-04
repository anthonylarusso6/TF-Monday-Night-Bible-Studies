"use client";
import { useEffect, useState, useCallback } from "react";
import { STUDIES } from "@/lib/studies";
import { LOCATIONS } from "@/lib/locations";
import { loadUserData, loadStudies } from "@/lib/supabase";
import type { StudyStore } from "@/lib/supabase";
import { UserData } from "@/lib/types";

interface LocationStats {
  locationId: string;
  name: string;
  color: string;
  city: string;
  totalStudies: number;
  avgAttendance: number | null;
  totalSessions: number;
  likedCount: number;
  draftCount: number;
  lastSession: string | null;
  topSeries: string | null;
}

function computeStats(
  locationId: string,
  userData: UserData,
  store: StudyStore
): Omit<LocationStats, "name" | "color" | "city"> {
  const loc = LOCATIONS.find(l => l.id === locationId)!;
  const builtIn = loc.hasBuiltInStudies ? STUDIES : [];
  const hidden = new Set(store.hiddenIds);
  const allStudies = [...store.studies, ...builtIn, ...userData.drafts]
    .filter(s => !hidden.has(String(s.id)));
  const published = allStudies.filter(s => !s.draft);

  const attendVals = Object.values(userData.attendance).filter(Boolean) as number[];
  const avgAttendance = attendVals.length ? Math.round(attendVals.reduce((a, b) => a + b, 0) / attendVals.length) : null;

  // Top series
  const seriesCounts: Record<string, number> = {};
  published.forEach(s => { if (s.series) seriesCounts[s.series] = (seriesCounts[s.series] || 0) + 1; });
  const topSeries = Object.entries(seriesCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Last session with attendance
  const sessionsWithAttend = Object.keys(userData.attendance).filter(k => userData.attendance[k]);
  const lastStudy = sessionsWithAttend.length > 0
    ? published.find(s => String(s.id) === sessionsWithAttend[sessionsWithAttend.length - 1])
    : null;

  return {
    locationId,
    totalStudies: published.length,
    avgAttendance,
    totalSessions: attendVals.length,
    likedCount: Object.values(userData.liked).filter(Boolean).length,
    draftCount: userData.drafts.length,
    lastSession: lastStudy?.date || null,
    topSeries,
  };
}

export default function LocationDashboard() {
  const [stats, setStats] = useState<LocationStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    Promise.all(
      LOCATIONS.map(async (loc) => {
        const [userData, store] = await Promise.all([
          loadUserData(loc.id),
          loadStudies(loc.id),
        ]);
        return {
          ...computeStats(loc.id, userData, store),
          name: loc.name,
          color: loc.color,
          city: loc.city,
        };
      })
    )
      .then(results => setStats(results))
      // Without this the spinner never clears on a dropped connection.
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text2)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3, borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
        Loading all locations...
      </div>
    );
  }

  if (failed) {
    return (
      <div style={{ textAlign: "center", padding: "50px 24px", color: "var(--text2)", fontFamily: "Arial, sans-serif" }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>📡</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>Couldn&apos;t load the other locations</div>
        <p style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 300, margin: "0 auto 18px" }}>
          This needs a connection. Check your signal and try again.
        </p>
        <button onClick={load} style={{ padding: "10px 20px", background: "var(--primary)", color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Location Dashboard</h3>
        <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.6 }}>
          All Triple F locations at a glance.
        </p>
      </div>

      {/* Location cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, marginBottom: 28 }}>
        {stats.map(s => (
          <div key={s.locationId} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderTop: `4px solid ${s.color}`, borderRadius: "var(--radius)", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "var(--text2)" }}>{s.city}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Studies", value: s.totalStudies },
                { label: "Avg Attendance", value: s.avgAttendance ?? "—" },
                { label: "Sessions Tracked", value: s.totalSessions },
                { label: "Liked Studies", value: s.likedCount },
                { label: "Drafts", value: s.draftCount },
                { label: "Top Series", value: s.topSeries ? s.topSeries.split(" ")[0] + "..." : "—" },
              ].map(stat => (
                <div key={stat.label} style={{ background: "var(--bg)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontSize: 10, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 3 }}>{stat.label}</div>
                </div>
              ))}
            </div>
            {s.lastSession && (
              <div style={{ marginTop: 12, fontSize: 11, color: "var(--text2)", fontFamily: "Arial, sans-serif" }}>
                Last session: {s.lastSession}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comparison bar */}
      {stats.length === 2 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px" }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--text2)", marginBottom: 16 }}>Comparison</div>
          {[
            { label: "Total Studies", key: "totalStudies" as keyof LocationStats },
            { label: "Avg Attendance", key: "avgAttendance" as keyof LocationStats },
            { label: "Sessions Tracked", key: "totalSessions" as keyof LocationStats },
          ].map(metric => {
            const vals = stats.map(s => Number(s[metric.key]) || 0);
            const max = Math.max(...vals, 1);
            return (
              <div key={metric.label} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text2)", fontFamily: "Arial, sans-serif" }}>{metric.label}</span>
                </div>
                {stats.map((s, i) => (
                  <div key={s.locationId} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", background: s.color, borderRadius: 4, width: `${(vals[i] / max) * 100}%`, transition: "width 0.5s ease" }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", minWidth: 24, textAlign: "right" }}>{vals[i] || "—"}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
