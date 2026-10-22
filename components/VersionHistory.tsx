"use client";
import { useEffect, useState } from "react";
import type { Study } from "@/lib/types";
import { authFetch } from "@/lib/session";

interface Version { vid: string; at: string; byName: string; study: Study }

/** Earlier saved versions of a study, newest first, with a Restore for each. */
export default function VersionHistory({ locationId, studyId, onRestore, onClose }: {
  locationId: string; studyId: string | number; onRestore: (s: Study) => void; onClose: () => void;
}) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authFetch(`/api/versions?location=${encodeURIComponent(locationId)}&studyId=${encodeURIComponent(String(studyId))}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => (j.ok ? setVersions(j.versions as Version[]) : setError(j.error || "Could not load.")))
      .catch(() => setError("Could not load the history."));
  }, [locationId, studyId]);

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14, margin: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <b style={{ fontSize: 14 }}>Earlier versions</b>
        <button className="btn btn-outline" onClick={onClose}>Close</button>
      </div>
      {error && <div className="error-box">{error}</div>}
      {!versions && !error && <div style={{ fontSize: 13, color: "var(--text2)" }}>Loading…</div>}
      {versions && versions.length === 0 && (
        <div style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif" }}>
          No earlier versions yet. One is kept each time you save a change.
        </div>
      )}
      {versions?.map((v) => (
        <div key={v.vid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderTop: "1px solid var(--border)", fontFamily: "Arial, sans-serif", fontSize: 13 }}>
          <div>
            {new Date(v.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            <div style={{ fontSize: 11, color: "var(--text2)" }}>replaced by {v.byName} · {v.study.title}</div>
          </div>
          <button className="btn btn-outline" onClick={() => { if (confirm("Put this version back? The current one is kept in the history.")) onRestore(v.study); }}>Restore</button>
        </div>
      ))}
    </div>
  );
}
