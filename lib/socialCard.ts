import type { Study } from "./types";

/**
 * The text that gets posted about a Monday night.
 *
 * Shared so the study screen and the social posts screen can never drift into
 * producing different wording for the same study.
 */
export function socialCardText(study: Study): string {
  const lines: string[] = [
    `Monday Night Bible Study — ${study.title}`,
    "",
  ];

  if (study.anchor?.ref) {
    lines.push(study.anchor.text ? `${study.anchor.ref} — "${study.anchor.text}"` : study.anchor.ref, "");
  }
  if (study.bi) lines.push(study.bi, "");

  if (study.tk?.length) {
    lines.push(`${study.tk.length} Takeaways:`);
    study.tk.forEach((t, i) => lines.push(`${i + 1}. ${t.ti}`));
    lines.push("");
  }

  lines.push("Triple F Sports · Knoxville, TN");
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Copies text, preferring the async clipboard API and falling back to the old
 * execCommand path for browsers that refuse it (iOS is picky about when the
 * modern API is allowed).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
