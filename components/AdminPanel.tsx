"use client";
import { useState, useEffect } from "react";
import { Coach, loadCoaches, replaceCoaches, addCoach, removeCoach, ROLES, LOCATIONS } from "@/lib/coaches";
import { CoachSession } from "@/lib/coaches";

interface AdminPanelProps {
  session: CoachSession;
}

export default function AdminPanel({ session }: AdminPanelProps) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [role, setRole] = useState("Head Coach");
  const [locationId, setLocationId] = useState(LOCATIONS[0].id);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    loadCoaches().then(({ ok, coaches: list }) => {
      setCoaches(list);
      setOffline(!ok);
      setLoading(false);
    });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function startAdd() {
    setName(""); setRole("Head Coach"); setLocationId(LOCATIONS[0].id);
    setPin(""); setConfirmPin(""); setError("");
    setView("add");
  }

  function startEdit(coach: Coach) {
    setEditingCoach(coach);
    setName(coach.name); setRole(coach.role); setLocationId(coach.locationId);
    setPin(""); setConfirmPin(""); setError("");
    setView("edit");
  }

  async function handleSaveNew() {
    if (!name.trim()) { setError("Enter a name."); return; }
    if (pin.length !== 4) { setError("PIN must be 4 digits."); return; }
    if (pin !== confirmPin) { setError("PINs don't match."); return; }
    if (coaches.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) {
      setError("A coach with that name already exists."); return;
    }
    setError(""); setSaving(true);
    try {
      const newCoach = await addCoach({ name: name.trim(), pin, role, locationId });
      setCoaches(prev => [...prev, newCoach]);
      setView("list");
      showToast(`${newCoach.name} added!`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add the coach.");
    }
    setSaving(false);
  }

  async function handleSaveEdit() {
    if (!editingCoach) return;
    if (!name.trim()) { setError("Enter a name."); return; }
    if (pin && pin.length !== 4) { setError("PIN must be 4 digits."); return; }
    if (pin && pin !== confirmPin) { setError("PINs don't match."); return; }
    setError(""); setSaving(true);
    // Re-read first: writing our in-memory list back could otherwise drop a
    // coach another device added since this panel loaded.
    const { ok, coaches: fresh } = await loadCoaches();
    if (!ok) {
      setError("Can't reach the server right now. Try again in a moment.");
      setSaving(false);
      return;
    }
    const updated = fresh.map(c =>
      c.id === editingCoach.id
        ? { ...c, name: name.trim(), role, locationId, ...(pin ? { pin } : {}) }
        : c
    );
    try {
      await replaceCoaches(updated);
      setCoaches(updated);
      setView("list");
      showToast("Coach updated!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save changes.");
    }
    setSaving(false);
  }

  async function handleDelete(coach: Coach) {
    if (coach.id === session.coachId) { showToast("You can't delete yourself."); return; }
    if (!confirm(`Remove ${coach.name}? They won't be able to log in.`)) return;
    try {
      await removeCoach(coach.id);
      setCoaches(prev => prev.filter(c => c.id !== coach.id));
      showToast(`${coach.name} removed.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Couldn't remove the coach.");
    }
  }

  if (loading) return (
    <div style={{ textAlign: "center", padding: 40, color: "var(--text2)", fontFamily: "Arial, sans-serif" }}>Loading coaches...</div>
  );

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Admin Panel</h3>
        <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.6 }}>
          Manage coaches for all Triple F locations. Only Head Coaches can see this.
        </p>
      </div>

      {offline && (
        <div style={{ background: "#fdf6e7", border: "1px solid #f0dcb0", borderRadius: 10, padding: "11px 14px", marginBottom: 16, fontSize: 13, color: "#92652a", fontFamily: "Arial, sans-serif", lineHeight: 1.55 }}>
          <b>Offline.</b> This is your saved coach list. Adding or changing coaches
          needs a connection so nobody gets overwritten.
        </div>
      )}

      {/* ── Coach list ── */}
      {view === "list" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text2)" }}>
              {coaches.length} Coach{coaches.length !== 1 ? "es" : ""} Registered
            </div>
            <button onClick={startAdd} disabled={offline} style={{ padding: "11px 16px", minHeight: 44, background: offline ? "var(--border)" : "var(--primary)", color: offline ? "var(--text2)" : "white", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: offline ? "not-allowed" : "pointer" }}>
              ＋ Add Coach
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {coaches.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text2)", fontFamily: "Arial, sans-serif", fontSize: 14 }}>
                No coaches yet. Add the first one.
              </div>
            ) : coaches.map(coach => {
              const loc = LOCATIONS.find(l => l.id === coach.locationId);
              const isMe = coach.id === session.coachId;
              return (
                <div key={coach.id} style={{ background: "var(--card)", border: `1.5px solid ${isMe ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                  {/* Avatar */}
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: isMe ? "var(--accent)" : "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white", flexShrink: 0 }}>
                    {coach.name.split(" ").map((w:string) => w[0]).join("").toUpperCase().slice(0,2)}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{coach.name}</span>
                      {isMe && <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(26,138,181,0.12)", color: "var(--accent)", padding: "2px 8px", borderRadius: 20 }}>You</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: "Arial, sans-serif", marginTop: 2 }}>
                      {coach.role}
                      {loc && <> · <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: loc.color, display: "inline-block" }} />{loc.name.replace("Triple F ", "")}</span></>}
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => startEdit(coach)} style={{ padding: "6px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "var(--text2)", cursor: "pointer" }}>
                      ✎ Edit
                    </button>
                    {!isMe && (
                      <button onClick={() => handleDelete(coach)} style={{ padding: "6px 10px", background: "none", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, fontSize: 12, color: "#dc2626", cursor: "pointer" }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Location summary */}
          <div style={{ marginTop: 24, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "var(--text2)", marginBottom: 12 }}>By Location</div>
            {LOCATIONS.map(loc => {
              const count = coaches.filter(c => c.locationId === loc.id).length;
              return (
                <div key={loc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: loc.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{loc.name}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: count > 0 ? "var(--accent)" : "var(--text2)" }}>
                    {count} coach{count !== 1 ? "es" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Add / Edit form ── */}
      {(view === "add" || view === "edit") && (
        <div>
          <button onClick={() => { setView("list"); setError(""); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--accent)", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 20, padding: 0 }}>
            ← Back to Coaches
          </button>

          <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "20px 18px" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 18, color: "var(--text)" }}>
              {view === "add" ? "Add New Coach" : `Edit ${editingCoach?.name}`}
            </div>

            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Coach name" autoFocus />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
              <div>
                <label className="form-label">Role</label>
                <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Location</label>
                <select className="form-select" value={locationId} onChange={e => setLocationId(e.target.value)}>
                  {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name.replace("Triple F ", "")}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 6 }}>
              <div>
                <label className="form-label">{view === "edit" ? "New PIN (leave blank to keep)" : "4-Digit PIN"}</label>
                <input className="form-input" type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="••••" />
              </div>
              <div>
                <label className="form-label">Confirm PIN</label>
                <input className="form-input" type="password" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="••••" />
              </div>
            </div>

            {error && <div className="error-box" style={{ marginBottom: 14 }}>{error}</div>}

            <button
              className="gen-btn"
              disabled={saving}
              onClick={view === "add" ? handleSaveNew : handleSaveEdit}
            >
              {saving ? "Saving..." : view === "add" ? "Add Coach" : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--primary)", color: "white", padding: "12px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 9999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}
