"use client";
import { useState, useEffect } from "react";
import { Study } from "@/lib/types";

interface CreateStudyProps {
  prefilledTopic?: string;
  onStudyCreated: (study: Study) => void;
  onToast: (msg: string) => void;
}

type Mode = "generate" | "paste";

export default function CreateStudy({ prefilledTopic, onStudyCreated, onToast }: CreateStudyProps) {
  const [mode, setMode] = useState<Mode>("generate");
  const [topic, setTopic] = useState(prefilledTopic || "");
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // When a pre-filled topic comes in, set it and auto-generate
  useEffect(() => {
    if (prefilledTopic && prefilledTopic !== topic) {
      setMode("generate");
      setTopic(prefilledTopic);
      setError("");
    }
  }, [prefilledTopic]);

  // Auto-generate when prefilled topic arrives
  useEffect(() => {
    if (prefilledTopic && topic === prefilledTopic && !loading) {
      handleGenerate(prefilledTopic);
    }
  }, [topic]);

  async function handleGenerate(overrideTopic?: string) {
    const t = (overrideTopic || topic).trim();
    if (!t) { setError("Enter a topic first."); return; }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Generation failed. Try again.");
      } else {
        onStudyCreated(data.study);
        onToast(`"${data.study.title}" added to All Studies!`);
        setTopic("");
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    const text = raw.trim();
    if (!text) { setError("Paste a study first."); return; }
    if (text.length < 200) { setError("That looks too short — paste the whole study."); return; }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Import failed. Try again.");
      } else {
        onStudyCreated(data.study);
        onToast(`"${data.study.title}" imported!`);
        setRaw("");
      }
    } catch {
      setError("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  const wordCount = raw.trim() ? raw.trim().split(/\s+/).length : 0;

  return (
    <div className="create-panel">
      <h2>{mode === "generate" ? "Create a Study" : "Import a Study"}</h2>
      <p className="create-sub">
        {mode === "generate"
          ? "Enter a topic and Gemini builds the full Bible study — formatted and ready for Monday night."
          : "Paste a study you already wrote. It keeps your exact words and lays it out in the app."}
      </p>

      {/* Mode switch */}
      <div style={{ display: "flex", gap: 6, background: "var(--bg)", padding: 4, borderRadius: 11, marginBottom: 20 }}>
        {([
          { id: "generate" as Mode, icon: "✦", label: "Generate New" },
          { id: "paste" as Mode, icon: "📋", label: "Paste Existing" },
        ]).map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setError(""); }}
            disabled={loading}
            style={{
              flex: 1, padding: "10px 12px", borderRadius: 8, border: "none",
              background: mode === m.id ? "var(--card)" : "none",
              color: mode === m.id ? "var(--text)" : "var(--text2)",
              fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer",
              boxShadow: mode === m.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <span>{m.icon}</span>{m.label}
          </button>
        ))}
      </div>

      {mode === "generate" ? (
        <>
          <div className="form-group">
            <label className="form-label">Topic</label>
            <input
              className="form-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Anxiety & Worry, Handling Failure..."
              onKeyDown={(e) => e.key === "Enter" && !loading && handleGenerate()}
            />
          </div>

          <button className="gen-btn" onClick={() => handleGenerate()} disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? "Generating..." : "✦ Generate Study"}
          </button>
        </>
      ) : (
        <>
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <label className="form-label">Your Study</label>
              {wordCount > 0 && (
                <span style={{ fontSize: 11, color: "var(--text2)", fontFamily: "Arial, sans-serif" }}>
                  {wordCount.toLocaleString()} words
                </span>
              )}
            </div>
            <textarea
              className="form-input"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={"Paste the whole study here — title, parts, questions, prayer, all of it.\n\nIt keeps your wording exactly as written and figures out the structure on its own."}
              rows={16}
              style={{ resize: "vertical", minHeight: 260, lineHeight: 1.6, fontFamily: "Arial, sans-serif", fontSize: 13 }}
            />
          </div>

          <button className="gen-btn" onClick={handleImport} disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? "Formatting..." : "📋 Import Study"}
          </button>
        </>
      )}

      {error && (
        <div className="error-box">
          {error}
          {error.includes("not configured") && (
            <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
              Add <code>GEMINI_API_KEY</code> in your Vercel project settings under Environment Variables, then redeploy.
            </div>
          )}
        </div>
      )}

      {!loading && (
        <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--bg)", borderRadius: 10, fontFamily: "Arial, sans-serif", fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
          {mode === "generate" ? (
            <>
              <b style={{ display: "block", marginBottom: 5, color: "var(--text)" }}>What gets generated:</b>
              Big Idea · Anchor Verse · Phrase breakdown with callouts · 2 Supporting Verses · 6 Discussion Questions with leader answers · 3 Takeaways. Series is picked automatically from the topic. Saves automatically.
            </>
          ) : (
            <>
              <b style={{ display: "block", marginBottom: 5, color: "var(--text)" }}>What happens to your study:</b>
              Your words stay exactly as you wrote them — nothing gets rewritten. Parts, discussion questions, verses, comparison tables, and prayers all keep their structure. It pulls out the anchor verse, questions, and takeaways so the study works with search, attendance, and PDF export. Series is picked automatically.
            </>
          )}
        </div>
      )}
    </div>
  );
}
