"use client";
import { Study, UserData } from "@/lib/types";
import StudyCard from "./StudyCard";

type Tab = "all" | "liked" | "drafts" | "series";

interface StudyGridProps {
  studies: Study[];
  userData: UserData;
  tab: Tab;
  search: string;
  onOpen: (id: string | number) => void;
  onToggleLike: (id: string | number) => void;
}

export default function StudyGrid({
  studies,
  userData,
  tab,
  search,
  onOpen,
  onToggleLike,
}: StudyGridProps) {
  const q = search.toLowerCase();

  const matchesSearch = (s: Study) => {
    if (!q) return true;
    return (
      s.title.toLowerCase().includes(q) ||
      s.date.toLowerCase().includes(q) ||
      s.bi.toLowerCase().includes(q) ||
      (s.series || "").toLowerCase().includes(q) ||
      s.anchor.ref.toLowerCase().includes(q) ||
      s.anchor.text.toLowerCase().includes(q) ||
      s.sup.some((v) => v.ref.toLowerCase().includes(q))
    );
  };

  // Series tab — group by series (published only, no search grouping)
  if (tab === "series" && !q) {
    const groups: Record<string, Study[]> = {};
    for (const s of studies) {
      if (s.draft) continue;
      const key = s.series || "Uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return (
      <div className="grid">
        {Object.entries(groups).map(([series, group]) => (
          <div key={series} style={{ display: "contents" }}>
            <div className="series-hdr">{series} ({group.length})</div>
            {group.map((s) => (
              <StudyCard
                key={s.id}
                study={s}
                userData={userData}
                onOpen={onOpen}
                onToggleLike={onToggleLike}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const filtered = studies.filter((s) => {
    if (tab === "liked" && !userData.liked[String(s.id)]) return false;
    if (tab === "drafts" && !s.draft) return false;
    if (tab === "all" && s.draft) return false;
    if (tab === "series" && s.draft) return false;
    return matchesSearch(s);
  });

  if (!filtered.length) {
    const msgs: Record<Tab, string> = {
      liked: "No liked studies yet. Heart a study to save it here.",
      drafts: "No drafts yet. Click a topic idea to create one.",
      all: "No studies found.",
      series: "No studies found.",
    };
    return (
      <div className="grid">
        <div className="empty-msg">{msgs[tab]}</div>
      </div>
    );
  }

  return (
    <div className="grid">
      {filtered.map((s) => (
        <StudyCard
          key={s.id}
          study={s}
          userData={userData}
          onOpen={onOpen}
          onToggleLike={onToggleLike}
        />
      ))}
    </div>
  );
}
