"use client";
import { useEffect, useState } from "react";

/**
 * A stale tab asks for JavaScript filenames from the build it was loaded with.
 * Those filenames are content-hashed, so after a deploy they no longer exist
 * and the app fails to start. Nothing is wrong with the coach's data — the page
 * just needs its caches dropped and a reload.
 */
function isStaleBuildError(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk .* failed/i.test(error.message) ||
    /Failed to fetch dynamically imported module/i.test(error.message) ||
    /importing a module script failed/i.test(error.message)
  );
}

/**
 * Drops the service worker and its caches, then reloads. Deliberately leaves
 * localStorage alone: for now it holds the only copy of some studies.
 */
async function reloadFresh() {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {}
  try {
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {}
  window.location.replace("/");
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    // Log to console so a coach can copy and share it
    console.error("App error:", error);

    // A stale build is self-correcting, so fix it rather than asking a coach
    // mid-session to understand it. The flag stops a reload loop if the real
    // problem is something else.
    if (isStaleBuildError(error)) {
      const KEY = "tf_stale_build_reload";
      let alreadyTried = false;
      try { alreadyTried = sessionStorage.getItem(KEY) === "1"; } catch {}
      if (!alreadyTried) {
        try { sessionStorage.setItem(KEY, "1"); } catch {}
        setRecovering(true);
        reloadFresh();
        return;
      }
    }
    // Reaching here on a later render means recovery already ran; let it retry
    // again on the next fresh visit.
    try { sessionStorage.removeItem("tf_stale_build_reload"); } catch {}
  }, [error]);

  if (recovering) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0a3a52", padding: 24, fontFamily: "Arial, sans-serif",
        color: "rgba(255,255,255,0.75)", fontSize: 15, textAlign: "center",
      }}>
        Updating to the latest version…
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0a3a52", padding: 24, fontFamily: "Arial, sans-serif",
    }}>
      <div style={{ maxWidth: 480, width: "100%", background: "white", borderRadius: 16, padding: 32 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f2530", marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 13.5, color: "#567888", lineHeight: 1.6, marginBottom: 20 }}>
          The app hit an unexpected error. Try again — if it keeps happening,
          share the error details below with Anthony. Your studies and notes are
          not affected.
        </p>

        {/* Show the actual error so it can be reported */}
        <div style={{
          background: "#f8f9fa", border: "1px solid #dee2e6", borderRadius: 8,
          padding: "12px 14px", marginBottom: 20, fontSize: 12,
          fontFamily: "monospace", color: "#495057", wordBreak: "break-word",
          maxHeight: 200, overflowY: "auto",
        }}>
          <strong style={{ display: "block", marginBottom: 4, color: "#dc3545" }}>
            {error.name}: {error.message}
          </strong>
          {error.stack && (
            <span style={{ color: "#6c757d", fontSize: 11 }}>
              {error.stack.split("\n").slice(1, 4).join("\n")}
            </span>
          )}
          {error.digest && (
            <span style={{ display: "block", marginTop: 6, color: "#adb5bd" }}>
              Digest: {error.digest}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={reset}
            style={{
              flex: 1, padding: "12px 0", background: "#0f4f6a", color: "white",
              border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => {
              // Sign out and drop caches. Studies, drafts and notes are left
              // alone — some of them exist nowhere else yet.
              try { localStorage.removeItem("tf_coach_session"); } catch {}
              reloadFresh();
            }}
            style={{
              flex: 1, padding: "12px 0", background: "none", color: "#567888",
              border: "1.5px solid #d4e8f2", borderRadius: 8, fontSize: 14,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Clear Session &amp; Reload
          </button>
        </div>
      </div>
    </div>
  );
}
