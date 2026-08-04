"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { Study, UserData } from "@/lib/types";
import { generateLeaderPDF, generateStudentPDF } from "@/lib/generatePDF";
import SessionTimer from "./SessionTimer";
import StudySections from "./StudySections";
import dynamic from "next/dynamic";
const QRCodeCanvas = dynamic(() => import("qrcode").then(mod => {
  // Use qrcode to generate a data URL, render as img
  return { default: ({ value }: { value: string }) => {
    const [url, setUrl] = useState("");
    useEffect(() => { mod.toDataURL(value, { width: 240, margin: 2 }).then(setUrl); }, [value]);
    return url ? <img src={url} alt="QR Code" style={{ width: 220, height: 220, display: "block", margin: "0 auto" }} /> : <div style={{width:220,height:220,background:"var(--border)",borderRadius:8}} />;
  }};
}), { ssr: false });

interface StudyModalProps {
  study: Study;
  userData: UserData;
  onClose: () => void;
  onSaveNotes: (id: string | number, notes: string) => void;
  onSaveAttend: (id: string | number, count: number) => void;
  onDeleteDraft: (id: string | number) => void;
  onDeleteStudy: (id: string | number) => void;
  onToast: (msg: string) => void;
}

export default function StudyModal({
  study,
  userData,
  onClose,
  onSaveNotes,
  onSaveAttend,
  onDeleteDraft,
  onDeleteStudy,
  onToast,
}: StudyModalProps) {
  const sid = String(study.id);
  const [notes, setNotes] = useState(userData.notes[sid] || "");
  const [attend, setAttend] = useState(String(userData.attendance[sid] || ""));
  const [showTimer, setShowTimer] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [ratingStars, setRatingStars] = useState(() => {
    try { const r = JSON.parse((userData.notes as Record<string,string>)[`_rating_${sid}`] || "{}"); return r.stars || 0; } catch { return 0; }
  });
  const [ratingHit, setRatingHit] = useState(() => {
    try { const r = JSON.parse((userData.notes as Record<string,string>)[`_rating_${sid}`] || "{}"); return r.whatHit || ""; } catch { return ""; }
  });
  const [ratingChange, setRatingChange] = useState(() => {
    try { const r = JSON.parse((userData.notes as Record<string,string>)[`_rating_${sid}`] || "{}"); return r.whatToChange || ""; } catch { return ""; }
  });
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // ESC key closes modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function copyText(txt: string) {
    try {
      const ta = document.createElement("textarea");
      ta.value = txt;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }

  function doDownload() {
    const allV = [study.anchor, ...study.sup];
    const vHtml = allV
      .map((v) => `<div class="v"><span class="vr">${v.ref}</span><span class="vt">${v.text}</span></div>`)
      .join("");
    const qHtml = study.qs
      .map((q, i) => `<div class="qb"><div class="qq">${i + 1}. ${q.q}</div><div class="ln"></div><div class="ln"></div><div class="ln"></div></div>`)
      .join("");
    const tHtml = study.tk
      .map((t) => `<div class="tb"><div class="tt">${t.ti}</div><div class="ln"></div><div class="ln"></div></div>`)
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${study.title}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;max-width:680px;margin:0 auto;padding:40px 32px;color:#000;background:#fff}
h1{font-size:22px;text-align:center;margin-bottom:4px}.th{font-size:13px;text-align:center;font-style:italic;color:#333;margin-bottom:20px}
.vbox{border-top:1px solid #000;border-bottom:1px solid #000;padding:12px 0;margin-bottom:24px}.v{margin-bottom:10px;font-size:13px}
.vr{font-weight:bold;display:block;margin-bottom:2px}.vt{font-style:italic}
.sc{font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;font-family:Arial,sans-serif;border-bottom:1px solid #000;padding-bottom:4px}
.qb{margin-bottom:20px}.qq{font-size:14px;font-weight:bold;margin-bottom:8px}.ln{border-bottom:1px solid #000;height:22px;margin-bottom:5px}
.tb{margin-bottom:18px}.tt{font-size:14px;font-weight:bold;margin-bottom:6px}.tks{margin-top:24px;border-top:1px solid #000;padding-top:16px}
</style></head><body>
<h1>${study.title}</h1><p class="th">${study.bi}</p>
<div class="vbox">${vHtml}</div>
<div class="sc">Discussion Questions</div>${qHtml}
<div class="tks"><div class="sc">3 Takeaways — What stands out to you?</div>${tHtml}</div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = study.title.replace(/[^a-z0-9]/gi, "_") + ".html";
    a.click();
    URL.revokeObjectURL(url);
    onToast("Downloaded!");
  }

  function doCopyFull() {
    let txt = `TF BIBLE STUDIES\n${study.title} | ${study.date}\n\nBIG IDEA\n${study.bi}\n\nANCHOR VERSE\n${study.anchor.ref}\n"${study.anchor.text}"\n\nVERSE BREAKDOWN\n`;
    for (const b of study.bd) {
      txt += `\n${b.ph}\n`;
      for (const p of b.pts) txt += `→ ${p}\n`;
      if (b.co) txt += `\n[${b.co.lb}]\n${b.co.tx}\n`;
    }
    txt += "\nSUPPORTING VERSES\n";
    for (let i = 0; i < study.sup.length; i++) {
      txt += `\n${study.sup[i].ref}\n"${study.sup[i].text}"\n`;
      if (study.sbd[i]) txt += `→ ${study.sbd[i].pt}\n`;
    }
    txt += "\nDISCUSSION QUESTIONS\n";
    for (let i = 0; i < study.qs.length; i++) txt += `\n${i + 1}. ${study.qs[i].q}\n${study.qs[i].a}\n`;
    txt += "\n3 TAKEAWAYS\n";
    for (let i = 0; i < study.tk.length; i++) txt += `\n${i + 1}. ${study.tk[i].ti}\n${study.tk[i].bo}\n`;
    if (notes) txt += `\nLEADER NOTES\n${notes}\n`;
    copyText(txt) ? onToast("Full study copied!") : onToast("Could not copy — try again.");
  }

  function doCopyCard() {
    let txt = `TF Monday Night Bible Study's\n${study.title} | ${study.date}\n\n${study.bi}\n\n3 Takeaways\n`;
    for (let i = 0; i < study.tk.length; i++) txt += `${i + 1}. ${study.tk[i].ti}\n`;
    copyText(txt) ? onToast("Social card text copied!") : onToast("Could not copy — try again.");
  }

  const socialRef = useRef<HTMLDivElement>(null);

  return (
    <>
    <div className="overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal" role="dialog" aria-modal="true">
        {/* Sticky header */}
        <div className="modal-close">
          <div className="modal-meta">
            {study.date}
            {study.series ? ` · ${study.series}` : ""}
            {study.draft ? " · DRAFT" : ""}
          </div>
          <button className="close-btn" onClick={onClose}>✕ Close</button>
        </div>

        <div className="modal-body">
          <div className="modal-title">{study.title}</div>
          {study.subtitle && <div className="modal-subtitle">{study.subtitle}</div>}

          {/* Big Idea */}
          <div className="sec">
            <div className="sec-label">Big Idea</div>
            <div className="big-idea">{study.bi}</div>
          </div>

          {/* Anchor Verse */}
          {study.anchor?.ref && (
            <div className="sec">
              <div className="sec-label">Anchor Verse</div>
              <div className="verse-box">
                <b>{study.anchor.ref}</b>
                <span>{study.anchor.text}</span>
              </div>
            </div>
          )}

          {/* Imported studies render their original part structure instead of
              the breakdown / supporting-verse / question sections below. */}
          {study.sections?.length ? (
            <StudySections sections={study.sections} />
          ) : null}

          {/* Verse Breakdown */}
          {!study.sections?.length && study.bd?.length > 0 && (
            <div className="sec">
              <div className="sec-label">Verse Breakdown</div>
              {study.bd.map((b, i) => (
                <div key={i}>
                  <div className="phrase">{b.ph}</div>
                  {b.pts.map((p, j) => (
                    <div key={j} className="point">{p}</div>
                  ))}
                  {b.co && (
                    <div className="callout">
                      <b>{b.co.lb}</b>
                      {b.co.tx}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Supporting Verses */}
          {!study.sections?.length && study.sup?.length > 0 && (
            <div className="sec">
              <div className="sec-label">Supporting Verses</div>
              {study.sup.map((v, i) => (
                <div key={i}>
                  <div className="verse-box">
                    <b>{v.ref}</b>
                    <span>{v.text}</span>
                  </div>
                  {study.sbd?.[i] && (
                    <div className="point" style={{ marginBottom: 12 }}>
                      {study.sbd[i].pt}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Discussion Questions — inline in the sections for imported studies */}
          {!study.sections?.length && study.qs?.length > 0 && (
            <div className="sec">
              <div className="sec-label">Discussion Questions</div>
              {study.qs.map((q, i) => (
                <div key={i} className="dq">
                  <div className="dq-q">{i + 1}. {q.q}</div>
                  <div className="dq-a">{q.a}</div>
                </div>
              ))}
            </div>
          )}

          {/* Takeaways */}
          {study.tk?.length > 0 && (
            <div className="sec">
              <div className="sec-label">3 Takeaways</div>
              {study.tk.map((t, i) => (
                <div key={i} className="takeaway">
                  <b>{t.ti}</b>
                  <span>{t.bo}</span>
                </div>
              ))}
            </div>
          )}

          {/* Leader Notes */}
          <div className="sec">
            <div className="sec-label">Leader Notes</div>
            <textarea
              className="notes-area"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did the session go? What hit? What to revisit..."
            />
            <button className="save-btn" onClick={() => { onSaveNotes(study.id, notes); onToast("Notes saved!"); }}>
              Save Notes
            </button>
          </div>

          {/* Attendance + Clicker */}
          <div className="sec">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="sec-label" style={{ margin: 0 }}>Attendance</div>
              <button onClick={() => setShowTimer(true)} style={{ background: "var(--primary)", color: "white", border: "none", borderRadius: 9, padding: "10px 16px", minHeight: 44, fontSize: 13.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>⏱ Start Timer</button>
            </div>
            {/* Big clicker */}
            <div style={{ display: "flex", alignItems: "center", gap: 0, background: "var(--bg)", borderRadius: 12, border: "1.5px solid var(--border)", overflow: "hidden", marginBottom: 10 }}>
              <button onClick={() => setAttend(a => String(Math.max(0, (parseInt(a)||0) - 1)))} style={{ width: 52, height: 52, fontSize: 24, background: "none", border: "none", cursor: "pointer", color: "var(--text2)", fontWeight: 300 }}>−</button>
              <div style={{ flex: 1, textAlign: "center" }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{attend || "0"}</span>
                <span style={{ fontSize: 12, color: "var(--text2)", marginLeft: 4 }}>students</span>
              </div>
              <button onClick={() => setAttend(a => String((parseInt(a)||0) + 1))} style={{ width: 52, height: 52, fontSize: 24, background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontWeight: 700 }}>＋</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[5,10,15,20].map(n => (
                <button key={n} onClick={() => setAttend(String(n))} style={{ flex: 1, padding: "12px 0", minHeight: 44, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 9, fontSize: 14, fontWeight: 700, color: "var(--text2)", cursor: "pointer" }}>+{n}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="save-btn" onClick={() => { if (attend) { onSaveAttend(study.id, parseInt(attend)); onToast(`Attendance saved — ${attend} students!`); }}}>Save Attendance</button>
              {userData.attendance[sid] && <span className="attend-display">Last: {userData.attendance[sid]} students</span>}
            </div>
          </div>

          {/* Post-Session Rating */}
          <div className="sec">
            <div className="sec-label">Session Rating</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRatingStars(n)} style={{ fontSize: 27, background: "none", border: "none", cursor: "pointer", opacity: n <= ratingStars ? 1 : 0.25, transition: "opacity 0.1s", padding: "6px 8px", minWidth: 44, minHeight: 44 }}>⭐</button>
              ))}
            </div>
            <input className="form-input" style={{ marginBottom: 8 }} placeholder="What hit with the students?" value={ratingHit} onChange={e => setRatingHit(e.target.value)} />
            <input className="form-input" style={{ marginBottom: 10 }} placeholder="What would you change?" value={ratingChange} onChange={e => setRatingChange(e.target.value)} />
            <button className="save-btn" onClick={() => {
              onSaveNotes(study.id, notes);
              const ratingKey = `_rating_${sid}`;
              onSaveNotes(ratingKey, JSON.stringify({ stars: ratingStars, whatHit: ratingHit, whatToChange: ratingChange, date: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) }));
              onToast("Rating saved!");
            }}>Save Rating</button>
          </div>

          {/* Student tools (non-draft only) */}
          {!study.draft && (
            <>
              <hr className="divider" />
              <div className="divider-label">Student Tools</div>
              <div className="btn-row">
                <button className="btn btn-primary" onClick={() => {
                  const att = userData.attendance[sid];
                  generateLeaderPDF(study, notes, att);
                  onToast("Leader guide PDF downloaded!");
                }}>📄 Leader PDF</button>
                <button className="btn btn-outline" onClick={() => { generateStudentPDF(study); onToast("Student PDF downloaded!"); }}>📋 Student PDF</button>
                <button className="btn btn-outline" onClick={() => setShowQR(true)}>📲 QR Code</button>
                <button className="btn btn-outline" onClick={doCopyFull}>📎 Copy</button>
                <button className="btn btn-outline" onClick={() => socialRef.current?.scrollIntoView({ behavior: "smooth" })}>📱 Social</button>
              </div>

              {/* Social card */}
              <hr className="divider" />
              <div className="divider-label">Social Media Card</div>
              <div className="social-card" ref={socialRef}>
                <div className="social-card-logo">TF Monday Night Bible Study's</div>
                <div className="social-card-title">{study.title}</div>
                <div className="social-card-meta">
                  {study.date}{study.series ? ` · ${study.series}` : ""}
                </div>
                <div className="social-card-bi">{study.bi}</div>
                <div className="social-card-tk-label">3 Takeaways</div>
                {study.tk.map((t, i) => (
                  <div key={i} className="social-card-tk">{i + 1}. {t.ti}</div>
                ))}
                <div className="social-card-footer">@TFBibleStudies</div>
              </div>
              <button className="btn btn-outline" onClick={doCopyCard}>📋 Copy Social Card Text</button>
            </>
          )}

          {/* Delete — available on all studies */}
          <hr className="divider" />
          <button
            className="btn btn-danger"
            onClick={() => {
              const label = study.draft ? "draft" : "study";
              if (confirm(`Remove this ${label}? This cannot be undone.`)) {
                if (study.draft) {
                  onDeleteDraft(study.id);
                } else {
                  onDeleteStudy(study.id);
                }
                onClose();
              }
            }}
          >
            🗑 {study.draft ? "Delete Draft" : "Remove Study"}
          </button>
        </div>
      </div>
    </div>

    {/* Session Timer overlay */}
    {showTimer && <SessionTimer onClose={() => setShowTimer(false)} />}

    {/* QR Code modal */}
    {showQR && (
      <div onClick={() => setShowQR(false)} style={{ position: "fixed", inset: 0, background: "rgba(5,18,28,0.75)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: 20, padding: "28px 24px", maxWidth: 300, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f2530", marginBottom: 6 }}>Student Page QR Code</div>
          <div style={{ fontSize: 12, color: "#567888", marginBottom: 16, fontFamily: "Arial, sans-serif" }}>Display this on screen so students can follow along</div>
          <QRCodeCanvas value={`${typeof window !== "undefined" ? window.location.origin : ""}/student`} />
          <div style={{ fontSize: 11, color: "#567888", marginTop: 12, fontFamily: "Arial, sans-serif" }}>/student</div>
          <button onClick={() => setShowQR(false)} style={{ marginTop: 16, padding: "10px 24px", background: "#0f4f6a", color: "white", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%" }}>Done</button>
        </div>
      </div>
    )}
    </>
  );
}
