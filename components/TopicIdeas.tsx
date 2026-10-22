"use client";
import { useState } from "react";
import { authFetch } from "@/lib/session";
import { TOPIC_CATEGORIES } from "@/lib/topics";
import { TOPIC_GUIDES, BUILD_STEPS } from "@/lib/topicGuides";

interface SpinOff {
  title: string;
  hook: string;
}

interface TopicIdeasProps {
  onCreateDraft: (topic: string) => void;
  onQuickCreate: (topic: string) => void;
  /** Spin-off ideas and Generate Full Study spend the AI; only coaches allowed it see them. */
  canUseAI?: boolean;
}

export default function TopicIdeas({ onCreateDraft, onQuickCreate, canUseAI = false }: TopicIdeasProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [spinoffs, setSpinoffs] = useState<Record<string, SpinOff[]>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTopicClick(topic: string) {
    if (expanded === topic) { setExpanded(null); return; }
    setExpanded(topic);
    setError(null);
    if (!canUseAI || spinoffs[topic]) return; // already loaded, or no AI for this coach

    setLoading(topic);
    try {
      const res = await authFetch("/api/spinoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSpinoffs((prev) => ({ ...prev, [topic]: data.spinoffs }));
    } catch {
      setError("Couldn't load ideas — check your connection.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <p style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "var(--text2)", marginBottom: 20, lineHeight: 1.6 }}>
        {canUseAI
          ? "Tap any topic to see specific study angles. Tap an angle to generate the full study instantly."
          : "Tap any topic to save it as a draft to build out."}
      </p>

      {error && (
        <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>
      )}

      {TOPIC_CATEGORIES.map((cat) => (
        <div key={cat.name} style={{ marginBottom: 24 }}>
          {/* Category header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 16 }}>{cat.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text2)" }}>{cat.name}</span>
          </div>

          {/* Topic cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cat.topics.map((topic) => {
              const isExpanded = expanded === topic;
              const isLoading = loading === topic;
              const topicSpinoffs = spinoffs[topic] || [];

              return (
                <div key={topic} style={{ border: `1.5px solid ${isExpanded ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius)", overflow: "hidden", transition: "border-color 0.15s", background: "var(--card)", boxShadow: "var(--shadow)" }}>
                  {/* Topic header row */}
                  <button
                    onClick={() => handleTopicClick(topic)}
                    style={{ width: "100%", padding: "13px 16px", background: isExpanded ? "rgba(26,138,181,0.06)" : "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left", transition: "background 0.15s", WebkitTapHighlightColor: "transparent" }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 }}>{topic}</span>
                    <span style={{ fontSize: 18, color: "var(--text2)", flexShrink: 0, transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
                  </button>

                  {/* Expanded section */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px" }}>

                      {/* Quick actions for the main topic */}
                      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                        {canUseAI && <button
                          onClick={() => onQuickCreate(topic)}
                          style={{ padding: "8px 16px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, WebkitTapHighlightColor: "transparent" }}
                        >
                          ✏️ Generate Full Study
                        </button>}
                        <button
                          onClick={() => onCreateDraft(topic)}
                          style={{ padding: "8px 14px", background: "var(--bg)", color: "var(--text2)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                        >
                          📝 Save as Draft
                        </button>
                      </div>

                      {/* Passages and the way to build it. Static, so every coach gets it and it never spends the AI. */}
                      {TOPIC_GUIDES[topic] && (() => {
                        const gd = TOPIC_GUIDES[topic];
                        const label = { fontSize: 11, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "1.5px", color: "var(--text2)", marginBottom: 8 };
                        return (
                          <div style={{ marginBottom: 18 }}>
                            <div style={label}>Passages that fit</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                              {gd.verses.map(([ref, why], i) => (
                                <div key={ref} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px" }}>
                                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>
                                    {ref}{i === 0 && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1 }}>Anchor</span>}
                                  </div>
                                  <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.5, fontFamily: "Arial, sans-serif" }}>{why}</div>
                                </div>
                              ))}
                            </div>

                            <div style={label}>Build it like your studies</div>
                            <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", marginBottom: 10, fontFamily: "Arial, sans-serif", fontSize: 12.5, lineHeight: 1.6, color: "var(--text)" }}>
                              <div><b>The flip:</b> {gd.flip}</div>
                              <div style={{ marginTop: 6 }}><b>Real-life example to use:</b> {gd.scene}</div>
                              <div style={{ marginTop: 6 }}><b>A personal question:</b> {gd.ask}</div>
                            </div>
                            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                              {BUILD_STEPS.map((st) => (
                                <li key={st.title} style={{ fontFamily: "Arial, sans-serif", fontSize: 12.5, lineHeight: 1.55, color: "var(--text2)" }}>
                                  <b style={{ color: "var(--text)" }}>{st.title}.</b> {st.how}
                                </li>
                              ))}
                            </ol>
                          </div>
                        );
                      })()}

                      {/* Spin-off angles */}
                      {canUseAI && <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text2)", marginBottom: 10 }}>
                        Specific Angles
                      </div>}

                      {!canUseAI ? null : isLoading ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", color: "var(--text2)", fontFamily: "Arial, sans-serif", fontSize: 13 }}>
                          <span className="spinner" style={{ borderColor: "rgba(90,120,140,0.3)", borderTopColor: "var(--accent)" }} />
                          Generating ideas...
                        </div>
                      ) : topicSpinoffs.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {topicSpinoffs.map((so, i) => (
                            <div key={i} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", marginBottom: 3, lineHeight: 1.3 }}>{so.title}</div>
                                <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5, fontFamily: "Arial, sans-serif" }}>{so.hook}</div>
                              </div>
                              <button
                                onClick={() => onQuickCreate(so.title)}
                                style={{ flexShrink: 0, padding: "7px 12px", background: "var(--accent)", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", WebkitTapHighlightColor: "transparent" }}
                              >
                                Create →
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
