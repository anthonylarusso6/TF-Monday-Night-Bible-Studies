import type { Study } from "./types";

/**
 * Draws a study as an image sized for Instagram.
 *
 * Done on a canvas rather than by screenshotting the page so the result is a
 * real 1080-wide picture regardless of the phone it was made on, and so no
 * extra library ships to every visitor for something one person uses.
 */

const W = 1080;
const H = 1350; // 4:5 — the tallest Instagram shows without cropping
const PAD = 84;

const NAVY = "#0a3a52";
const NAVY_LIGHT = "#1a6a8e";
const GOLD = "#d4a843";

/** Splits text into lines that fit `maxWidth`, hard-breaking very long words. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (ctx.measureText(word).width <= maxWidth) {
        line = word;
      } else {
        // A single word wider than the card — break it across lines.
        let chunk = "";
        for (const ch of word) {
          if (ctx.measureText(chunk + ch).width > maxWidth) { lines.push(chunk); chunk = ch; }
          else chunk += ch;
        }
        line = chunk;
      }
    }
    lines.push(line);
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Picks the largest font size at or below `start` whose wrapped text fits in
 * `maxLines`, so a long study shrinks to fit instead of running off the card.
 */
function fitFont(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number,
  maxLines: number, start: number, min: number, font: (size: number) => string,
): { size: number; lines: string[] } {
  let size = start;
  let lines: string[] = [];
  while (size >= min) {
    ctx.font = font(size);
    lines = wrap(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
    size -= 2;
  }
  return { size: min, lines: lines.slice(0, maxLines) };
}

export async function renderSocialImage(study: Study): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw the image on this device.");

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, NAVY);
  bg.addColorStop(1, NAVY_LIGHT);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft highlight so the flat gradient has some depth
  const glow = ctx.createRadialGradient(W * 0.82, H * 0.12, 0, W * 0.82, H * 0.12, W * 0.62);
  glow.addColorStop(0, "rgba(255,255,255,0.10)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const inner = W - PAD * 2;
  const footerTop = H - PAD - 34;

  /**
   * Lays the card out from `startY`, painting only when asked. Running it once
   * without painting gives the content height, so the block can be centred —
   * otherwise a short study sits at the top with the lower third empty.
   */
  const layout = (startY: number, paint: boolean): number => {
    let y = startY;

    // Title
    const title = fitFont(ctx, study.title, inner, 4, 66, 40,
      (sz) => `800 ${sz}px Arial, Helvetica, sans-serif`);
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${title.size}px Arial, Helvetica, sans-serif`;
    for (const line of title.lines) {
      if (paint) ctx.fillText(line, PAD, y);
      y += title.size * 1.2;
    }
    y += 14;

    // Date · series
    if (study.date || study.series) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "600 25px Arial, Helvetica, sans-serif";
      if (paint) ctx.fillText([study.date, study.series].filter(Boolean).join("  ·  "), PAD, y);
      y += 46;
    }

    // Anchor verse
    if (study.anchor?.ref) {
      ctx.fillStyle = GOLD;
      ctx.font = "700 27px Arial, Helvetica, sans-serif";
      if (paint) ctx.fillText(study.anchor.ref, PAD, y);
      y += 40;
    }

    // Big idea, in a translucent panel
    if (study.bi) {
      const body = fitFont(ctx, study.bi, inner - 56, 7, 30, 21,
        (sz) => `italic ${sz}px Georgia, 'Times New Roman', serif`);
      const boxH = body.lines.length * body.size * 1.5 + 52;
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      if (paint) roundRect(ctx, PAD, y - 6, inner, boxH, 18);
      if (paint) ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.93)";
      ctx.font = `italic ${body.size}px Georgia, 'Times New Roman', serif`;
      let ty = y + 34;
      for (const line of body.lines) {
        if (paint) ctx.fillText(line, PAD + 28, ty);
        ty += body.size * 1.5;
      }
      y += boxH + 44;
    }

    // Takeaways — only as many as the remaining space allows
    const takeaways = study.tk ?? [];
    if (takeaways.length) {
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "800 22px Arial, Helvetica, sans-serif";
      ctx.letterSpacing = "3px";
      if (paint) ctx.fillText("TAKEAWAYS", PAD, y);
      ctx.letterSpacing = "0px";
      y += 40;

      for (let i = 0; i < takeaways.length; i++) {
        const fit = fitFont(ctx, takeaways[i].ti, inner - 54, 2, 30, 23,
          (sz) => `700 ${sz}px Arial, Helvetica, sans-serif`);
        const blockH = fit.lines.length * fit.size * 1.32 + 24;
        if (y + blockH > footerTop) break;

        ctx.fillStyle = GOLD;
        ctx.font = `800 ${fit.size}px Arial, Helvetica, sans-serif`;
        if (paint) ctx.fillText(`${i + 1}`, PAD, y + fit.size * 0.9);

        ctx.fillStyle = "#ffffff";
        ctx.font = `700 ${fit.size}px Arial, Helvetica, sans-serif`;
        let ly = y + fit.size * 0.9;
        for (const line of fit.lines) {
          if (paint) ctx.fillText(line, PAD + 46, ly);
          ly += fit.size * 1.32;
        }
        y += blockH;
      }
    }
    return y;
  };

  // Masthead — pinned to the top as the fixed brand mark.
  let top = PAD + 18;
  ctx.fillStyle = GOLD;
  ctx.font = "800 25px Arial, Helvetica, sans-serif";
  ctx.letterSpacing = "5px";
  ctx.fillText("TRIPLE F", PAD, top);
  ctx.letterSpacing = "0px";
  top += 34;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "600 23px Arial, Helvetica, sans-serif";
  ctx.fillText("Monday Night Bible Study's", PAD, top);
  top += 26;
  ctx.strokeStyle = "rgba(212,168,67,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD, top);
  ctx.lineTo(PAD + inner, top);
  ctx.stroke();
  const contentTop = top + 62;

  // Everything below the masthead is centred in the space above the footer,
  // capped so a very short study doesn't float adrift in the middle.
  const contentHeight = layout(contentTop, false) - contentTop;
  const slack = Math.max(0, footerTop - contentTop - contentHeight);
  layout(contentTop + Math.min(slack / 2, 110), true);

  // Footer
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "600 23px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("@TFBibleStudies  ·  Knoxville, TN", W / 2, H - PAD + 4);
  ctx.textAlign = "left";

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create the image."))),
      "image/png",
    );
  });
}

export function imageFileName(study: Study): string {
  const slug = study.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `${slug || "bible-study"}.png`;
}

/**
 * Hands the image to the phone's share sheet when that's available — on iOS
 * that's the route to "Save Image" or straight into Instagram — and falls back
 * to a normal download elsewhere.
 */
export async function shareOrDownload(blob: Blob, fileName: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], fileName, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file] });
      return "shared";
    } catch (e) {
      // A cancelled share sheet is not a failure worth falling back from.
      if (e instanceof DOMException && e.name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return "downloaded";
}
