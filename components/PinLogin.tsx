"use client";
import { useState, useEffect } from "react";
import {
  Coach, CoachSession, loadCoaches, addCoach, verifyPin,
  setSession, ROLES, LOCATIONS,
} from "@/lib/coaches";

interface PinLoginProps {
  onLogin: (session: CoachSession) => void;
}

type View = "name" | "pin" | "setup" | "addCoach" | "offline";

export default function PinLogin({ onLogin }: PinLoginProps) {
  const [view, setView] = useState<View>("name");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameInput, setNameInput] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [offline, setOffline] = useState(false);

  // Add coach form
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Head Coach");
  const [newLocation, setNewLocation] = useState(LOCATIONS[0].id);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCoaches = () => {
    setLoading(true);
    loadCoaches().then(({ ok, coaches: list }) => {
      setCoaches(list);
      setOffline(!ok);
      // Only offer first-time setup when the server actually confirmed the
      // registry is empty. A failed read used to land here and invite a coach to
      // "set up the first account", which would have wiped everyone else.
      if (list.length > 0) setView("name");
      else setView(ok ? "setup" : "offline");
      setLoading(false);
    });
  };

  useEffect(() => { fetchCoaches(); }, []);

  // Auto-verify when 4 digits entered
  useEffect(() => {
    if (pin.length === 4 && view === "pin") verifyLogin();
  }, [pin]);

  async function verifyLogin() {
    setVerifying(true);
    setError("");
    const coach = await verifyPin(nameInput, pin);
    if (coach) {
      const session: CoachSession = {
        coachId: coach.id,
        name: coach.name,
        role: coach.role,
        locationId: coach.locationId,
      };
      setSession(session);
      onLogin(session);
    } else {
      setPin("");
      setError("Wrong PIN. Try again.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    setVerifying(false);
  }

  async function handleAddCoach() {
    if (!newName.trim()) { setError("Enter a name."); return; }
    if (newPin.length !== 4) { setError("PIN must be 4 digits."); return; }
    if (newPin !== confirmPin) { setError("PINs don't match."); return; }
    if (coaches.some(c => c.name.toLowerCase() === newName.trim().toLowerCase())) {
      setError("A coach with that name already exists."); return;
    }
    setError(""); setSaving(true);
    try {
      const coach = await addCoach({ name: newName.trim(), pin: newPin, role: newRole, locationId: newLocation });
      setCoaches([...coaches, coach]);
      // Auto login as the new coach
      const session: CoachSession = { coachId: coach.id, name: coach.name, role: coach.role, locationId: coach.locationId };
      setSession(session);
      onLogin(session);
    } catch (e) {
      // Typed input is preserved so nothing has to be re-entered.
      setError(e instanceof Error ? e.message : "Couldn't create the account. Try again.");
      setSaving(false);
    }
  }

  function tapPin(digit: string) {
    if (pin.length < 4) setPin(p => p + digit);
  }
  function deletePin() { setPin(p => p.slice(0, -1)); setError(""); }

  const filteredCoaches = nameInput
    ? coaches.filter(c => c.name.toLowerCase().includes(nameInput.toLowerCase()))
    : coaches;

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontFamily: "Arial, sans-serif", fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/logo.svg" alt="Triple F" style={{ width: 84, height: 84, margin: "0 auto 10px", display: "block" }} />
          <div style={{ color: "white", fontSize: 20, fontWeight: 900, letterSpacing: 3, fontFamily: "Arial, sans-serif" }}>TRIPLE F</div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontFamily: "Arial, sans-serif" }}>Monday Night Bible Study&apos;s</div>
        </div>

        <div style={{ background: "white", borderRadius: 20, padding: 28 }}>

          {/* ── Can't reach the server ── */}
          {view === "offline" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📡</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, color: "#0f2530" }}>No connection</div>
              <p style={{ fontSize: 13.5, color: "#567888", marginBottom: 20, fontFamily: "Arial, sans-serif", lineHeight: 1.6 }}>
                Your coaches are saved — this device just can&apos;t reach them right now.
                Check your signal and try again.
              </p>
              <button onClick={fetchCoaches} style={btnStyle}>Try Again</button>
            </div>
          )}

          {/* ── First time setup ── */}
          {(view === "setup" || view === "addCoach") && (
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, color: "#0f2530" }}>
                {view === "setup" ? "Set Up First Coach" : "Add a Coach"}
              </div>
              <p style={{ fontSize: 13, color: "#567888", marginBottom: 20, fontFamily: "Arial, sans-serif", lineHeight: 1.5 }}>
                {view === "setup" ? "No coaches are registered yet. Set up the first account." : "Create a new coach account."}
              </p>
              <input placeholder="Coach name" value={newName} onChange={e => setNewName(e.target.value)} style={inputStyle} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} style={selectStyle}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
                <select value={newLocation} onChange={e => setNewLocation(e.target.value)} style={selectStyle}>
                  {LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name.replace("Triple F ", "")}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
                <input placeholder="4-digit PIN" maxLength={4} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, "").slice(0,4))} type="password" style={inputStyle} />
                <input placeholder="Confirm PIN" maxLength={4} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0,4))} type="password" style={inputStyle} />
              </div>
              {error && <div style={errorStyle}>{error}</div>}
              <button onClick={handleAddCoach} disabled={saving} style={btnStyle}>
                {saving ? "Saving..." : view === "setup" ? "Create Account" : "Add Coach"}
              </button>
              {view === "addCoach" && (
                <button onClick={() => { setView("name"); setError(""); }} style={{ ...ghostBtnStyle, marginTop: 8 }}>Cancel</button>
              )}
            </div>
          )}

          {/* ── Name selection ── */}
          {view === "name" && (
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, color: "#0f2530" }}>Coach Login</div>
              <p style={{ fontSize: 13, color: "#567888", marginBottom: 18, fontFamily: "Arial, sans-serif" }}>Who&apos;s leading tonight?</p>
              <input
                placeholder="Your name..."
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
                autoFocus
              />
              {/* Coach list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16, maxHeight: 220, overflowY: "auto" }}>
                {filteredCoaches.map(coach => (
                  <button key={coach.id} onClick={() => { setNameInput(coach.name); setView("pin"); setPin(""); setError(""); }}
                    style={{ padding: "12px 14px", background: "#f0f7fb", border: "1.5px solid #d4e8f2", borderRadius: 10, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0f4f6a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "white", flexShrink: 0 }}>
                      {coach.name.split(" ").map((w:string) => w[0]).join("").toUpperCase().slice(0,2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f2530" }}>{coach.name}</div>
                      <div style={{ fontSize: 11, color: "#567888", fontFamily: "Arial, sans-serif" }}>{coach.role} · {LOCATIONS.find(l => l.id === coach.locationId)?.name.replace("Triple F ", "")}</div>
                    </div>
                  </button>
                ))}
                {filteredCoaches.length === 0 && nameInput && (
                  <div style={{ textAlign: "center", padding: "16px", color: "#567888", fontSize: 13, fontFamily: "Arial, sans-serif" }}>No coach found with that name.</div>
                )}
              </div>
              {offline ? (
                <div style={{ fontSize: 12, color: "#92652a", background: "#fdf6e7", border: "1px solid #f0dcb0", borderRadius: 8, padding: "9px 12px", fontFamily: "Arial, sans-serif", lineHeight: 1.5 }}>
                  Offline — showing your saved coaches. You can still sign in.
                </div>
              ) : (
                <button onClick={() => setView("addCoach")} style={ghostBtnStyle}>＋ Add New Coach</button>
              )}
            </div>
          )}

          {/* ── PIN entry ── */}
          {view === "pin" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 6 }}>
                <button onClick={() => { setView("name"); setPin(""); setError(""); }} style={{ background: "none", border: "none", color: "#567888", fontSize: 20, cursor: "pointer", padding: 4 }}>‹</button>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#0f4f6a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white" }}>
                  {nameInput.split(" ").map((w:string) => w[0]).join("").toUpperCase().slice(0,2)}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f2530" }}>{nameInput}</div>
                  <div style={{ fontSize: 11, color: "#567888", fontFamily: "Arial, sans-serif" }}>Enter your PIN</div>
                </div>
              </div>

              {/* PIN dots */}
              <div style={{ display: "flex", gap: 14, justifyContent: "center", margin: "20px 0", ...(shake ? { animation: "shake 0.4s ease" } : {}) }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: i < pin.length ? "#0f4f6a" : "#d4e8f2", transition: "background 0.15s" }} />
                ))}
              </div>

              {error && <div style={{ ...errorStyle, marginBottom: 14 }}>{error}</div>}
              {verifying && <div style={{ color: "#567888", fontSize: 13, fontFamily: "Arial, sans-serif", marginBottom: 14 }}>Checking...</div>}

              {/* Number pad */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, maxWidth: 260, margin: "0 auto" }}>
                {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d, i) => (
                  <button key={i} onClick={() => d === "⌫" ? deletePin() : d ? tapPin(d) : undefined}
                    disabled={!d || verifying}
                    style={{ height: 60, background: d === "⌫" ? "#f0f7fb" : "#0f4f6a", color: d === "⌫" ? "#567888" : "white", border: "none", borderRadius: 12, fontSize: d === "⌫" ? 20 : 22, fontWeight: 700, cursor: d ? "pointer" : "default", opacity: !d ? 0 : 1, transition: "transform 0.08s, background 0.08s" }}>
                    {d}
                  </button>
                ))}
              </div>

              <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }`}</style>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "#0a3a52", zIndex: 9999,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", border: "1.5px solid #d4e8f2",
  borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box",
  fontFamily: "inherit", marginBottom: 10,
};
const selectStyle: React.CSSProperties = {
  width: "100%", padding: "11px 10px", border: "1.5px solid #d4e8f2",
  borderRadius: 10, fontSize: 13, outline: "none", background: "white",
  fontFamily: "inherit",
};
const btnStyle: React.CSSProperties = {
  width: "100%", padding: 13, background: "#0f4f6a", color: "white",
  border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer",
};
const ghostBtnStyle: React.CSSProperties = {
  width: "100%", padding: 11, background: "none", color: "#567888",
  border: "1.5px solid #d4e8f2", borderRadius: 10, fontSize: 14,
  fontWeight: 600, cursor: "pointer",
};
const errorStyle: React.CSSProperties = {
  background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8,
  padding: "9px 12px", fontSize: 13, color: "#991b1b",
  fontFamily: "Arial, sans-serif", marginBottom: 12,
};
