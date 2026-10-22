"use client";
import { useState } from "react";
import { changeMyPin } from "@/lib/coaches";

/**
 * Change my own PIN. When `required` (the Creator picked it for them) it cannot be closed until it is done.
 */
export default function ChangePin({ required, onDone, onClose }: { required?: boolean; onDone: () => void; onClose: () => void }) {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (newPin.length !== 4) { setError("PIN must be 4 digits."); return; }
    if (newPin !== again) { setError("The new PINs don't match."); return; }
    setError(""); setSaving(true);
    try {
      await changeMyPin(oldPin, newPin);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't change the PIN.");
    }
    setSaving(false);
  }

  const four = (v: string, set: (s: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => set(e.target.value.replace(/\D/g, "").slice(0, 4));

  return (
    <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "var(--card)", borderRadius: 16, padding: 22, width: "100%", maxWidth: 360 }}>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{required ? "Choose your own PIN" : "Change my PIN"}</div>
        <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", marginBottom: 14, lineHeight: 1.5 }}>
          {required ? "Your PIN was set for you. Pick one only you know before you go on." : "Enter your current PIN, then a new one."}
        </p>
        <input className="form-input" type="password" inputMode="numeric" placeholder="Current PIN" value={oldPin} onChange={four(oldPin, setOldPin)} style={{ marginBottom: 8 }} />
        <input className="form-input" type="password" inputMode="numeric" placeholder="New 4-digit PIN" value={newPin} onChange={four(newPin, setNewPin)} style={{ marginBottom: 8 }} />
        <input className="form-input" type="password" inputMode="numeric" placeholder="New PIN again" value={again} onChange={four(again, setAgain)} />
        {error && <div className="error-box" style={{ marginTop: 10 }}>{error}</div>}
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 14, minHeight: 46 }} onClick={save} disabled={saving || oldPin.length !== 4}>
          {saving ? "Saving..." : "Save new PIN"}
        </button>
        {!required && <button className="btn btn-outline" style={{ width: "100%", marginTop: 8 }} onClick={onClose}>Cancel</button>}
      </div>
    </div>
  );
}
