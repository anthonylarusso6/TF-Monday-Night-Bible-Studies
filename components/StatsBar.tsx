"use client";
import { Study, UserData } from "@/lib/types";

interface StatsBarProps {
  studies: Study[];
  userData: UserData;
  goal: number;
  editingGoal: boolean;
  goalInput: string;
  onGoalClick: () => void;
  onGoalChange: (v: string) => void;
  onGoalSave: () => void;
}

export default function StatsBar({ studies, userData, goal, editingGoal, goalInput, onGoalClick, onGoalChange, onGoalSave }: StatsBarProps) {
  const published = studies.filter((s) => !s.draft).length;
  const draftCount = userData.drafts.length;
  const attendValues = Object.values(userData.attendance).filter(Boolean) as number[];
  const avgAttend = attendValues.length > 0
    ? Math.round(attendValues.reduce((a, b) => a + b, 0) / attendValues.length)
    : null;
  const likedCount = Object.values(userData.liked).filter(Boolean).length;

  return (
    <div className="stats-bar">
      <div className="stat">
        <div className="stat-n">{published}</div>
        <div className="stat-l">Studies</div>
      </div>
      <div className="stat">
        <div className="stat-n">{draftCount}</div>
        <div className="stat-l">Drafts</div>
      </div>
      <div className="stat">
        <div className="stat-n">2025–26</div>
        <div className="stat-l">Season</div>
      </div>
      <div className="stat">
        <div className="stat-n" style={{ color: avgAttend != null && avgAttend >= goal ? "#7fd6a0" : undefined }}>
          {avgAttend ?? "—"}
        </div>
        <div className="stat-l">Avg Attend</div>
      </div>
      <div className="stat" style={{ cursor: "pointer" }} onClick={onGoalClick} title="Click to edit goal">
        {editingGoal ? (
          <form onSubmit={(e) => { e.preventDefault(); onGoalSave(); }} style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              autoFocus
              type="number"
              value={goalInput}
              onChange={(e) => onGoalChange(e.target.value)}
              onBlur={onGoalSave}
              style={{ width: 48, padding: "2px 4px", fontSize: 14, fontWeight: 700, textAlign: "center", borderRadius: 4, border: "none", background: "rgba(255,255,255,0.2)", color: "white" }}
            />
          </form>
        ) : (
          <>
            <div className="stat-n">{goal} <span style={{ fontSize: 12, opacity: 0.6 }}>✎</span></div>
            <div className="stat-l">Student Goal</div>
          </>
        )}
      </div>
      <div className="stat">
        <div className="stat-n">{likedCount}</div>
        <div className="stat-l">Liked</div>
      </div>
    </div>
  );
}
