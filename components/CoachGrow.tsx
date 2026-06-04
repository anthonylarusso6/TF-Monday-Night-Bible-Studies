"use client";
import { useState, useEffect } from "react";
import { LEADERSHIP_PRINCIPLES, DAILY_VERSES, LeadershipPrinciple } from "@/lib/leadership";
import { Study, UserData } from "@/lib/types";

interface PrepGuide {
  openingPrayer: string;
  personalReflections: string[];
  prepTips: { section: string; tip: string }[];
  watchFor: string;
  closingChallenge: string;
}

interface CoachGrowProps {
  latestStudy: Study | null;
  userData: UserData;
  onSaveReflection: (text: string) => void;
}

type Section = "prep" | "library" | "verse" | "journal";

export default function CoachGrow({ latestStudy, userData, onSaveReflection }: CoachGrowProps) {
  const [section, setSection] = useState<Section>("prep");
  const [prepGuide, setPrepGuide] = useState<PrepGuide | null>(null);
  const [prepLoading, setPrepLoading] = useState(false);
  const [prepError, setPrepError] = useState("");
  const [selectedPrinciple, setSelectedPrinciple] = useState<LeadershipPrinciple | null>(null);
  const [filterTag, setFilterTag] = useState<string>("All");
  const [journalText, setJournalText] = useState(userData.notes["_coach_journal"] || "");
  const [journalSaved, setJournalSaved] = useState(false);

  // Daily verse rotates by day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const dailyVerse = DAILY_VERSES[dayOfYear % DAILY_VERSES.length];

  const tags = ["All", ...Array.from(new Set(LEADERSHIP_PRINCIPLES.map(p => p.tag)))];
  const filteredPrinciples = filterTag === "All" ? LEADERSHIP_PRINCIPLES : LEADERSHIP_PRINCIPLES.filter(p => p.tag === filterTag);

  async function generatePrep() {
    if (!latestStudy) return;
    setPrepError("");
    setPrepLoading(true);
    try {
      const res = await fetch("/api/studyprep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ study: latestStudy }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPrepGuide(data.prep);
    } catch {
      setPrepError("Couldn't generate prep guide — check your connection.");
    } finally {
      setPrepLoading(false);
    }
  }

  function saveJournal() {
    onSaveReflection(journalText);
    setJournalSaved(true);
    setTimeout(() => setJournalSaved(false), 2000);
  }

  const SECTIONS: { id: Section; icon: string; label: string }[] = [
    { id: "prep", icon: "📖", label: "Study Prep" },
    { id: "library", icon: "🏛️", label: "Leadership" },
    { id: "verse", icon: "✝️", label: "Daily Verse" },
    { id: "journal", icon: "📔", label: "Reflections" },
  ];

  return (
    <div>
      {/* Section nav */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{ padding: "8px 16px", borderRadius: 20, border: `1.5px solid ${section === s.id ? "var(--accent)" : "var(--border)"}`, background: section === s.id ? "rgba(26,138,181,0.1)" : "var(--card)", color: section === s.id ? "var(--accent)" : "var(--text2)", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, WebkitTapHighlightColor: "transparent" }}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* ── Study Prep ── */}
      {section === "prep" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Prepare Your Heart First</h3>
            <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.6 }}>
              Before you prep the study, sit with it personally. This guide helps you experience the material yourself before you lead it.
            </p>
          </div>

          {latestStudy ? (
            <>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text2)", marginBottom: 3 }}>Latest Study</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{latestStudy.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>{latestStudy.date}</div>
                </div>
                <button
                  onClick={generatePrep}
                  disabled={prepLoading}
                  style={{ padding: "10px 18px", background: "var(--primary)", color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: prepLoading ? "not-allowed" : "pointer", opacity: prepLoading ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6, flexShrink: 0, WebkitTapHighlightColor: "transparent" }}
                >
                  {prepLoading ? <><span className="spinner" />Generating...</> : "✦ Generate Prep Guide"}
                </button>
              </div>

              {prepError && <div className="error-box" style={{ marginBottom: 16 }}>{prepError}</div>}

              {prepGuide && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Opening Prayer */}
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--accent)", marginBottom: 10 }}>🙏 Opening Prayer</div>
                    <p style={{ fontSize: 14, lineHeight: 1.75, color: "var(--text)", fontFamily: "Georgia, serif", fontStyle: "italic" }}>{prepGuide.openingPrayer}</p>
                  </div>

                  {/* Personal Reflections */}
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--primary)", marginBottom: 12 }}>💭 Before You Lead, Sit With These</div>
                    {prepGuide.personalReflections.map((q, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, padding: "10px 12px", background: "var(--bg)", borderRadius: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--gold)", flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                        <span style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text)", fontFamily: "Georgia, serif" }}>{q}</span>
                      </div>
                    ))}
                  </div>

                  {/* Facilitating Tips */}
                  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--series-rel)", marginBottom: 12 }}>🎯 Leading Each Section</div>
                    {prepGuide.prepTips.map((tip, i) => (
                      <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < prepGuide.prepTips.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{tip.section}</div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text)", fontFamily: "Georgia, serif" }}>{tip.tip}</div>
                      </div>
                    ))}
                  </div>

                  {/* Watch For */}
                  <div style={{ background: "rgba(212,168,67,0.07)", border: "1.5px solid rgba(212,168,67,0.3)", borderRadius: "var(--radius)", padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#9a7020", marginBottom: 8 }}>⚠️ Watch For This</div>
                    <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--text)", fontFamily: "Georgia, serif" }}>{prepGuide.watchFor}</p>
                  </div>

                  {/* Personal Challenge */}
                  <div style={{ background: "linear-gradient(135deg, var(--primary), #1a6a8e)", borderRadius: "var(--radius)", padding: "16px 18px", color: "white" }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.7, marginBottom: 8 }}>⚡ Your Personal Challenge This Week</div>
                    <p style={{ fontSize: 14, lineHeight: 1.7, fontFamily: "Georgia, serif", fontStyle: "italic" }}>{prepGuide.closingChallenge}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text2)", fontFamily: "Arial, sans-serif", fontSize: 14 }}>
              No studies yet. Create your first study and come back here to prep for it.
            </div>
          )}
        </div>
      )}

      {/* ── Leadership Library ── */}
      {section === "library" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Leadership Library</h3>
            <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.6, marginBottom: 14 }}>
              20 biblical leadership principles for coaches. Read one a week.
            </p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {tags.map(tag => (
                <button key={tag} onClick={() => setFilterTag(tag)} style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${filterTag === tag ? "var(--accent)" : "var(--border)"}`, background: filterTag === tag ? "rgba(26,138,181,0.1)" : "var(--card)", color: filterTag === tag ? "var(--accent)" : "var(--text2)", fontSize: 11, fontWeight: 700, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {selectedPrinciple ? (
            <div>
              <button onClick={() => setSelectedPrinciple(null)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 16, padding: 0, WebkitTapHighlightColor: "transparent" }}>
                ← Back to Library
              </button>
              <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 18px" }}>
                <div style={{ display: "inline-block", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--text2)", background: "var(--bg)", padding: "3px 10px", borderRadius: 20, marginBottom: 12 }}>{selectedPrinciple.tag}</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12, lineHeight: 1.25 }}>{selectedPrinciple.title}</h2>
                <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>{selectedPrinciple.verse}</div>
                  <div style={{ fontSize: 14, fontStyle: "italic", lineHeight: 1.65, fontFamily: "Georgia, serif", color: "var(--text)" }}>&ldquo;{selectedPrinciple.verseText}&rdquo;</div>
                </div>
                {selectedPrinciple.devotional.split("\n\n").map((para, i) => (
                  <p key={i} style={{ fontSize: 14.5, lineHeight: 1.8, color: "var(--text)", fontFamily: "Georgia, serif", marginBottom: 14 }}>{para}</p>
                ))}
                <div style={{ background: "linear-gradient(135deg, var(--primary), #1a6a8e)", borderRadius: 10, padding: "14px 16px", color: "white", marginTop: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.7, marginBottom: 6 }}>⚡ This Week's Challenge</div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.65, fontFamily: "Georgia, serif", fontStyle: "italic" }}>{selectedPrinciple.challenge}</p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredPrinciples.map((p) => (
                <button key={p.id} onClick={() => setSelectedPrinciple(p)} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, transition: "box-shadow 0.15s", WebkitTapHighlightColor: "transparent" }}>
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

      {/* ── Daily Verse ── */}
      {section === "verse" && (
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Today&apos;s Verse</h3>
          <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", marginBottom: 20 }}>A fresh verse every day for coaches.</p>
          <div style={{ background: "linear-gradient(135deg, var(--primary), #1a6a8e)", borderRadius: 16, padding: "28px 24px", color: "white", marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, opacity: 0.6, marginBottom: 16 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </div>
            <p style={{ fontSize: 18, lineHeight: 1.7, fontFamily: "Georgia, serif", fontStyle: "italic", marginBottom: 16 }}>
              &ldquo;{dailyVerse.text}&rdquo;
            </p>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.75 }}>{dailyVerse.ref}</div>
          </div>
          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text2)", marginBottom: 10 }}>Sit With This Today</div>
            <p style={{ fontSize: 13.5, color: "var(--text)", lineHeight: 1.7, fontFamily: "Georgia, serif" }}>What is one way this verse applies to how you lead your students this week? How does it challenge you personally? Take 2 minutes to pray through it before you move on.</p>
          </div>
        </div>
      )}

      {/* ── Reflections Journal ── */}
      {section === "journal" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>My Reflections</h3>
            <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.6 }}>
              Private space for your own thoughts. Not about the students — about you. What is God teaching you through leading?
            </p>
          </div>
          <textarea
            className="notes-area"
            style={{ minHeight: 200, marginBottom: 10 }}
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            placeholder={"What is God teaching you through leading?\nWhere are you struggling as a coach?\nWhat wins or breakthroughs happened this week?\nWhat do you want to remember from this season?"}
          />
          <button className="save-btn" onClick={saveJournal}>
            {journalSaved ? "✓ Saved" : "Save Reflection"}
          </button>
        </div>
      )}
    </div>
  );
}
