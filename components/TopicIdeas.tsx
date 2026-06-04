"use client";
import { useState } from "react";
import { TOPIC_CATEGORIES } from "@/lib/topics";

interface SpinOff {
  title: string;
  hook: string;
}

interface TopicIdeasProps {
  onCreateDraft: (topic: string) => void;
  onQuickCreate: (topic: string) => void;
}

export default function TopicIdeas({ onCreateDraft, onQuickCreate }: TopicIdeasProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [spinoffs, setSpinoffs] = useState<Record<string, SpinOff[]>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTopicClick(topic: string) {
    if (expanded === topic) { setExpanded(null); return; }
    setExpanded(topic);
    setError(null);
    if (spinoffs[topic]) return; // already loaded

    setLoading(topic);
    try {
      const res = await fetch("/api/spinoffs", {
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
        Tap any topic to see specific study angles. Tap an angle to generate the full study instantly.
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
                        <button
                          onClick={() => onQuickCreate(topic)}
                          style={{ padding: "8px 16px", background: "var(--primary)", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, WebkitTapHighlightColor: "transparent" }}
                        >
                          ✏️ Generate Full Study
                        </button>
                        <button
                          onClick={() => onCreateDraft(topic)}
                          style={{ padding: "8px 14px", background: "var(--bg)", color: "var(--text2)", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                        >
                          📝 Save as Draft
                        </button>
                      </div>

                      {/* Spin-off angles */}
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text2)", marginBottom: 10 }}>
                        Specific Angles
                      </div>

                      {isLoading ? (
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
