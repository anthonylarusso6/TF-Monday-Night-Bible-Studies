"use client";
import { LOCATIONS } from "@/lib/locations";

/**
 * Which location(s) a coach works at: tap one, or both. At least one stays selected.
 * `light` is for the white login card, the default is for the in-app panels.
 */
export default function LocationPicker({ value, onChange, disabled, light }: {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  light?: boolean;
}) {
  const toggle = (id: string) => {
    if (disabled) return;
    const on = value.includes(id);
    if (on && value.length === 1) return; // never zero
    onChange(on ? value.filter((x) => x !== id) : [...LOCATIONS.map((l) => l.id).filter((x) => x === id || value.includes(x))]);
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {LOCATIONS.map((l) => {
        const on = value.includes(l.id);
        return (
          <button
            key={l.id}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(l.id)}
            style={{
              flex: "1 1 130px", minHeight: 46, padding: "10px 12px", borderRadius: 10, cursor: disabled ? "default" : "pointer",
              border: `1.5px solid ${on ? l.color : light ? "#d4e8f2" : "var(--border)"}`,
              background: on ? l.color : light ? "white" : "var(--card)",
              color: on ? "white" : light ? "#567888" : "var(--text2)",
              fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              opacity: disabled ? 0.7 : 1,
            }}
          >
            {on ? "✓ " : ""}{l.name.replace("Triple F ", "")}
          </button>
        );
      })}
    </div>
  );
}
