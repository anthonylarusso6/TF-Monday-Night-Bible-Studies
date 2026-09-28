"use client";
import { useState } from "react";
import { Study, UserData } from "@/lib/types";
import { socialCardText, copyToClipboard } from "@/lib/socialCard";
import { loadPlan, getNextMondays, dateKey, speakerLabel, SPEAKER_TYPES } from "@/lib/plan";
import SocialCard from "./SocialCard";

interface SocialPostsProps {
  studies: Study[];
  userData: UserData;
  onToast: (msg: string) => void;
}

/** Roughly a month of Monday nights. */
const WEEKS_AHEAD = 5;

/**
 * What someone writing the posts needs, without going through a study: the
 * card for what was just talked about, and who is speaking over the next month.
 */
export default function SocialPosts({ studies, userData, onToast }: SocialPostsProps) {
  const published = studies.filter((s) => !s.draft);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selected =
    published.find((s) => String(s.id) === selectedId) ?? published[0] ?? null;

  const plan = loadPlan(userData);
  const upcoming = getNextMondays(WEEKS_AHEAD).map((date) => ({
    date,
    planned: plan.find((p) => p.date === dateKey(date)),
  }));

  async function copy() {
    if (!selected) return;
    const ok = await copyToClipboard(socialCardText(selected));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      onToast("Post text copied.");
    } else {
      onToast("Couldn't copy — select the text in the box below instead.");
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Social Posts</h3>
        <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.6 }}>
          The card for what was talked about, and who&apos;s speaking over the next month.
        </p>
      </div>

      {selected ? (
        <>
          {/* Which study the card is for. Most recent is chosen by default. */}
          {published.length > 1 && (
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">Study</label>
              <select
                className="form-select"
                value={String(selected.id)}
                onChange={(e) => { setSelectedId(e.target.value); setCopied(false); }}
              >
                {published.map((s, i) => (
                  <option key={s.id} value={String(s.id)}>
                    {i === 0 ? "Most recent — " : ""}{s.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <SocialCard study={selected} />

          <button
            onClick={copy}
            style={{
              width: "100%", minHeight: 52, padding: "14px 16px", marginTop: 4,
              background: copied ? "var(--series-rel)" : "var(--primary)",
              color: "white", border: "none", borderRadius: 11,
              fontSize: 15, fontWeight: 700, cursor: "pointer",
              WebkitTapHighlightColor: "transparent", transition: "background 0.15s",
            }}
          >
            {copied ? "✓ Copied" : "📋 Copy Post Text"}
          </button>

          <details style={{ marginTop: 10 }}>
            <summary style={{ fontSize: 12.5, color: "var(--text2)", fontFamily: "Arial, sans-serif", cursor: "pointer", padding: "10px 0", minHeight: 40 }}>
              Show the text
            </summary>
            <textarea
              readOnly
              value={socialCardText(selected)}
              onFocus={(e) => e.currentTarget.select()}
              style={{
                width: "100%", marginTop: 6, minHeight: 220, padding: "12px 13px",
                border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)",
                color: "var(--text)", fontSize: 13, lineHeight: 1.6,
                fontFamily: "Georgia, serif", resize: "vertical", boxSizing: "border-box",
              }}
            />
          </details>
        </>
      ) : (
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "26px 18px", textAlign: "center" }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>No studies yet</div>
          <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.55 }}>
            Once a study is added, its card will show up here ready to share.
          </p>
        </div>
      )}

      {/* ── The next month of Monday nights ── */}
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text2)", margin: "30px 0 10px" }}>
        Speaking Over the Next Month
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {upcoming.map(({ date, planned }, i) => {
          const st = SPEAKER_TYPES.find((t) => t.value === (planned?.speakerType || "coach"))!;
          const who = planned ? speakerLabel(planned) : null;
          return (
            <div
              key={dateKey(date)}
              style={{
                background: "var(--card)",
                border: `1px solid ${i === 0 ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "var(--radius)", padding: "13px 15px",
                display: "flex", alignItems: "flex-start", gap: 13,
              }}
            >
              <div style={{ flexShrink: 0, textAlign: "center", minWidth: 44 }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--text2)" }}>
                  {date.toLocaleDateString("en-US", { month: "short" })}
                </div>
                <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.1, color: i === 0 ? "var(--accent)" : "var(--text)" }}>
                  {date.getDate()}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {i === 0 && (
                  <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--accent)", marginBottom: 3 }}>
                    This Monday
                  </div>
                )}
                {who ? (
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: st.color, lineHeight: 1.35 }}>
                    {st.icon} {who}
                  </div>
                ) : (
                  <div style={{ fontSize: 13.5, color: "var(--text2)", fontStyle: "italic" }}>
                    Speaker not set yet
                  </div>
                )}
                {planned?.topic && (
                  <div style={{ fontSize: 13, color: "var(--text)", marginTop: 3, lineHeight: 1.4 }}>{planned.topic}</div>
                )}
                {planned?.notes && (
                  <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: "Arial, sans-serif", marginTop: 3, lineHeight: 1.45 }}>{planned.notes}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
