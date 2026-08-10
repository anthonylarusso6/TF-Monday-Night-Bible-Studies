"use client";
import { useState } from "react";
import { SERIES_OPTIONS } from "@/lib/topics";
import { Study } from "@/lib/types";

interface CreateStudyProps {
  onStudyCreated: (study: Study) => void;
  onToast: (msg: string) => void;
}

export default function CreateStudy({ onStudyCreated, onToast }: CreateStudyProps) {
  const [topic, setTopic] = useState("");
  const [series, setSeries] = useState(SERIES_OPTIONS[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!topic.trim()) { setError("Enter a topic first."); return; }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), series, notes: notes.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Generation failed. Try again.");
      } else {
        onStudyCreated(data.study);
        onToast(`"${data.study.title}" added to All Studies!`);
        setTopic("");
        setNotes("");
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
      <p>Enter a topic and let Claude build the full Bible study — formatted and ready for Monday night.</p>

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
        <select
          className="form-select"
          value={series}
          onChange={(e) => setSeries(e.target.value)}
        >
          {SERIES_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">
          Extra Notes <span style={{ fontWeight: 400, opacity: 0.55 }}>(optional)</span>
        </label>
        <textarea
          className="form-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Specific verses you want used, a story or example to build around, a direction you want to take it, something that happened this week with the team..."
          rows={4}
        />
      </div>

      <button className="gen-btn" onClick={handleGenerate} disabled={loading}>
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

      <div style={{ marginTop: 24, padding: "16px", background: "var(--bg)", borderRadius: 8, fontFamily: "Arial, sans-serif", fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>
        <b style={{ display: "block", marginBottom: 6, color: "var(--text)" }}>What gets generated:</b>
        Full study with Big Idea, Anchor Verse, Phrase-by-phrase Breakdown with Callouts, 2 Supporting Verses, 6 Discussion Questions with Leader Answers, and 3 Takeaways. Saves automatically to All Studies.
      </div>
    </div>
  );
}
