"use client";
import { useEffect, useState, useCallback } from "react";
import { STUDIES } from "@/lib/studies";
import { loadUserData, saveUserData } from "@/lib/supabase";
import { Study, UserData } from "@/lib/types";
import StatsBar from "@/components/StatsBar";
import StudyGrid from "@/components/StudyGrid";
import StudyModal from "@/components/StudyModal";
import TopicIdeas from "@/components/TopicIdeas";
import CreateStudy from "@/components/CreateStudy";
import Toast from "@/components/Toast";

type Tab = "all" | "liked" | "drafts" | "series" | "topics" | "create";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All Studies" },
  { id: "liked", label: "❤️ Liked" },
  { id: "drafts", label: "📝 Drafts" },
  { id: "series", label: "📚 Series" },
  { id: "topics", label: "💡 Topic Ideas" },
  { id: "create", label: "✏️ Create Study" },
];

const GRID_TABS = new Set<Tab>(["all", "liked", "drafts", "series"]);

export default function Home() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [userData, setUserData] = useState<UserData>({ liked: {}, notes: {}, attendance: {}, drafts: [] });
  const [generatedStudies, setGeneratedStudies] = useState<Study[]>([]);
  const [openStudyId, setOpenStudyId] = useState<string | number | null>(null);
  const [dark, setDark] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load user data from Supabase on mount
  useEffect(() => {
    loadUserData().then((data) => { setUserData(data); setLoaded(true); });
  }, []);

  // Dark mode sync
  useEffect(() => {
    document.body.classList.toggle("dark", dark);
  }, [dark]);

  const persist = useCallback(async (next: UserData) => {
    setUserData(next);
    await saveUserData(next);
  }, []);

  // All studies: hardcoded + generated, newest first
  const allStudies: Study[] = [
    ...generatedStudies,
    ...STUDIES,
    ...userData.drafts,
  ];

  const openStudy = openStudyId != null
    ? allStudies.find((s) => String(s.id) === String(openStudyId)) ?? null
    : null;

  async function toggleLike(id: string | number) {
    const sid = String(id);
    const next: UserData = { ...userData, liked: { ...userData.liked, [sid]: !userData.liked[sid] } };
    await persist(next);
  }

  async function handleSaveNotes(id: string | number, notes: string) {
    const sid = String(id);
    const next: UserData = { ...userData, notes: { ...userData.notes, [sid]: notes } };
    await persist(next);
  }

  async function handleSaveAttend(id: string | number, count: number) {
    const sid = String(id);
    const next: UserData = { ...userData, attendance: { ...userData.attendance, [sid]: count } };
    await persist(next);
  }

  async function handleCreateDraft(topic: string) {
    const draft: Study = {
      id: `draft_${Date.now()}`,
      date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      title: topic,
      series: "",
      draft: true,
      anchor: { ref: "", text: "" },
      sup: [],
      bi: "Draft — build this study out.",
      bd: [],
      sbd: [],
      qs: [],
      tk: [],
    };
    const next: UserData = { ...userData, drafts: [draft, ...userData.drafts] };
    await persist(next);
    setTab("drafts");
    showToast(`Draft created: ${topic}`);
  }

  async function handleDeleteDraft(id: string | number) {
    const next: UserData = {
      ...userData,
      drafts: userData.drafts.filter((d) => String(d.id) !== String(id)),
    };
    await persist(next);
    showToast("Draft deleted.");
  }

  function handleStudyCreated(study: Study) {
    setGeneratedStudies((prev) => [study, ...prev]);
    setTab("all");
  }

  function showToast(msg: string) {
    setToast(msg);
  }

  const showGrid = GRID_TABS.has(tab);
  const showSearch = showGrid;

  return (
    <>
      {/* Header */}
      <header className="header">
        <button
          className="dark-btn"
          onClick={() => setDark((d) => !d)}
          title="Toggle dark mode"
        >
          {dark ? "☀️" : "🌙"}
        </button>
        <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: 2, fontFamily: "Arial, sans-serif" }}>
          TRIPLE F
        </div>
        <h1>Monday Night Bible Study's</h1>
        <p>Triple F Sports · Knoxville, TN · 2025–2026</p>
      </header>

      {/* Stats bar */}
      {loaded && <StatsBar studies={allStudies} userData={userData} />}

      {/* Tab nav */}
      <nav className="tab-nav" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? " active" : ""}`}
            onClick={() => { setTab(t.id); setSearch(""); }}
            role="tab"
            aria-selected={tab === t.id}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="content">
        {showSearch && (
          <div className="search-wrap" style={{ margin: "0 0 4px" }}>
            <input
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search studies, verses, topics..."
            />
          </div>
        )}

        {showGrid && (
          <StudyGrid
            studies={allStudies}
            userData={userData}
            tab={tab as "all" | "liked" | "drafts" | "series"}
            search={search}
            onOpen={setOpenStudyId}
            onToggleLike={toggleLike}
          />
        )}

        {tab === "topics" && (
          <TopicIdeas onCreateDraft={handleCreateDraft} />
        )}

        {tab === "create" && (
          <CreateStudy onStudyCreated={handleStudyCreated} onToast={showToast} />
        )}
      </main>

      {/* Study modal */}
      {openStudy && (
        <StudyModal
          study={openStudy}
          userData={userData}
          onClose={() => setOpenStudyId(null)}
          onSaveNotes={handleSaveNotes}
          onSaveAttend={handleSaveAttend}
          onDeleteDraft={handleDeleteDraft}
          onToast={showToast}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast} onDone={() => setToast(null)} />
      )}
    </>
  );
}
