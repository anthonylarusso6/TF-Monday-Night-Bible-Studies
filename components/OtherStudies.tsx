"use client";
import { useState } from "react";
import { Study } from "@/lib/types";
import { SERIES_OPTIONS } from "@/lib/topics";

interface OtherStudiesProps {
  studies: Study[];
  /** Who made each one, by coach id. Studies without an owner are the Triple F library. */
  authorOf: (study: Study) => string;
  onWrite: () => void;
  /** Shown above the list, e.g. on the Series tab when a coach has no studies of their own yet. */
  intro?: string;
  /** Listed first: the Creator's name. */
  firstAuthor?: string;
}

/**
 * Other coaches' studies, as a preview only: what the study is about (title, verse, big idea, takeaways), not the
 * breakdown, the questions or the printable handout. Seeing what others talked about is meant to get a coach
 * writing their own study, not to let them lead someone else's.
 */
export default function OtherStudies({ studies, authorOf, onWrite, intro, firstAuthor }: OtherStudiesProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [series, setSeries] = useState<string>("");
  const shown = series ? studies.filter((s) => s.series === series) : studies;
  // By coach: the Creator's name first, then the others alphabetically, each with all their studies.
  const groups = (() => {
    const m = new Map<string, Study[]>();
    for (const s of shown) m.set(authorOf(s), [...(m.get(authorOf(s)) ?? []), s]);
    return [...m.entries()].sort(([a], [b]) => (a === firstAuthor ? -1 : b === firstAuthor ? 1 : a.localeCompare(b)));
  })();

  return (
    <div>
      <p style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "var(--text2)", marginBottom: 16, lineHeight: 1.6 }}>
        See what other coaches have talked about. You get the big idea, not the full study. Write your own to lead it.{" "}
        <button onClick={onWrite} style={{ background: "none", border: "none", color: "var(--accent)", fontWeight: 700, cursor: "pointer", padding: 0, textDecoration: "underline", fontSize: 13 }}>
          Write a study
        </button>
      </p>

      {intro && <p style={{ fontFamily: "Arial, sans-serif", fontSize: 13, color: "var(--text)", fontWeight: 700, marginBottom: 12 }}>{intro}</p>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {["", ...SERIES_OPTIONS].map((x) => {
          const n = x ? studies.filter((s) => s.series === x).length : studies.length;
          return (
            <button key={x || "all"} onClick={() => setSeries(x)}
              style={{ padding: "8px 12px", minHeight: 40, borderRadius: 20, border: "1px solid var(--border)", fontSize: 13, fontWeight: 600, cursor: "pointer",
                background: series === x ? "var(--primary)" : "var(--card)", color: series === x ? "white" : "var(--text2)" }}>
              {x || "All"} · {n}
            </button>
          );
        })}
      </div>

      {shown.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text2)", fontFamily: "Arial, sans-serif", fontSize: 14 }}>
          No other studies yet.
        </div>
      )}

      {groups.map(([author, list]) => (
        <div key={author} style={{ marginBottom: 22 }}>
          {/* The coach's name, then all of their studies. */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "0 2px 10px", paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{author}</span>
            <span style={{ fontSize: 12, color: "var(--text2)", fontFamily: "Arial, sans-serif" }}>{list.length} stud{list.length === 1 ? "y" : "ies"}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((s) => {

          const id = String(s.id);
          const isOpen = open === id;
          return (
            <div key={id} style={{ background: "var(--card)", border: `1.5px solid ${isOpen ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius)", overflow: "hidden" }}>
              <button
                onClick={() => setOpen(isOpen ? null : id)}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: "Arial, sans-serif", marginTop: 2 }}>
                    {s.date}{s.series ? ` · ${s.series}` : ""}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: "var(--text2)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</span>
              </button>

              {isOpen && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px", fontFamily: "Arial, sans-serif", fontSize: 13.5, lineHeight: 1.65, color: "var(--text)" }}>
                  {s.anchor?.ref && (
                    <div style={{ marginBottom: 10 }}>
                      <b>{s.anchor.ref}</b>
                      {s.anchor.text && <div style={{ color: "var(--text2)" }}>{s.anchor.text}</div>}
                    </div>
                  )}
                  {s.bi && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text2)", marginBottom: 4 }}>The big idea</div>
                      {s.bi}
                    </div>
                  )}
                  {s.tk?.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text2)", marginBottom: 4 }}>Takeaways</div>
                      {s.tk.map((t, i) => <div key={i}>{i + 1}. {t.ti}</div>)}
                    </div>
                  )}
                  <div style={{ background: "var(--bg)", border: "1px dashed var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text2)", fontSize: 12.5 }}>
                    The breakdown, discussion questions and student handout stay with the coach who wrote it. Write your own study to build yours.
                  </div>
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
