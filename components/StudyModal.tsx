"use client";
import { useRef, useState, useEffect } from "react";
import { Study, UserData } from "@/lib/types";
import { generateLeaderPDF, generateStudentPDF } from "@/lib/generatePDF";

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

          {/* Verse Breakdown */}
          {study.bd?.length > 0 && (
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
          {study.sup?.length > 0 && (
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

          {/* Discussion Questions */}
          {study.qs?.length > 0 && (
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

          {/* Attendance */}
          <div className="sec">
            <div className="sec-label">Attendance</div>
            <div className="attend-row">
              <input
                className="attend-input"
                type="number"
                min={0}
                placeholder="# students"
                value={attend}
                onChange={(e) => setAttend(e.target.value)}
              />
              <button
                className="save-btn"
                onClick={() => {
                  if (attend) {
                    onSaveAttend(study.id, parseInt(attend));
                    onToast(`Attendance saved — ${attend} students!`);
                  }
                }}
              >
                Save
              </button>
              {userData.attendance[sid] && (
                <span className="attend-display">Last: {userData.attendance[sid]} students</span>
              )}
            </div>
          </div>

          {/* Student tools (non-draft only) */}
          {!study.draft && (
            <>
              <hr className="divider" />
              <div className="divider-label">Student Tools</div>
              <div className="btn-row">
                <button className="btn btn-primary" onClick={() => {
                  const attend = userData.attendance[sid];
                  generateLeaderPDF(study, notes, attend);
                  onToast("Leader guide PDF downloaded!");
                }}>📄 Download Leader PDF</button>
                <button className="btn btn-outline" onClick={() => {
                  generateStudentPDF(study);
                  onToast("Student handout PDF downloaded!");
                }}>📋 Download Student PDF</button>
                <button className="btn btn-outline" onClick={doCopyFull}>📎 Copy Full Study</button>
                <button className="btn btn-outline" onClick={() => socialRef.current?.scrollIntoView({ behavior: "smooth" })}>
                  📱 Social Card
                </button>
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
  );
}
