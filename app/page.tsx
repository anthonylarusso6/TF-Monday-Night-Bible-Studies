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
import AttendanceChart from "@/components/AttendanceChart";
import Toast from "@/components/Toast";

type Tab = "all" | "liked" | "drafts" | "series" | "topics" | "create" | "chart";

const ROW1: { id: Tab; label: string }[] = [
  { id: "all", label: "📖 All" },
  { id: "liked", label: "❤️ Liked" },
  { id: "drafts", label: "📝 Drafts" },
  { id: "series", label: "📚 Series" },
];
const ROW2: { id: Tab; label: string }[] = [
  { id: "topics", label: "💡 Topics" },
  { id: "create", label: "✏️ Create" },
  { id: "chart", label: "📊 Attendance" },
];

const GRID_TABS = new Set<Tab>(["all", "liked", "drafts", "series"]);

export default function Home() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [userData, setUserData] = useState<UserData>({ liked: {}, notes: {}, attendance: {}, drafts: [] });
  const [generatedStudies, setGeneratedStudies] = useState<Study[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [openStudyId, setOpenStudyId] = useState<string | number | null>(null);
  const [dark, setDark] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [attendanceGoal, setAttendanceGoal] = useState(20);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("20");

  useEffect(() => {
    const savedDark = localStorage.getItem("tf_dark") === "true";
    const savedGoal = parseInt(localStorage.getItem("tf_goal") || "20");
    const savedGenerated: Study[] = JSON.parse(localStorage.getItem("tf_generated") || "[]");
    const savedHidden: string[] = JSON.parse(localStorage.getItem("tf_hidden") || "[]");

    setDark(savedDark);
    setAttendanceGoal(savedGoal);
    setGoalInput(String(savedGoal));
    setGeneratedStudies(savedGenerated);
    setHiddenIds(new Set(savedHidden));
    loadUserData().then((data) => { setUserData(data); setLoaded(true); });
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    localStorage.setItem("tf_dark", String(dark));
  }, [dark]);

  const persist = useCallback(async (next: UserData) => {
    setUserData(next);
    await saveUserData(next);
  }, []);

  const allStudies: Study[] = [
    ...generatedStudies,
    ...STUDIES,
    ...userData.drafts,
  ].filter((s) => !hiddenIds.has(String(s.id)));

  const openStudy = openStudyId != null
    ? [...generatedStudies, ...STUDIES, ...userData.drafts].find((s) => String(s.id) === String(openStudyId)) ?? null
    : null;

  async function toggleLike(id: string | number) {
    const sid = String(id);
    await persist({ ...userData, liked: { ...userData.liked, [sid]: !userData.liked[sid] } });
  }

  async function handleSaveNotes(id: string | number, notes: string) {
    await persist({ ...userData, notes: { ...userData.notes, [String(id)]: notes } });
  }

  async function handleSaveAttend(id: string | number, count: number) {
    await persist({ ...userData, attendance: { ...userData.attendance, [String(id)]: count } });
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
    await persist({ ...userData, drafts: [draft, ...userData.drafts] });
    setTab("drafts");
    showToast(`Draft created: ${topic}`);
  }

  async function handleDeleteDraft(id: string | number) {
    await persist({ ...userData, drafts: userData.drafts.filter((d) => String(d.id) !== String(id)) });
    showToast("Draft deleted.");
  }

  function handleDeleteStudy(id: string | number) {
    const sid = String(id);
    // Generated study — remove from localStorage
    const updatedGenerated = generatedStudies.filter((s) => String(s.id) !== sid);
    setGeneratedStudies(updatedGenerated);
    localStorage.setItem("tf_generated", JSON.stringify(updatedGenerated));
    // Also hide it (covers hardcoded studies)
    const nextHidden = new Set(hiddenIds);
    nextHidden.add(sid);
    setHiddenIds(nextHidden);
    localStorage.setItem("tf_hidden", JSON.stringify([...nextHidden]));
    showToast("Study removed.");
  }

  function handleStudyCreated(study: Study) {
    const updated = [study, ...generatedStudies];
    setGeneratedStudies(updated);
    localStorage.setItem("tf_generated", JSON.stringify(updated));
    setTab("all");
  }

  function showToast(msg: string) { setToast(msg); }

  function saveGoal() {
    const n = parseInt(goalInput);
    if (!isNaN(n) && n > 0) {
      setAttendanceGoal(n);
      localStorage.setItem("tf_goal", String(n));
    }
    setEditingGoal(false);
  }

  const showGrid = GRID_TABS.has(tab);

  function changeTab(t: Tab) { setTab(t); setSearch(""); setOpenStudyId(null); }

  return (
    <>
      <header className="header">
        <button className="dark-btn" onClick={() => setDark((d) => !d)} title="Toggle dark mode">
          {dark ? "☀️" : "🌙"}
        </button>
        <div style={{ fontWeight: 900, fontSize: 28, letterSpacing: 2, fontFamily: "Arial, sans-serif" }}>
          TRIPLE F
        </div>
        <h1>Monday Night Bible Study&apos;s</h1>
        <p>Triple F Sports · Knoxville, TN · 2025–2026</p>
      </header>

      {loaded && (
        <StatsBar
          studies={allStudies}
          userData={userData}
          goal={attendanceGoal}
          editingGoal={editingGoal}
          goalInput={goalInput}
          onGoalClick={() => setEditingGoal(true)}
          onGoalChange={setGoalInput}
          onGoalSave={saveGoal}
        />
      )}

      {/* Two-row tab nav */}
      <nav className="tab-nav" role="tablist">
        {ROW1.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? " active" : ""}`}
            onClick={() => changeTab(t.id)}
            role="tab"
            aria-selected={tab === t.id}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <nav className="tab-nav-row2" role="tablist">
        {ROW2.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? " active" : ""}`}
            onClick={() => changeTab(t.id)}
            role="tab"
            aria-selected={tab === t.id}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {showGrid && (
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

        {tab === "topics" && <TopicIdeas onCreateDraft={handleCreateDraft} />}
        {tab === "create" && <CreateStudy onStudyCreated={handleStudyCreated} onToast={showToast} />}
        {tab === "chart" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18 }}>Attendance This Season</h2>
              <a href="/student" target="_blank" style={{ fontSize: 13, fontFamily: "Arial, sans-serif", color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}>
                📱 Student View →
              </a>
            </div>
            <AttendanceChart studies={allStudies} userData={userData} goal={attendanceGoal} />
          </div>
        )}
      </main>

      {openStudy && (
        <StudyModal
          study={openStudy}
          userData={userData}
          onClose={() => setOpenStudyId(null)}
          onSaveNotes={handleSaveNotes}
          onSaveAttend={handleSaveAttend}
          onDeleteDraft={handleDeleteDraft}
          onDeleteStudy={handleDeleteStudy}
          onToast={showToast}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
