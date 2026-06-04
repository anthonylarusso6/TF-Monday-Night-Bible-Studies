"use client";
import { useState, useEffect } from "react";
import { LEADERSHIP_PRINCIPLES, DAILY_VERSES, LeadershipPrinciple } from "@/lib/leadership";
import { RESOURCE_LIBRARY, Resource } from "@/lib/resources";
import { Study, UserData } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PrepGuide {
  openingPrayer: string;
  personalReflections: string[];
  prepTips: { section: string; tip: string }[];
  watchFor: string;
  closingChallenge: string;
}

interface SeasonVerse {
  ref: string;
  text: string;
}

interface CoachProfile {
  name: string;
  role: string;
}

interface CoachGrowProps {
  latestStudy: Study | null;
  allStudies: Study[];
  userData: UserData;
  attendanceGoal: number;
  onSaveReflection: (text: string) => void;
  onSaveProfile: (profile: CoachProfile) => void;
  onSaveSeasonVerse: (verse: SeasonVerse) => void;
}

type Section = "dashboard" | "prep" | "verse" | "library" | "resources" | "journal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadProfile(userData: UserData): CoachProfile {
  try { return JSON.parse((userData.notes as Record<string,string>)._coach_profile || "{}"); } catch { return { name: "", role: "Head Coach" }; }
}
function loadSeasonVerse(userData: UserData): SeasonVerse | null {
  try { return JSON.parse((userData.notes as Record<string,string>)._season_verse || "null"); } catch { return null; }
}
function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "TF";
}

function computeStreak(allStudies: Study[], userData: UserData): number {
  const published = allStudies.filter(s => !s.draft).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let streak = 0;
  for (const s of published) {
    if (userData.attendance[String(s.id)]) streak++;
    else break;
  }
  return streak;
}

function getAttendanceTrend(allStudies: Study[], userData: UserData): number[] {
  return allStudies
    .filter(s => !s.draft && userData.attendance[String(s.id)])
    .slice(0, 8)
    .reverse()
    .map(s => userData.attendance[String(s.id)]);
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, goal }: { data: number[]; goal: number }) {
  if (data.length < 2) return <div style={{ color: "var(--text2)", fontSize: 12, fontFamily: "Arial, sans-serif" }}>Record attendance on a few sessions to see your trend.</div>;
  const max = Math.max(...data, goal, 1);
  const w = 240, h = 60, pad = 8;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (w - pad * 2),
    h - pad - (v / max) * (h - pad * 2),
  ]);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const goalY = h - pad - (goal / max) * (h - pad * 2);
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      {/* Goal line */}
      <line x1={pad} y1={goalY} x2={w - pad} y2={goalY} stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
      <text x={w - pad + 3} y={goalY + 4} fontSize="9" fill="var(--gold)" opacity="0.8">Goal</text>
      {/* Trend line */}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4" fill={data[i] >= goal ? "var(--series-rel)" : "var(--accent)"} />
      ))}
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CoachGrow({ latestStudy, allStudies, userData, attendanceGoal, onSaveReflection, onSaveProfile, onSaveSeasonVerse }: CoachGrowProps) {
  const [section, setSection] = useState<Section>("dashboard");

  // Profile
  const [profile, setProfile] = useState<CoachProfile>(loadProfile(userData));
  const [editingProfile, setEditingProfile] = useState(!loadProfile(userData).name);
  const [profileName, setProfileName] = useState(profile.name);
  const [profileRole, setProfileRole] = useState(profile.role || "Head Coach");

  // Season verse
  const [seasonVerse, setSeasonVerse] = useState<SeasonVerse | null>(loadSeasonVerse(userData));
  const [editingVerse, setEditingVerse] = useState(false);
  const [verseRef, setVerseRef] = useState(seasonVerse?.ref || "");
  const [verseText, setVerseText] = useState(seasonVerse?.text || "");

  // Prep
  const [prepGuide, setPrepGuide] = useState<PrepGuide | null>(null);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepError, setPrepError] = useState("");

  // Library
  const [selectedPrinciple, setSelectedPrinciple] = useState<LeadershipPrinciple | null>(null);
  const [filterTag, setFilterTag] = useState("All");

  // Resources
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Journal
  const [journalText, setJournalText] = useState(userData.notes["_coach_journal"] || "");
  const [journalSaved, setJournalSaved] = useState(false);

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const dailyVerse = DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
  const tags = ["All", ...Array.from(new Set(LEADERSHIP_PRINCIPLES.map(p => p.tag)))];
  const filteredPrinciples = filterTag === "All" ? LEADERSHIP_PRINCIPLES : LEADERSHIP_PRINCIPLES.filter(p => p.tag === filterTag);

  const streak = computeStreak(allStudies, userData);
  const trend = getAttendanceTrend(allStudies, userData);
  const attendVals = Object.values(userData.attendance).filter(Boolean) as number[];
  const avgAttend = attendVals.length ? Math.round(attendVals.reduce((a,b)=>a+b,0)/attendVals.length) : null;
  const goalPct = avgAttend != null ? Math.min(100, Math.round((avgAttend / attendanceGoal) * 100)) : 0;
  const lastStudyWithAttend = allStudies.find(s => !s.draft && userData.attendance[String(s.id)]);

  async function generatePrep() {
    if (!latestStudy) return;
    setPrepError(""); setPrepLoading(true);
    try {
      const res = await fetch("/api/studyprep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ study: latestStudy }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPrepGuide(data.prep);
    } catch { setPrepError("Couldn't load — check your connection."); }
    finally { setPrepLoading(false); }
  }

  function saveProfile() {
    const p = { name: profileName.trim(), role: profileRole };
    setProfile(p); setEditingProfile(false); onSaveProfile(p);
  }

  function saveVerse() {
    if (!verseRef.trim() || !verseText.trim()) return;
    const v = { ref: verseRef.trim(), text: verseText.trim() };
    setSeasonVerse(v); setEditingVerse(false); onSaveSeasonVerse(v);
  }

  const SECTIONS: { id: Section; icon: string; label: string }[] = [
    { id: "dashboard",  icon: "📊", label: "Dashboard" },
    { id: "prep",       icon: "📖", label: "Study Prep" },
    { id: "verse",      icon: "✝️",  label: "Season Verse" },
    { id: "library",    icon: "🏛️", label: "Leadership" },
    { id: "resources",  icon: "📚", label: "Resources" },
    { id: "journal",    icon: "📔", label: "Reflections" },
  ];

  return (
    <div>
      {/* Coach Profile header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "white", flexShrink: 0 }}>
          {getInitials(profile.name || "TF")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingProfile ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input className="form-input" style={{ flex: 1, minWidth: 120, padding: "7px 10px", fontSize: 14 }} placeholder="Your name" value={profileName} onChange={e => setProfileName(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && saveProfile()} />
              <select className="form-select" style={{ width: "auto", padding: "7px 10px", fontSize: 13 }} value={profileRole} onChange={e => setProfileRole(e.target.value)}>
                <option>Head Coach</option>
                <option>Assistant Coach</option>
                <option>Volunteer</option>
              </select>
              <button className="save-btn" onClick={saveProfile} style={{ margin: 0 }}>Save</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{profile.name || "Set your name"}</div>
              <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: "Arial, sans-serif" }}>{profile.role || "Coach"}</div>
            </>
          )}
        </div>
        {!editingProfile && (
          <button onClick={() => { setEditingProfile(true); setProfileName(profile.name); setProfileRole(profile.role || "Head Coach"); }} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 10px", fontSize: 12, color: "var(--text2)", cursor: "pointer" }}>✎ Edit</button>
        )}
      </div>

      {/* Section nav */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{ padding: "8px 14px", borderRadius: 20, border: `1.5px solid ${section === s.id ? "var(--accent)" : "var(--border)"}`, background: section === s.id ? "rgba(26,138,181,0.1)" : "var(--card)", color: section === s.id ? "var(--accent)" : "var(--text2)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, WebkitTapHighlightColor: "transparent" }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {section === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <div style={{ background: streak > 0 ? "linear-gradient(135deg,var(--primary),#1a6a8e)" : "var(--card)", borderRadius: "var(--radius)", padding: "16px", color: streak > 0 ? "white" : "var(--text)", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 32, lineHeight: 1 }}>{streak > 0 ? "🔥" : "—"}</div>
              <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4 }}>{streak}</div>
              <div style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1, marginTop: 2, fontFamily: "Arial, sans-serif" }}>Session Streak</div>
            </div>
            <div style={{ background: "var(--card)", borderRadius: "var(--radius)", padding: "16px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "var(--text)" }}>{allStudies.filter(s=>!s.draft).length}</div>
              <div style={{ fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 1, marginTop: 2, fontFamily: "Arial, sans-serif" }}>Total Studies</div>
            </div>
            <div style={{ background: "var(--card)", borderRadius: "var(--radius)", padding: "16px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: avgAttend != null && avgAttend >= attendanceGoal ? "var(--series-rel)" : "var(--text)" }}>{avgAttend ?? "—"}</div>
              <div style={{ fontSize: 11, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 1, marginTop: 2, fontFamily: "Arial, sans-serif" }}>Avg Students</div>
            </div>
          </div>

          {/* Goal progress */}
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 1 }}>Goal Progress</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: goalPct >= 100 ? "var(--series-rel)" : "var(--accent)" }}>{avgAttend ?? 0} / {attendanceGoal} students</div>
            </div>
            <div style={{ height: 10, background: "var(--border)", borderRadius: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", background: goalPct >= 100 ? "var(--series-rel)" : "var(--accent)", borderRadius: 5, width: `${goalPct}%`, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 6, fontFamily: "Arial, sans-serif" }}>{goalPct >= 100 ? "🎉 Goal reached!" : `${goalPct}% of goal`}</div>
          </div>

          {/* Attendance trend */}
          {trend.length >= 2 && (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Attendance Trend</div>
              <Sparkline data={trend} goal={attendanceGoal} />
              <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 8, fontFamily: "Arial, sans-serif" }}>Last {trend.length} sessions · Green dot = hit goal</div>
            </div>
          )}

          {/* Last session */}
          {lastStudyWithAttend && (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Last Session</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{lastStudyWithAttend.title}</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "var(--text2)", fontFamily: "Arial, sans-serif" }}>{lastStudyWithAttend.date}</span>
                <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, fontFamily: "Arial, sans-serif" }}>👥 {userData.attendance[String(lastStudyWithAttend.id)]} students</span>
                {(() => { try { const r = JSON.parse((userData.notes as Record<string,string>)[`_rating_${lastStudyWithAttend.id}`] || "{}"); return r.stars ? <span style={{ fontSize: 12 }}>{"⭐".repeat(r.stars)}</span> : null; } catch { return null; } })()}
              </div>
              {(() => { try { const r = JSON.parse((userData.notes as Record<string,string>)[`_rating_${lastStudyWithAttend.id}`] || "{}"); return r.whatHit ? <div style={{ fontSize: 13, color: "var(--text)", marginTop: 6, fontFamily: "Georgia, serif", fontStyle: "italic" }}>&ldquo;{r.whatHit}&rdquo;</div> : null; } catch { return null; } })()}
            </div>
          )}

          {/* Daily verse */}
          <div style={{ background: "linear-gradient(135deg,var(--primary),#1a6a8e)", borderRadius: "var(--radius)", padding: "16px 18px", color: "white" }}>
            <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, opacity: 0.6, marginBottom: 8 }}>Today&apos;s Verse</div>
            <p style={{ fontSize: 14, lineHeight: 1.7, fontFamily: "Georgia, serif", fontStyle: "italic", marginBottom: 8 }}>&ldquo;{dailyVerse.text}&rdquo;</p>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>{dailyVerse.ref}</div>
          </div>
        </div>
      )}

      {/* ── STUDY PREP ── */}
      {section === "prep" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Prepare Your Heart First</h3>
            <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.6 }}>Before you prep the study, sit with it personally. Experience it yourself before you lead it.</p>
          </div>
          {latestStudy ? (
            <>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text2)", marginBottom: 3 }}>Latest Study</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{latestStudy.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>{latestStudy.date}</div>
                </div>
                <button onClick={generatePrep} disabled={prepLoading} style={{ padding: "10px 18px", background: "var(--primary)", color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: prepLoading ? "not-allowed" : "pointer", opacity: prepLoading ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
                  {prepLoading ? <><span className="spinner" />Generating...</> : "✦ Generate Prep Guide"}
                </button>
              </div>
              {prepError && <div className="error-box" style={{ marginBottom: 16 }}>{prepError}</div>}
              {prepGuide && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--accent)", marginBottom: 10 }}>🙏 Opening Prayer</div>
                    <p style={{ fontSize: 14, lineHeight: 1.75, fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--text)" }}>{prepGuide.openingPrayer}</p>
                  </div>
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--primary)", marginBottom: 12 }}>💭 Sit With These Before Monday</div>
                    {prepGuide.personalReflections.map((q, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, padding: "10px 12px", background: "var(--bg)", borderRadius: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--gold)", flexShrink: 0 }}>{i + 1}.</span>
                        <span style={{ fontSize: 13.5, lineHeight: 1.65, fontFamily: "Georgia, serif" }}>{q}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--series-rel)", marginBottom: 12 }}>🎯 Leading Each Section</div>
                    {prepGuide.prepTips.map((tip, i) => (
                      <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < prepGuide.prepTips.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{tip.section}</div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.65, fontFamily: "Georgia, serif" }}>{tip.tip}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "rgba(212,168,67,0.07)", border: "1.5px solid rgba(212,168,67,0.3)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#9a7020", marginBottom: 8 }}>⚠️ Watch For This</div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.65, fontFamily: "Georgia, serif" }}>{prepGuide.watchFor}</p>
                  </div>
                  <div style={{ background: "linear-gradient(135deg,var(--primary),#1a6a8e)", borderRadius: "var(--radius)", padding: "16px 18px", color: "white" }}>
                    <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.7, marginBottom: 8 }}>⚡ Your Personal Challenge This Week</div>
                    <p style={{ fontSize: 14, lineHeight: 1.7, fontFamily: "Georgia, serif", fontStyle: "italic" }}>{prepGuide.closingChallenge}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text2)", fontFamily: "Arial, sans-serif", fontSize: 14 }}>No studies yet. Create your first study to generate a prep guide.</div>
          )}
        </div>
      )}

      {/* ── VERSE OF THE SEASON ── */}
      {section === "verse" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Verse of the Season</h3>
            <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.6 }}>One verse your whole coaching team is memorizing together. Set it once — it stays all season.</p>
          </div>

          {seasonVerse && !editingVerse ? (
            <div>
              <div style={{ background: "linear-gradient(135deg,var(--primary),#1a6a8e)", borderRadius: 18, padding: "32px 28px", color: "white", marginBottom: 16, textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, opacity: 0.6, marginBottom: 16 }}>🌟 Season Verse</div>
                <p style={{ fontSize: 20, lineHeight: 1.7, fontFamily: "Georgia, serif", fontStyle: "italic", marginBottom: 16 }}>&ldquo;{seasonVerse.text}&rdquo;</p>
                <div style={{ fontSize: 15, fontWeight: 700, opacity: 0.8 }}>{seasonVerse.ref}</div>
              </div>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Memorize Together</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.7, fontFamily: "Georgia, serif", color: "var(--text)" }}>Start each Monday by reciting this verse together as a team — coaches and students. By the end of the season, everyone carries it. That&apos;s discipleship.</p>
              </div>
              <button onClick={() => { setEditingVerse(true); setVerseRef(seasonVerse.ref); setVerseText(seasonVerse.text); }} style={{ padding: "9px 20px", background: "none", border: "1.5px solid var(--border)", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "var(--text2)", cursor: "pointer" }}>✎ Change Verse</button>
            </div>
          ) : (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "18px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>{seasonVerse ? "Change Season Verse" : "Set Your Season Verse"}</div>
              <div className="form-group">
                <label className="form-label">Reference</label>
                <input className="form-input" placeholder="e.g. Proverbs 27:17 (NLT)" value={verseRef} onChange={e => setVerseRef(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Verse Text</label>
                <textarea className="notes-area" style={{ minHeight: 80 }} placeholder="Full verse text..." value={verseText} onChange={e => setVerseText(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="save-btn" onClick={saveVerse} disabled={!verseRef.trim() || !verseText.trim()}>Set Season Verse</button>
                {seasonVerse && <button onClick={() => setEditingVerse(false)} style={{ padding: "8px 14px", background: "none", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "var(--text2)" }}>Cancel</button>}
              </div>
            </div>
          )}

          {/* Today's daily verse */}
          <div style={{ marginTop: 20, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text2)", marginBottom: 8 }}>Today&apos;s Leadership Verse</div>
            <p style={{ fontSize: 14, lineHeight: 1.7, fontFamily: "Georgia, serif", fontStyle: "italic", color: "var(--text)" }}>&ldquo;{dailyVerse.text}&rdquo;</p>
            <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, marginTop: 6 }}>{dailyVerse.ref}</div>
          </div>
        </div>
      )}

      {/* ── LEADERSHIP LIBRARY ── */}
      {section === "library" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Leadership Library</h3>
            <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", marginBottom: 14, lineHeight: 1.6 }}>20 biblical principles for coaches. Read one a week.</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {tags.map(tag => (
                <button key={tag} onClick={() => setFilterTag(tag)} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${filterTag === tag ? "var(--accent)" : "var(--border)"}`, background: filterTag === tag ? "rgba(26,138,181,0.1)" : "var(--card)", color: filterTag === tag ? "var(--accent)" : "var(--text2)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
          {selectedPrinciple ? (
            <div>
              <button onClick={() => setSelectedPrinciple(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Back</button>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 18px" }}>
                <div style={{ display: "inline-block", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--text2)", background: "var(--bg)", padding: "3px 10px", borderRadius: 20, marginBottom: 12 }}>{selectedPrinciple.tag}</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, lineHeight: 1.25 }}>{selectedPrinciple.title}</h2>
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>{selectedPrinciple.verse}</div>
                  <div style={{ fontSize: 14, fontStyle: "italic", lineHeight: 1.65, fontFamily: "Georgia, serif" }}>&ldquo;{selectedPrinciple.verseText}&rdquo;</div>
                </div>
                {selectedPrinciple.devotional.split("\n\n").map((para, i) => (
                  <p key={i} style={{ fontSize: 14.5, lineHeight: 1.8, fontFamily: "Georgia, serif", marginBottom: 14 }}>{para}</p>
                ))}
                <div style={{ background: "linear-gradient(135deg,var(--primary),#1a6a8e)", borderRadius: 10, padding: "14px 16px", color: "white", marginTop: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.7, marginBottom: 6 }}>⚡ This Week&apos;s Challenge</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.65, fontFamily: "Georgia, serif", fontStyle: "italic" }}>{selectedPrinciple.challenge}</p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredPrinciples.map(p => (
                <button key={p.id} onClick={() => setSelectedPrinciple(p)} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text2)", marginBottom: 4 }}>{p.tag} · {p.verse.split(" ")[0]} {p.verse.split(" ")[1]}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{p.title}</div>
                  </div>
                  <span style={{ fontSize: 18, color: "var(--text2)", flexShrink: 0 }}>›</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RESOURCE LIBRARY ── */}
      {section === "resources" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Resource Library</h3>
            <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.6 }}>
              The best books, podcasts, and tools for coaches who want to get better. Organized by what you need right now.
            </p>
          </div>

          {selectedResource ? (
            <div>
              <button onClick={() => setSelectedResource(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16, padding: 0 }}>← Back</button>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 18px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--text2)", marginBottom: 8 }}>
                  {selectedResource.type === "book" ? "📘 Book" : selectedResource.type === "podcast" ? "🎙️ Podcast" : selectedResource.type === "video" ? "🎬 Video" : "📱 App"}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4, color: "var(--text)" }}>{selectedResource.title}</div>
                <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16, fontFamily: "Arial, sans-serif" }}>{selectedResource.author}</div>
                <p style={{ fontSize: 15, lineHeight: 1.75, fontFamily: "Georgia, serif", color: "var(--text)" }}>{selectedResource.description}</p>
                {selectedResource.link && (
                  <a href={selectedResource.link} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 16, padding: "10px 20px", background: "var(--primary)", color: "white", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                    Open →
                  </a>
                )}
              </div>
            </div>
          ) : selectedCat ? (
            <div>
              <button onClick={() => setSelectedCat(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16, padding: 0 }}>← All Categories</button>
              {RESOURCE_LIBRARY.filter(c => c.name === selectedCat).map(cat => (
                <div key={cat.name}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{cat.icon} {cat.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", marginTop: 4 }}>{cat.description}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {cat.resources.map((r, i) => (
                      <button key={i} onClick={() => setSelectedResource(r)} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ fontSize: 22, flexShrink: 0 }}>{r.type === "book" ? "📘" : r.type === "podcast" ? "🎙️" : r.type === "video" ? "🎬" : "📱"}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{r.title}</div>
                          <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: "Arial, sans-serif" }}>{r.author}</div>
                        </div>
                        <span style={{ fontSize: 18, color: "var(--text2)" }}>›</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {RESOURCE_LIBRARY.map(cat => (
                <button key={cat.name} onClick={() => setSelectedCat(cat.name)} style={{ background: "var(--card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius)", padding: "18px 16px", cursor: "pointer", textAlign: "left", transition: "box-shadow 0.15s", boxShadow: "var(--shadow)" }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{cat.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 4, lineHeight: 1.3 }}>{cat.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.4, marginBottom: 10 }}>{cat.description}</div>
                  <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>{cat.resources.length} resources →</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── JOURNAL ── */}
      {section === "journal" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>My Reflections</h3>
            <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.6 }}>Private space for your own thoughts. What is God teaching you through leading?</p>
          </div>
          <textarea className="notes-area" style={{ minHeight: 200, marginBottom: 10 }} value={journalText} onChange={e => setJournalText(e.target.value)}
            placeholder={"What is God teaching you through leading?\nWhere are you struggling as a coach?\nWhat wins or breakthroughs happened this week?"}
          />
          <button className="save-btn" onClick={() => { onSaveReflection(journalText); setJournalSaved(true); setTimeout(() => setJournalSaved(false), 2000); }}>
            {journalSaved ? "✓ Saved" : "Save Reflection"}
          </button>
        </div>
      )}
    </div>
  );
}
