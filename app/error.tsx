"use client";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console so a coach can copy and share it
    console.error("App error:", error);
  }, [error]);

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
          The app hit an unexpected error. Try refreshing — if it keeps happening,
          share the error details below with Anthony.
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
              // Clear session & local data, then reload — fixes stale session crashes
              try {
                localStorage.removeItem("tf_coach_session");
              } catch {}
              window.location.href = "/";
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
