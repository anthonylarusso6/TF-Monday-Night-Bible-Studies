"use client";
import { useMemo, useState } from "react";
import { Study } from "@/lib/types";
import { parseWrittenStudy, TEMPLATE } from "@/lib/writeStudy";

interface WriteStudyProps {
  createdBy?: string;
  onStudyCreated: (study: Study) => void;
  onToast: (msg: string) => void;
}

/**
 * Write or paste your own study. Not the AI: a coach types it in the labeled layout and gets the same study screen,
 * with the student handout (PDF) and the social media card, as any other study.
 */
export default function WriteStudy({ createdBy, onStudyCreated, onToast }: WriteStudyProps) {
  const [raw, setRaw] = useState("");

  const result = useMemo(() => {
    if (!raw.trim()) return null;
    return parseWrittenStudy(raw, {
      id: `written_${Date.now()}`,
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      createdBy,
    });
    // createdBy is stable for a session; the id timestamp only matters at save time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, createdBy]);

  function save() {
    if (!result?.study) return;
    onStudyCreated(result.study);
    onToast(`"${result.study.title}" saved. Open it for the student handout and social card.`);
    setRaw("");
  }

  return (
    <div className="create-panel">
      <h2>Write Your Study</h2>
      <p className="create-sub">
        Type or paste your study using the labels below (one label at the start of each line). When you save it you can print
        the student handout and get the social media card.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button className="btn btn-outline" onClick={() => setRaw(TEMPLATE)} disabled={!!raw.trim()}>
          Start from the template
        </button>
        {raw && <button className="btn btn-outline" onClick={() => setRaw("")}>Clear</button>}
      </div>

      <textarea
        className="form-textarea"
        style={{ minHeight: 320, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 14 }}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder={TEMPLATE}
        spellCheck
      />

      {result && (
        <div style={{ marginTop: 12, fontFamily: "Arial, sans-serif", fontSize: 13, lineHeight: 1.6 }}>
          {result.study && (
            <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
              <b>{result.study.title}</b> · {result.study.anchor.ref}
              <div style={{ color: "var(--text2)" }}>
                {result.study.bd.length} phrase{result.study.bd.length === 1 ? "" : "s"} · {result.study.qs.length} question
                {result.study.qs.length === 1 ? "" : "s"} · {result.study.tk.length} takeaway{result.study.tk.length === 1 ? "" : "s"}
              </div>
            </div>
          )}
          {result.warnings.map((w, i) => (
            <div key={i} className="error-box" style={{ marginBottom: 6 }}>{w}</div>
          ))}
        </div>
      )}

      <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={save} disabled={!result?.study}>
        Save Study
      </button>
    </div>
  );
}
