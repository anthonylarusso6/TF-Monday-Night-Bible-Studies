"use client";
import { useState } from "react";
import { STUDIES } from "@/lib/studies";
import { Study } from "@/lib/types";

export default function StudentPage() {
  const [openStudy, setOpenStudy] = useState<Study | null>(null);
  const [search, setSearch] = useState("");
  const q = search.toLowerCase();

  const published = STUDIES.filter((s) => !s.draft && (
    !q || s.title.toLowerCase().includes(q) || (s.anchor.ref || "").toLowerCase().includes(q) || (s.series || "").toLowerCase().includes(q)
  ));

  return (
    <div style={{ minHeight: "100vh", background: "#e8f4f9", fontFamily: "Georgia, serif" }}>
      {/* Header */}
      <header style={{ background: "#0f4f6a", color: "white", textAlign: "center", padding: "20px 16px 16px", position: "relative" }}>
        <a href="/" style={{ position: "absolute", top: 14, left: 14, background: "rgba(255,255,255,0.12)", color: "white", textDecoration: "none", fontSize: 12, fontFamily: "Arial, sans-serif", fontWeight: 700, padding: "6px 12px", borderRadius: 8 }}>← Leader</a>
        <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: 2, fontFamily: "Arial, sans-serif" }}>TRIPLE F</div>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: "4px 0 2px" }}>Monday Night Bible Study&apos;s</h1>
        <p style={{ fontSize: 12, opacity: 0.75, fontFamily: "Arial, sans-serif" }}>Student Study Library</p>
      </header>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "20px 16px 40px" }}>
        <input
          style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #c5dce8", fontSize: 14, fontFamily: "Arial, sans-serif", marginBottom: 20, boxSizing: "border-box", outline: "none" }}
          placeholder="Search studies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {published.map((s) => (
            <div
              key={s.id}
              onClick={() => setOpenStudy(s)}
              style={{ background: "white", borderRadius: 12, padding: 18, cursor: "pointer", boxShadow: "0 2px 8px rgba(15,79,106,0.10)", border: "1px solid #c5dce8" }}
            >
              <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", color: "#2e5565", marginBottom: 2 }}>{s.date}</div>
              {s.series && <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", fontWeight: 700, color: "#1a7a9e", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>📖 {s.series}</div>}
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "#2e5565", fontStyle: "italic" }}>{s.anchor.ref}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Study modal */}
      {openStudy && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpenStudy(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, overflowY: "auto", padding: "20px 12px 40px", display: "flex", justifyContent: "center", alignItems: "flex-start" }}
        >
          <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 680, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            {/* Sticky header */}
            <div style={{ position: "sticky", top: 0, background: "white", borderBottom: "1px solid #c5dce8", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "16px 16px 0 0" }}>
              <div style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: "#2e5565", textTransform: "uppercase", letterSpacing: "0.5px" }}>{openStudy.date}{openStudy.series ? ` · ${openStudy.series}` : ""}</div>
              <button onClick={() => setOpenStudy(null)} style={{ background: "#e8f4f9", border: "1px solid #c5dce8", borderRadius: 8, padding: "6px 14px", fontSize: 14, cursor: "pointer" }}>✕ Close</button>
            </div>

            <div style={{ padding: "0 24px 28px" }}>
              <div style={{ fontSize: 22, fontWeight: 700, padding: "20px 0 16px", borderBottom: "2px solid #d4c4a0", marginBottom: 20 }}>{openStudy.title}</div>

              {/* Big Idea */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#2e5565", marginBottom: 10 }}>Big Idea</div>
                <div style={{ fontSize: 15, lineHeight: 1.7, background: "#e8f4f9", borderLeft: "4px solid #0f4f6a", padding: "14px 18px", borderRadius: "0 8px 8px 0" }}>{openStudy.bi}</div>
              </div>

              {/* Anchor verse */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#2e5565", marginBottom: 10 }}>Anchor Verse</div>
                <div style={{ background: "#e8f4f9", border: "1px solid #c5dce8", borderRadius: 8, padding: "14px 16px" }}>
                  <b style={{ display: "block", fontFamily: "Arial, sans-serif", fontSize: 13, color: "#1a7a9e", marginBottom: 4 }}>{openStudy.anchor.ref}</b>
                  <span style={{ fontStyle: "italic", fontSize: 14, lineHeight: 1.6 }}>{openStudy.anchor.text}</span>
                </div>
              </div>

              {/* Supporting verses */}
              {openStudy.sup.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#2e5565", marginBottom: 10 }}>Supporting Verses</div>
                  {openStudy.sup.map((v, i) => (
                    <div key={i} style={{ background: "#e8f4f9", border: "1px solid #c5dce8", borderRadius: 8, padding: "12px 16px", marginBottom: 8 }}>
                      <b style={{ display: "block", fontFamily: "Arial, sans-serif", fontSize: 13, color: "#1a7a9e", marginBottom: 4 }}>{v.ref}</b>
                      <span style={{ fontStyle: "italic", fontSize: 14, lineHeight: 1.6 }}>{v.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Discussion questions — no answers shown */}
              {openStudy.qs.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#2e5565", marginBottom: 10 }}>Discussion Questions</div>
                  {openStudy.qs.map((q, i) => (
                    <div key={i} style={{ marginBottom: 14, border: "1px solid #c5dce8", borderRadius: 8, padding: "12px 14px", background: "#e8f4f9" }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{i + 1}. {q.q}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Takeaways */}
              {openStudy.tk.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontFamily: "Arial, sans-serif", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#2e5565", marginBottom: 10 }}>3 Takeaways</div>
                  {openStudy.tk.map((t, i) => (
                    <div key={i} style={{ background: "#e8f4f9", border: "1px solid #c5dce8", borderLeft: "4px solid #0f4f6a", borderRadius: "0 8px 8px 0", padding: "14px 16px", marginBottom: 10 }}>
                      <b style={{ display: "block", fontSize: 15, marginBottom: 4 }}>{t.ti}</b>
                      <span style={{ fontSize: 13, color: "#2e5565", fontFamily: "Arial, sans-serif", lineHeight: 1.5 }}>{t.bo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
