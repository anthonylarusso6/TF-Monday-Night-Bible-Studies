"use client";
import { Study, UserData } from "@/lib/types";

interface StatsBarProps {
  studies: Study[];
  userData: UserData;
}

export default function StatsBar({ studies, userData }: StatsBarProps) {
  const published = studies.filter((s) => !s.draft).length;
  const draftCount = userData.drafts.length;

  const attendValues = Object.values(userData.attendance).filter(Boolean);
  const avgAttend =
    attendValues.length > 0
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
        <div className="stat-n">2025–2026</div>
        <div className="stat-l">Season</div>
      </div>
      <div className="stat">
        <div className="stat-n">{avgAttend ?? "—"}</div>
        <div className="stat-l">Avg Attend</div>
      </div>
      <div className="stat">
        <div className="stat-n">{likedCount}</div>
        <div className="stat-l">Liked</div>
      </div>
    </div>
  );
}
