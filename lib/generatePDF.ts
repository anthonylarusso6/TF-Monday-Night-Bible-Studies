import { jsPDF } from "jspdf";
import { Study } from "./types";

const NAVY = [15, 79, 106] as const;
const GOLD = [212, 168, 67] as const;
const GRAY = [100, 120, 130] as const;
const BLACK = [20, 40, 50] as const;

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function sectionLabel(doc: jsPDF, label: string, y: number): number {
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text(label.toUpperCase(), 18, y);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(18, y + 1.5, 192, y + 1.5);
  return y + 7;
}

function checkPage(doc: jsPDF, y: number, needed = 14): number {
  if (y + needed > 276) {
    doc.addPage();
    return 18;
  }
  return y;
}

export function generateLeaderPDF(study: Study, notes: string, attendance: number | undefined): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 174; // usable width
  let y = 18;

  // ── Header ──
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 32, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(212, 168, 67);
  doc.text("TRIPLE F · MONDAY NIGHT BIBLE STUDY'S", 18, 10);
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(study.title, W - 20);
  doc.text(titleLines, 18, 18);
  doc.setFontSize(8);
  doc.setTextColor(180, 210, 225);
  doc.text(`${study.date}${study.series ? "  ·  " + study.series : ""}${attendance ? "  ·  " + attendance + " students" : ""}`, 18, 29);
  y = 40;

  // ── Big Idea ──
  y = sectionLabel(doc, "Big Idea", y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...BLACK);
  y = addWrappedText(doc, study.bi, 18, y, W, 5.5);
  y += 6;

  // ── Anchor Verse ──
  y = checkPage(doc, y);
  y = sectionLabel(doc, "Anchor Verse", y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(study.anchor.ref, 18, y);
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...BLACK);
  y = addWrappedText(doc, `"${study.anchor.text}"`, 18, y, W, 5);
  y += 6;

  // ── Verse Breakdown ──
  if (study.bd?.length) {
    y = checkPage(doc, y);
    y = sectionLabel(doc, "Verse Breakdown", y);
    for (const b of study.bd) {
      y = checkPage(doc, y, 10);
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      y = addWrappedText(doc, b.ph, 18, y, W, 5.5);
      y += 1;
      for (const p of b.pts) {
        y = checkPage(doc, y, 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...BLACK);
        y = addWrappedText(doc, `→  ${p}`, 24, y, W - 8, 5);
      }
      if (b.co) {
        y = checkPage(doc, y, 12);
        doc.setFillColor(255, 250, 230);
        const calloutLines = doc.splitTextToSize(b.co.tx, W - 14);
        doc.roundedRect(18, y - 2, W, calloutLines.length * 5 + 10, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...GOLD);
        doc.text(b.co.lb.toUpperCase(), 22, y + 3);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        y = addWrappedText(doc, b.co.tx, 22, y + 8, W - 10, 5);
        y += 4;
      }
      y += 3;
    }
  }

  // ── Supporting Verses ──
  if (study.sup?.length) {
    y = checkPage(doc, y);
    y = sectionLabel(doc, "Supporting Verses", y);
    for (let i = 0; i < study.sup.length; i++) {
      const v = study.sup[i];
      y = checkPage(doc, y, 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      doc.text(v.ref, 18, y);
      y += 5;
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...BLACK);
      y = addWrappedText(doc, `"${v.text}"`, 18, y, W, 5);
      if (study.sbd?.[i]) {
        y += 2;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...GRAY);
        y = addWrappedText(doc, study.sbd[i].pt, 22, y, W - 6, 5);
      }
      y += 5;
    }
  }

  // ── Discussion Questions ──
  if (study.qs?.length) {
    y = checkPage(doc, y);
    y = sectionLabel(doc, "Discussion Questions", y);
    study.qs.forEach((q, i) => {
      y = checkPage(doc, y, 16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...BLACK);
      y = addWrappedText(doc, `${i + 1}.  ${q.q}`, 18, y, W, 5.5);
      y += 1;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      y = addWrappedText(doc, q.a, 26, y, W - 10, 5);
      y += 5;
    });
  }

  // ── Takeaways ──
  if (study.tk?.length) {
    y = checkPage(doc, y);
    y = sectionLabel(doc, "3 Takeaways", y);
    study.tk.forEach((t, i) => {
      y = checkPage(doc, y, 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      y = addWrappedText(doc, `${i + 1}.  ${t.ti}`, 18, y, W, 5.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      y = addWrappedText(doc, t.bo, 26, y + 1, W - 10, 5);
      y += 5;
    });
  }

  // ── Leader Notes ──
  if (notes) {
    y = checkPage(doc, y);
    y = sectionLabel(doc, "Leader Notes", y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BLACK);
    y = addWrappedText(doc, notes, 18, y, W, 5);
    y += 6;
  }

  // ── Footer on each page ──
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 180, 190);
    doc.text("TF Monday Night Bible Study's  ·  Triple F Sports, Knoxville TN", 18, 290);
    doc.text(`${p} / ${pageCount}`, 192, 290, { align: "right" });
  }

  doc.save(`${study.title.replace(/[^a-z0-9]/gi, "_")}_leader.pdf`);
}

export function generateStudentPDF(study: Study): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 174;
  let y = 18;

  // Header
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, 210, 32, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...GOLD);
  doc.text("TRIPLE F · MONDAY NIGHT BIBLE STUDY'S", 18, 10);
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(doc.splitTextToSize(study.title, W - 20), 18, 18);
  doc.setFontSize(8);
  doc.setTextColor(180, 210, 225);
  doc.text(`${study.date}${study.series ? "  ·  " + study.series : ""}`, 18, 29);
  y = 40;

  // Big Idea
  y = sectionLabel(doc, "Main Theme", y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...BLACK);
  y = addWrappedText(doc, study.bi, 18, y, W, 5.5);
  y += 6;

  // Verses
  y = checkPage(doc, y);
  y = sectionLabel(doc, "Verses", y);
  const allVerses = [study.anchor, ...study.sup];
  for (const v of allVerses) {
    y = checkPage(doc, y, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(v.ref, 18, y);
    y += 5;
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...BLACK);
    y = addWrappedText(doc, `"${v.text}"`, 18, y, W, 5);
    y += 5;
  }

  // Discussion Questions — no answers
  if (study.qs?.length) {
    y = checkPage(doc, y);
    y = sectionLabel(doc, "Discussion Questions", y);
    study.qs.forEach((q, i) => {
      y = checkPage(doc, y, 28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...BLACK);
      y = addWrappedText(doc, `${i + 1}.  ${q.q}`, 18, y, W, 5.5);
      y += 2;
      // Answer lines
      for (let l = 0; l < 3; l++) {
        doc.setDrawColor(200, 215, 220);
        doc.setLineWidth(0.3);
        doc.line(18, y, 192, y);
        y += 7;
      }
      y += 2;
    });
  }

  // Takeaways — fill-in
  if (study.tk?.length) {
    y = checkPage(doc, y);
    y = sectionLabel(doc, "3 Takeaways — What stands out to you?", y);
    study.tk.forEach((t, i) => {
      y = checkPage(doc, y, 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      y = addWrappedText(doc, `${i + 1}.  ${t.ti}`, 18, y, W, 5.5);
      y += 2;
      for (let l = 0; l < 2; l++) {
        doc.setDrawColor(200, 215, 220);
        doc.setLineWidth(0.3);
        doc.line(18, y, 192, y);
        y += 7;
      }
      y += 3;
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 180, 190);
    doc.text("TF Monday Night Bible Study's  ·  Triple F Sports, Knoxville TN", 18, 290);
    doc.text(`${p} / ${pageCount}`, 192, 290, { align: "right" });
  }

  doc.save(`${study.title.replace(/[^a-z0-9]/gi, "_")}_student.pdf`);
}
