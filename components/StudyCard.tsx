"use client";
import { Study, UserData } from "@/lib/types";

interface StudyCardProps {
  study: Study;
  userData: UserData;
  onOpen: (id: string | number) => void;
  onToggleLike: (id: string | number) => void;
}

export default function StudyCard({ study, userData, onOpen, onToggleLike }: StudyCardProps) {
  const liked = !!userData.liked[String(study.id)];
  const attend = userData.attendance[String(study.id)];

  return (
    <div
      className={`card${study.draft ? " draft" : ""}`}
      data-series={study.series || undefined}
      onClick={() => onOpen(study.id)}
    >
      <button
        className="card-like"
        onClick={(e) => { e.stopPropagation(); onToggleLike(study.id); }}
        title={liked ? "Unlike" : "Like"}
      >
        {liked ? "❤️" : "🤍"}
      </button>

      <div className="card-top">
        <span className="card-date">{study.date}</span>
        {study.draft && <span className="card-draft-badge">Draft</span>}
        {!study.draft && study.series && (
          <span className="card-series-badge">{study.series}</span>
        )}
      </div>

      <div className="card-title">{study.title}</div>

      {study.anchor?.ref && (
        <div className="card-verse">
          {study.anchor.ref} — {study.anchor.text.substring(0, 70)}...
        </div>
      )}

      {attend ? <div className="card-attend">👥 {attend} students</div> : null}
    </div>
  );
}
