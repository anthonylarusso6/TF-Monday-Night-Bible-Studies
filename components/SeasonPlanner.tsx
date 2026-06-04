"use client";
import { useState } from "react";
import { Study, UserData } from "@/lib/types";
import { TOPIC_CATEGORIES } from "@/lib/topics";

interface PlannedSession {
  date: string;
  studyId?: string | number;
  topic?: string;
  speaker?: string;
  notes?: string;
}

interface SeasonPlannerProps {
  allStudies: Study[];
  userData: UserData;
  onSave: (plan: PlannedSession[]) => void;
}

function loadPlan(userData: UserData): PlannedSession[] {
  try {
    const raw = (userData.notes as Record<string, string>)._plan;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function getNextMondays(count: number): Date[] {
  const mondays: Date[] = [];
  const today = new Date();
  const d = new Date(today);
  const day = d.getDay();
  const diff = day === 1 ? 0 : day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    mondays.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return mondays;
}

const ALL_TOPICS = TOPIC_CATEGORIES.flatMap(c => c.topics);

export default function SeasonPlanner({ allStudies, userData, onSave }: SeasonPlannerProps) {
  const [plan, setPlan] = useState<PlannedSession[]>(loadPlan(userData));
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState("");
  const [editStudyId, setEditStudyId] = useState<string>("");
  const [editSpeaker, setEditSpeaker] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const mondays = getNextMondays(12);
  const publishedStudies = allStudies.filter(s => !s.draft);

  function getPlanned(date: string) {
    return plan.find(p => p.date === date);
  }

  function startEdit(date: string) {
    const existing = getPlanned(date);
    setEditingDate(date);
    setEditTopic(existing?.topic || "");
    setEditStudyId(existing?.studyId ? String(existing.studyId) : "");
    setEditSpeaker(existing?.speaker || "");
    setEditNotes(existing?.notes || "");
  }

  function saveEdit() {
    if (!editingDate) return;
    const updated = plan.filter(p => p.date !== editingDate);
    if (editTopic || editStudyId || editSpeaker || editNotes) {
      updated.push({
        date: editingDate,
        ...(editStudyId ? { studyId: editStudyId } : {}),
        ...(editTopic ? { topic: editTopic } : {}),
        ...(editSpeaker ? { speaker: editSpeaker } : {}),
        ...(editNotes ? { notes: editNotes } : {}),
      });
    }
    setPlan(updated);
    onSave(updated);
    setEditingDate(null);
  }

  function clearDate(date: string) {
    const updated = plan.filter(p => p.date !== date);
    setPlan(updated);
    onSave(updated);
  }

  const plannedCount = mondays.filter(m => getPlanned(m.toISOString().split("T")[0])).length;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Season Planner</h3>
        <p style={{ fontSize: 13, color: "var(--text2)", fontFamily: "Arial, sans-serif", lineHeight: 1.6, marginBottom: 4 }}>
          Plan your next 12 Monday nights. Tap any date to assign a study or topic.
        </p>
        <div style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700 }}>{plannedCount} of 12 Mondays planned</div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, background: "var(--border)", borderRadius: 3, overflow: "hidden", marginBottom: 20 }}>
        <div style={{ height: "100%", background: "var(--accent)", borderRadius: 3, width: `${(plannedCount / 12) * 100}%`, transition: "width 0.3s" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {mondays.map((monday) => {
          const dateStr = monday.toISOString().split("T")[0];
          const planned = getPlanned(dateStr);
          const linkedStudy = planned?.studyId ? publishedStudies.find(s => String(s.id) === String(planned.studyId)) : null;
          const isEditing = editingDate === dateStr;
          const isPast = monday < new Date();

          return (
            <div key={dateStr} style={{ background: "var(--card)", border: `1.5px solid ${planned ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius)", overflow: "hidden", opacity: isPast ? 0.6 : 1 }}>
              <button
                onClick={() => isEditing ? saveEdit() : startEdit(dateStr)}
                style={{ width: "100%", padding: "13px 16px", background: planned ? "rgba(26,138,181,0.05)" : "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left", WebkitTapHighlightColor: "transparent" }}
              >
                {/* Date */}
                <div style={{ flexShrink: 0, textAlign: "center", minWidth: 44 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: planned ? "var(--accent)" : "var(--text)", lineHeight: 1 }}>
                    {monday.toLocaleDateString("en-US", { day: "numeric" })}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {monday.toLocaleDateString("en-US", { month: "short" })}
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {planned ? (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>
                        {linkedStudy ? linkedStudy.title : planned.topic || "Planned"}
                      </div>
                      <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                        {planned.speaker && <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, fontFamily: "Arial, sans-serif" }}>🎤 {planned.speaker}</span>}
                        {planned.notes && <span style={{ fontSize: 11, color: "var(--text2)", fontFamily: "Arial, sans-serif" }}>{planned.notes}</span>}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: "var(--text2)", fontStyle: "italic" }}>Tap to plan this Monday</div>
                  )}
                </div>

                {planned ? (
                  <span style={{ fontSize: 14, color: "var(--accent)" }}>✎</span>
                ) : (
                  <span style={{ fontSize: 18, color: "var(--text2)" }}>＋</span>
                )}
              </button>

              {/* Edit panel */}
              {isEditing && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "14px 16px", background: "var(--bg)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text2)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                    {monday.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div className="form-label">Link an existing study</div>
                    <select className="form-select" value={editStudyId} onChange={e => { setEditStudyId(e.target.value); if (e.target.value) setEditTopic(""); }}>
                      <option value="">— None —</option>
                      {publishedStudies.map(s => (
                        <option key={s.id} value={String(s.id)}>{s.title}</option>
                      ))}
                    </select>
                  </div>

                  {!editStudyId && (
                    <div style={{ marginBottom: 10 }}>
                      <div className="form-label">Or type a topic</div>
                      <input className="form-input" value={editTopic} onChange={e => setEditTopic(e.target.value)} placeholder="e.g. Handling Temptation" list="topic-suggestions" />
                      <datalist id="topic-suggestions">
                        {ALL_TOPICS.map(t => <option key={t} value={t} />)}
                      </datalist>
                    </div>
                  )}

                  <div style={{ marginBottom: 10 }}>
                    <div className="form-label">Who&apos;s Speaking</div>
                    <input className="form-input" value={editSpeaker} onChange={e => setEditSpeaker(e.target.value)} placeholder="e.g. Anthony, Coach Lee..." />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div className="form-label">Notes (optional)</div>
                    <input className="form-input" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="e.g. Bring food, check with gym" />
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="save-btn" onClick={saveEdit}>Save</button>
                    {planned && <button onClick={() => { clearDate(dateStr); setEditingDate(null); }} style={{ padding: "8px 14px", background: "none", border: "1px solid #dc2626", color: "#dc2626", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Remove</button>}
                    <button onClick={() => setEditingDate(null)} style={{ padding: "8px 14px", background: "none", border: "1px solid var(--border)", color: "var(--text2)", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
