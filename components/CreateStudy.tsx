"use client";
import { useState, useEffect } from "react";
import { SERIES_OPTIONS } from "@/lib/topics";
import { Study } from "@/lib/types";

interface CreateStudyProps {
  prefilledTopic?: string;
  onStudyCreated: (study: Study) => void;
  onToast: (msg: string) => void;
}

export default function CreateStudy({ prefilledTopic, onStudyCreated, onToast }: CreateStudyProps) {
  const [topic, setTopic] = useState(prefilledTopic || "");
  const [series, setSeries] = useState(SERIES_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // When a pre-filled topic comes in, set it and auto-generate
  useEffect(() => {
    if (prefilledTopic && prefilledTopic !== topic) {
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
        body: JSON.stringify({ topic: t, series }),
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

  return (
    <div className="create-panel">
      <h2>Create a Study</h2>
      <p className="create-sub">Enter a topic and Gemini builds the full Bible study — formatted and ready for Monday night.</p>

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

      <div className="form-group">
        <label className="form-label">Series</label>
        <select className="form-select" value={series} onChange={(e) => setSeries(e.target.value)}>
          {SERIES_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <button className="gen-btn" onClick={() => handleGenerate()} disabled={loading}>
        {loading && <span className="spinner" />}
        {loading ? "Generating..." : "✦ Generate Study"}
      </button>

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
          <b style={{ display: "block", marginBottom: 5, color: "var(--text)" }}>What gets generated:</b>
          Big Idea · Anchor Verse · Phrase breakdown with callouts · 2 Supporting Verses · 6 Discussion Questions with leader answers · 3 Takeaways. Saves automatically.
        </div>
      )}
    </div>
  );
}
