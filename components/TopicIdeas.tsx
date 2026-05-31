"use client";
import { TOPICS } from "@/lib/topics";

interface TopicIdeasProps {
  onCreateDraft: (topic: string) => void;
}

export default function TopicIdeas({ onCreateDraft }: TopicIdeasProps) {
  return (
    <div>
      <p style={{ fontFamily: "Arial, sans-serif", fontSize: 14, color: "var(--text2)", marginBottom: 16 }}>
        Click any topic to create a draft study.
      </p>
      <div className="topic-grid">
        {TOPICS.map((topic, i) => (
          <div
            key={i}
            className="topic-card"
            onClick={() => onCreateDraft(topic)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onCreateDraft(topic)}
          >
            <div className="topic-num">{i + 1}</div>
            <div className="topic-name">{topic}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
