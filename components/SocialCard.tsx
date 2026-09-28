"use client";
import { Study } from "@/lib/types";

/**
 * The shareable card for a study. Shared between the study screen and the
 * Social Posts screen so both show the same thing.
 */
export default function SocialCard({ study }: { study: Study }) {
  return (
    <div className="social-card">
      <div className="social-card-logo">TF Monday Night Bible Study&apos;s</div>
      <div className="social-card-title">{study.title}</div>
      <div className="social-card-meta">
        {study.date}{study.series ? ` · ${study.series}` : ""}
      </div>
      {study.bi && <div className="social-card-bi">{study.bi}</div>}
      {study.tk?.length > 0 && (
        <>
          <div className="social-card-tk-label">{study.tk.length} Takeaways</div>
          {study.tk.map((t, i) => (
            <div key={i} className="social-card-tk">{i + 1}. {t.ti}</div>
          ))}
        </>
      )}
      <div className="social-card-footer">@TFBibleStudies</div>
    </div>
  );
}
