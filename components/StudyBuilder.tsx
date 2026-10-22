"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Study } from "@/lib/types";
import { loadMyStudies, saveMyStudies } from "@/lib/myStudies";
import { TOPIC_GUIDES } from "@/lib/topicGuides";
import { SERIES_OPTIONS as SERIES } from "@/lib/topics";

type Building = Study & { updatedAt?: number };

interface Props {
  coachId: string;
  /** A topic picked on Topic Ideas: starts a new study with its anchor verse and hints filled in. */
  startTopic?: string;
  onStartTopicUsed: () => void;
  onPublish: (study: Study) => Promise<void> | void;
  onToast: (msg: string) => void;
}

const today = () => new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

function blank(title = ""): Building {
  return {
    id: `build_${Date.now()}`, date: today(), title, series: "", draft: true,
    anchor: { ref: "", text: "" }, sup: [{ ref: "", text: "" }], bi: "",
    bd: [{ ph: "", pts: [""], co: { lb: "Say this to your students", tx: "" } }],
    sbd: [{ ref: "", pt: "" }],
    qs: [{ q: "", a: "" }, { q: "", a: "" }, { q: "", a: "" }],
    tk: [{ ti: "", bo: "" }, { ti: "", bo: "" }, { ti: "", bo: "" }],
    updatedAt: Date.now(),
  };
}

function fromTopic(topic: string): Building {
  const b = blank(topic);
  const g = TOPIC_GUIDES[topic];
  if (g) {
    b.anchor.ref = g.verses[0][0];
    b.sup = g.verses.slice(1).map(([ref]) => ({ ref, text: "" }));
    b.sbd = g.verses.slice(1).map(([ref]) => ({ ref, pt: "" }));
  }
  return b;
}

const label: React.CSSProperties = { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text2)", marginBottom: 6, display: "block" };
const card: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 16px 14px", marginBottom: 14 };
const hint: React.CSSProperties = { fontSize: 12, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.5, marginBottom: 8 };
const small: React.CSSProperties = { background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", minHeight: 40, fontSize: 13, fontWeight: 600, color: "var(--text2)", cursor: "pointer" };

export default function StudyBuilder({ coachId, startTopic, onStartTopicUsed, onPublish, onToast }: Props) {
  const [studies, setStudies] = useState<Building[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [status, setStatus] = useState<"saved" | "saving" | "local">("saved");
  const [publishing, setPublishing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Building[]>([]);
  latest.current = studies;

  useEffect(() => {
    loadMyStudies(coachId).then(({ studies: list }) => { setStudies(list); setLoaded(true); });
  }, [coachId]);

  // A topic from Topic Ideas opens a fresh study with its verses filled in.
  useEffect(() => {
    if (!loaded || !startTopic) return;
    const b = fromTopic(startTopic);
    setStudies((s) => { const next = [b, ...s]; void saveMyStudies(coachId, next); return next; });
    setCurrentId(String(b.id));
    onStartTopicUsed();
  }, [loaded, startTopic, coachId, onStartTopicUsed]);

  const save = useCallback((next: Building[]) => {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const ok = await saveMyStudies(coachId, latest.current);
      setStatus(ok ? "saved" : "local");
    }, 700);
    void next;
  }, [coachId]);

  // Leaving the screen with an edit still waiting should not lose it.
  useEffect(() => () => {
    if (timer.current) { clearTimeout(timer.current); void saveMyStudies(coachId, latest.current); }
  }, [coachId]);

  const current = studies.find((s) => String(s.id) === currentId) ?? null;

  function edit(fn: (s: Building) => Building) {
    setStudies((all) => {
      const next = all.map((s) => (String(s.id) === currentId ? { ...fn(s), updatedAt: Date.now() } : s));
      save(next);
      return next;
    });
  }

  function newStudy() {
    const b = blank();
    const next = [b, ...studies];
    setStudies(next); save(next); setCurrentId(String(b.id));
  }

  function remove(id: string) {
    if (!confirm("Delete this study you were writing? This cannot be undone.")) return;
    const next = studies.filter((s) => String(s.id) !== id);
    setStudies(next); save(next);
    if (currentId === id) setCurrentId(null);
  }

  async function publish() {
    if (!current) return;
    const missing: string[] = [];
    if (!current.title.trim()) missing.push("a title");
    if (!current.anchor.ref.trim()) missing.push("the anchor verse");
    if (!current.bi.trim()) missing.push("the big idea");
    if (missing.length) { onToast(`Add ${missing.join(", ")} first.`); return; }
    setPublishing(true);
    const clean: Study = {
      id: `written_${Date.now()}`,
      date: today(),
      title: current.title.trim(),
      series: current.series,
      draft: false,
      anchor: { ref: current.anchor.ref.trim(), text: current.anchor.text.trim() },
      sup: current.sup.filter((v) => v.ref.trim()).map((v) => ({ ref: v.ref.trim(), text: v.text.trim() })),
      bi: current.bi.trim(),
      bd: current.bd.filter((p) => p.ph.trim() || p.pts.some((x) => x.trim())).map((p) => ({
        ph: p.ph.trim() || "Key points",
        pts: p.pts.map((x) => x.trim()).filter(Boolean),
        ...(p.co && p.co.tx.trim() ? { co: { lb: p.co.lb, tx: p.co.tx.trim() } } : {}),
      })),
      sbd: current.sbd.filter((v) => v.ref.trim() && v.pt.trim()).map((v) => ({ ref: v.ref.trim(), pt: v.pt.trim() })),
      qs: current.qs.filter((q) => q.q.trim()).map((q) => ({ q: q.q.trim(), a: q.a.trim() })),
      tk: current.tk.filter((t) => t.ti.trim()).map((t) => ({ ti: t.ti.trim(), bo: t.bo.trim() })),
    };
    try {
      await onPublish(clean);
      const next = studies.filter((s) => String(s.id) !== currentId);
      setStudies(next);
      await saveMyStudies(coachId, next);
      setCurrentId(null);
    } finally {
      setPublishing(false);
    }
  }

  if (!loaded) return <div style={{ textAlign: "center", padding: 40, color: "var(--text2)" }}>Loading...</div>;

  // ── List of studies in progress ──
  if (!current) {
    return (
      <div className="create-panel">
        <h2>Write a Study</h2>
        <p className="create-sub">Build your study right here. Everything saves as you type, so you never need another app.</p>
        <button className="btn btn-primary" style={{ marginBottom: 18 }} onClick={newStudy}>＋ Start a new study</button>
        {studies.length > 0 && <span style={label}>In progress</span>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {studies.map((s) => (
            <div key={String(s.id)} style={{ ...card, marginBottom: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setCurrentId(String(s.id))} style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{s.title || "Untitled study"}</div>
                <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: "Arial, sans-serif" }}>{s.anchor.ref || "No verse yet"}</div>
              </button>
              <button style={small} onClick={() => setCurrentId(String(s.id))}>Continue</button>
              <button style={{ ...small, color: "#dc2626" }} onClick={() => remove(String(s.id))}>✕</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const g = TOPIC_GUIDES[current.title];
  const listBtn = (text: string, onClick: () => void) => <button style={small} onClick={onClick}>{text}</button>;
  const xBtn = (onClick: () => void) => <button aria-label="Remove" style={{ ...small, color: "#dc2626", flexShrink: 0 }} onClick={onClick}>✕</button>;

  return (
    <div className="create-panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, position: "sticky", top: 0, background: "var(--bg)", padding: "8px 0", zIndex: 5 }}>
        <button style={small} onClick={() => setCurrentId(null)}>‹ My studies</button>
        <span style={{ fontSize: 12, fontFamily: "Arial, sans-serif", color: status === "local" ? "#92652a" : "var(--text2)" }}>
          {status === "saving" ? "Saving…" : status === "local" ? "Saved on this phone, will sync" : "✓ Saved"}
        </span>
      </div>

      <div style={card}>
        <span style={label}>Title</span>
        <input className="form-input" value={current.title} onChange={(e) => edit((s) => ({ ...s, title: e.target.value }))} placeholder="Punchy and specific, like something on a flyer" />
        <span style={{ ...label, marginTop: 14 }}>Series</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SERIES.map((x) => (
            <button key={x} onClick={() => edit((s) => ({ ...s, series: s.series === x ? "" : x }))}
              style={{ ...small, background: current.series === x ? "var(--primary)" : "none", color: current.series === x ? "white" : "var(--text2)" }}>{x}</button>
          ))}
        </div>
      </div>

      <div style={card}>
        <span style={label}>1 · Anchor verse</span>
        <p style={hint}>The one verse that carries the whole study.</p>
        <input className="form-input" value={current.anchor.ref} onChange={(e) => edit((s) => ({ ...s, anchor: { ...s.anchor, ref: e.target.value } }))} placeholder="James 1:19-20 (NIV)" style={{ marginBottom: 8 }} />
        <textarea className="form-textarea" value={current.anchor.text} onChange={(e) => edit((s) => ({ ...s, anchor: { ...s.anchor, text: e.target.value } }))} placeholder="Type the verse here" style={{ minHeight: 80 }} />
        {g && <p style={{ ...hint, marginTop: 8 }}>Passages that fit: {g.verses.map(([r]) => r).join(" · ")}</p>}
      </div>

      <div style={card}>
        <span style={label}>2 · Supporting verses</span>
        {current.sup.map((v, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <input className="form-input" value={v.ref} onChange={(e) => edit((s) => ({ ...s, sup: s.sup.map((x, j) => j === i ? { ...x, ref: e.target.value } : x) }))} placeholder="Reference" style={{ marginBottom: 6 }} />
              <textarea className="form-textarea" value={v.text} onChange={(e) => edit((s) => ({ ...s, sup: s.sup.map((x, j) => j === i ? { ...x, text: e.target.value } : x) }))} placeholder="Verse text" style={{ minHeight: 60 }} />
            </div>
            {xBtn(() => edit((s) => ({ ...s, sup: s.sup.filter((_, j) => j !== i) })))}
          </div>
        ))}
        {listBtn("＋ Add a verse", () => edit((s) => ({ ...s, sup: [...s.sup, { ref: "", text: "" }] })))}
      </div>

      <div style={card}>
        <span style={label}>3 · Big idea</span>
        <p style={hint}>4-5 sentences. Flip a common assumption early, land the truth in the middle, end on one short punch.{g ? ` The flip here: ${g.flip}` : ""}</p>
        <textarea className="form-textarea" value={current.bi} onChange={(e) => edit((s) => ({ ...s, bi: e.target.value }))} style={{ minHeight: 140 }} />
      </div>

      <div style={card}>
        <span style={label}>4 · Break down the verse</span>
        <p style={hint}>Take a phrase from the anchor verse. Give 2-3 points, then something to say or a real-life example.{g ? ` Example to use: ${g.scene}` : ""}</p>
        {current.bd.map((p, i) => (
          <div key={i} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input className="form-input" value={p.ph} onChange={(e) => edit((s) => ({ ...s, bd: s.bd.map((x, j) => j === i ? { ...x, ph: e.target.value } : x) }))} placeholder="Phrase from the verse" />
              {xBtn(() => edit((s) => ({ ...s, bd: s.bd.filter((_, j) => j !== i) })))}
            </div>
            {p.pts.map((pt, k) => (
              <div key={k} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <textarea className="form-textarea" value={pt} onChange={(e) => edit((s) => ({ ...s, bd: s.bd.map((x, j) => j === i ? { ...x, pts: x.pts.map((y, m) => m === k ? e.target.value : y) } : x) }))} placeholder={`Point ${k + 1}`} style={{ minHeight: 52 }} />
                {xBtn(() => edit((s) => ({ ...s, bd: s.bd.map((x, j) => j === i ? { ...x, pts: x.pts.filter((_, m) => m !== k) } : x) })))}
              </div>
            ))}
            {listBtn("＋ Add a point", () => edit((s) => ({ ...s, bd: s.bd.map((x, j) => j === i ? { ...x, pts: [...x.pts, ""] } : x) })))}
            <div style={{ display: "flex", gap: 8, margin: "12px 0 6px" }}>
              {["Say this to your students", "Real-life example"].map((lb) => (
                <button key={lb} onClick={() => edit((s) => ({ ...s, bd: s.bd.map((x, j) => j === i ? { ...x, co: { lb, tx: x.co?.tx ?? "" } } : x) }))}
                  style={{ ...small, background: (p.co?.lb ?? "Say this to your students") === lb ? "var(--primary)" : "none", color: (p.co?.lb ?? "Say this to your students") === lb ? "white" : "var(--text2)" }}>{lb}</button>
              ))}
            </div>
            <textarea className="form-textarea" value={p.co?.tx ?? ""} onChange={(e) => edit((s) => ({ ...s, bd: s.bd.map((x, j) => j === i ? { ...x, co: { lb: x.co?.lb ?? "Say this to your students", tx: e.target.value } } : x) }))} placeholder="2-3 sentences. End on a question or a strong line." style={{ minHeight: 80 }} />
          </div>
        ))}
        {listBtn("＋ Add a phrase", () => edit((s) => ({ ...s, bd: [...s.bd, { ph: "", pts: [""], co: { lb: "Say this to your students", tx: "" } }] })))}
      </div>

      <div style={card}>
        <span style={label}>5 · Supporting verses explained</span>
        {current.sbd.map((v, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <input className="form-input" value={v.ref} onChange={(e) => edit((s) => ({ ...s, sbd: s.sbd.map((x, j) => j === i ? { ...x, ref: e.target.value } : x) }))} placeholder="Reference" style={{ marginBottom: 6 }} />
              <textarea className="form-textarea" value={v.pt} onChange={(e) => edit((s) => ({ ...s, sbd: s.sbd.map((x, j) => j === i ? { ...x, pt: e.target.value } : x) }))} placeholder="What it says, how it connects, what it means for them" style={{ minHeight: 80 }} />
            </div>
            {xBtn(() => edit((s) => ({ ...s, sbd: s.sbd.filter((_, j) => j !== i) })))}
          </div>
        ))}
        {listBtn("＋ Add one", () => edit((s) => ({ ...s, sbd: [...s.sbd, { ref: "", pt: "" }] })))}
      </div>

      <div style={card}>
        <span style={label}>6 · Discussion questions</span>
        <p style={hint}>Personal and specific, never “what does this mean to you.” Add the answer you would give.{g ? ` One to use: ${g.ask}` : ""}</p>
        {current.qs.map((q, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <textarea className="form-textarea" value={q.q} onChange={(e) => edit((s) => ({ ...s, qs: s.qs.map((x, j) => j === i ? { ...x, q: e.target.value } : x) }))} placeholder={`Question ${i + 1}`} style={{ minHeight: 56, marginBottom: 6 }} />
              <textarea className="form-textarea" value={q.a} onChange={(e) => edit((s) => ({ ...s, qs: s.qs.map((x, j) => j === i ? { ...x, a: e.target.value } : x) }))} placeholder="Your answer (2 sentences)" style={{ minHeight: 56 }} />
            </div>
            {xBtn(() => edit((s) => ({ ...s, qs: s.qs.filter((_, j) => j !== i) })))}
          </div>
        ))}
        {listBtn("＋ Add a question", () => edit((s) => ({ ...s, qs: [...s.qs, { q: "", a: "" }] })))}
      </div>

      <div style={card}>
        <span style={label}>7 · Takeaways</span>
        <p style={hint}>A bold title of 6-12 words, then 1-2 sentences that expand it. These go on the handout and the social card.</p>
        {current.tk.map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <input className="form-input" value={t.ti} onChange={(e) => edit((s) => ({ ...s, tk: s.tk.map((x, j) => j === i ? { ...x, ti: e.target.value } : x) }))} placeholder={`Takeaway ${i + 1}`} style={{ marginBottom: 6 }} />
              <textarea className="form-textarea" value={t.bo} onChange={(e) => edit((s) => ({ ...s, tk: s.tk.map((x, j) => j === i ? { ...x, bo: e.target.value } : x) }))} placeholder="Expand it" style={{ minHeight: 56 }} />
            </div>
            {xBtn(() => edit((s) => ({ ...s, tk: s.tk.filter((_, j) => j !== i) })))}
          </div>
        ))}
        {listBtn("＋ Add a takeaway", () => edit((s) => ({ ...s, tk: [...s.tk, { ti: "", bo: "" }] })))}
      </div>

      <button className="btn btn-primary" style={{ width: "100%", minHeight: 48 }} onClick={publish} disabled={publishing}>
        {publishing ? "Finishing…" : "Finish study — get the handout & social card"}
      </button>
      <p style={{ ...hint, textAlign: "center", marginTop: 8 }}>You can keep it here as long as you like. It saves as you type.</p>
    </div>
  );
}
