"use client";
import { useState } from "react";
import { UserData } from "@/lib/types";

interface PrayerRequest {
  id: string;
  name: string;
  request: string;
  date: string;
  status: "praying" | "answered";
}

interface PrayerRequestsProps {
  userData: UserData;
  /** Where this coach's own requests are kept: private to them (and readable by the Creator). */
  storageKey: string;
  isCreator?: boolean;
  coachNames?: Record<string, string>;
  onSave: (requests: PrayerRequest[]) => void;
}

function parseList(raw: string | undefined): PrayerRequest[] {
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
}

/** Mine: my own key, or (the Creator only) the old shared list until the first save moves it into my own. */
function loadRequests(userData: UserData, storageKey: string, isCreator?: boolean): PrayerRequest[] {
  const n = userData.notes as Record<string, string>;
  return parseList(n[storageKey] ?? (isCreator ? n._prayers : undefined));
}

export default function PrayerRequests({ userData, storageKey, isCreator, coachNames = {}, onSave }: PrayerRequestsProps) {
  const [requests, setRequests] = useState<PrayerRequest[]>(loadRequests(userData, storageKey, isCreator));
  // The Creator also reads every other coach's requests (the server sends them only to him).
  const others = isCreator
    ? Object.entries(userData.notes as Record<string, string>)
        .filter(([k]) => k.startsWith("_prayers_") && k !== storageKey)
        .map(([k, v]) => ({ who: coachNames[k.slice("_prayers_".length)] || "Another coach", list: parseList(v) }))
        .filter((o) => o.list.length)
    : [];
  const [name, setName] = useState("");
  const [request, setRequest] = useState("");
  const [filter, setFilter] = useState<"all" | "praying" | "answered">("praying");

  function add() {
    if (!request.trim()) return;
    const newReq: PrayerRequest = {
      id: `pr_${Date.now()}`,
      name: name.trim(),
      request: request.trim(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "praying",
    };
    const updated = [newReq, ...requests];
    setRequests(updated);
    onSave(updated);
    setName("");
    setRequest("");
  }

  function markAnswered(id: string) {
    const updated = requests.map(r => r.id === id ? { ...r, status: "answered" as const } : r);
    setRequests(updated);
    onSave(updated);
  }

  function remove(id: string) {
    const updated = requests.filter(r => r.id !== id);
    setRequests(updated);
    onSave(updated);
  }

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);
  const prayingCount = requests.filter(r => r.status === "praying").length;
  const answeredCount = requests.filter(r => r.status === "answered").length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Prayer Requests</h3>
        <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.6 }}>
          Track requests from your students. Nothing gets forgotten. Only you{isCreator ? "" : " and the Creator"} can see these.
        </p>
      </div>

      {/* Add new */}
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px", marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "var(--text2)", marginBottom: 12 }}>Add Request</div>
        <input
          className="form-input"
          style={{ marginBottom: 10 }}
          placeholder="Student name (optional)"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <textarea
          className="notes-area"
          style={{ minHeight: 70, marginBottom: 10 }}
          placeholder="What are they asking prayer for?"
          value={request}
          onChange={e => setRequest(e.target.value)}
          onKeyDown={e => e.key === "Enter" && e.metaKey && add()}
        />
        <button className="save-btn" onClick={add} disabled={!request.trim()}>
          🙏 Add Request
        </button>
      </div>

      {/* Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        {(["praying", "answered", "all"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${filter === f ? "var(--accent)" : "var(--border)"}`, background: filter === f ? "rgba(26,138,181,0.1)" : "var(--card)", color: filter === f ? "var(--accent)" : "var(--text2)", fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
            {f === "praying" ? `🙏 Praying (${prayingCount})` : f === "answered" ? `✅ Answered (${answeredCount})` : `All (${requests.length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text2)", fontFamily: "Arial, sans-serif", fontSize: 14 }}>
          {filter === "praying" ? "No active prayer requests. Add one above." : filter === "answered" ? "No answered prayers yet." : "No prayer requests yet."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(req => (
            <div key={req.id} style={{ background: "var(--card)", border: `1.5px solid ${req.status === "answered" ? "rgba(4,120,87,0.3)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "14px 16px", opacity: req.status === "answered" ? 0.7 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  {req.name && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 3 }}>{req.name}</div>}
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)", fontFamily: "Georgia, serif" }}>{req.request}</div>
                  <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 5, fontFamily: "Arial, sans-serif" }}>{req.date} · {req.status === "answered" ? "✅ Answered" : "🙏 Praying"}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {req.status === "praying" && (
                    <button onClick={() => markAnswered(req.id)} style={{ padding: "5px 10px", background: "rgba(4,120,87,0.1)", color: "#047857", border: "1px solid rgba(4,120,87,0.25)", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓ Answered</button>
                  )}
                  <button onClick={() => remove(req.id)} style={{ padding: "5px 8px", background: "none", color: "var(--text2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, cursor: "pointer" }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text2)", marginBottom: 10 }}>From other coaches (read only)</div>
          {others.map((o) => (
            <div key={o.who} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{o.who}</div>
              {o.list.map((r) => (
                <div key={r.id} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 6, fontFamily: "Georgia, serif", fontSize: 14, lineHeight: 1.5 }}>
                  {r.name && <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)" }}>{r.name}</div>}
                  {r.request}
                  <div style={{ fontSize: 11, color: "var(--text2)", marginTop: 4, fontFamily: "Arial, sans-serif" }}>{r.date} · {r.status === "answered" ? "Answered" : "Praying"}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
