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
      onClick={() => onOpen(study.id)}
    >
      {study.draft && <div className="card-draft-badge">Draft</div>}
      <button
        className="card-like"
        onClick={(e) => { e.stopPropagation(); onToggleLike(study.id); }}
        title={liked ? "Unlike" : "Like"}
      >
        {liked ? "❤️" : "🤍"}
      </button>
      <div className="card-date">{study.date}</div>
      {study.series && <div className="card-series">📖 {study.series}</div>}
      <div className="card-title">{study.title}</div>
      {study.anchor?.ref && (
        <div className="card-verse">
          {study.anchor.ref} — {study.anchor.text.substring(0, 65)}...
        </div>
      )}
      {attend ? <div className="card-attend">👥 {attend} students</div> : null}
    </div>
  );
}
