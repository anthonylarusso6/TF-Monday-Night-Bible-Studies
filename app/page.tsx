"use client";
import { useEffect, useState, useCallback } from "react";
import { STUDIES } from "@/lib/studies";
import { loadUserData, saveUserData } from "@/lib/supabase";
import { Study, UserData } from "@/lib/types";
import StudyGrid from "@/components/StudyGrid";
import StudyModal from "@/components/StudyModal";
import TopicIdeas from "@/components/TopicIdeas";
import CreateStudy from "@/components/CreateStudy";
import AttendanceChart from "@/components/AttendanceChart";
import Toast from "@/components/Toast";

type Tab = "all" | "liked" | "drafts" | "series" | "topics" | "create" | "chart";

const SIDEBAR_ITEMS: { id: Tab; icon: string; label: string }[] = [
  { id: "all",    icon: "📖", label: "All Studies" },
  { id: "liked",  icon: "❤️", label: "Liked" },
  { id: "drafts", icon: "📝", label: "Drafts" },
  { id: "series", icon: "📚", label: "Series" },
];
const SIDEBAR_TOOLS: { id: Tab; icon: string; label: string }[] = [
  { id: "topics", icon: "💡", label: "Topic Ideas" },
  { id: "create", icon: "✏️", label: "Create Study" },
  { id: "chart",  icon: "📊", label: "Attendance" },
];
const BOTTOM_NAV: { id: Tab; icon: string; label: string }[] = [
  { id: "all",    icon: "📖", label: "All" },
  { id: "liked",  icon: "❤️", label: "Liked" },
  { id: "create", icon: "✏️", label: "Create" },
  { id: "series", icon: "📚", label: "Series" },
  { id: "chart",  icon: "📊", label: "More" },
];

const SECTION_TITLES: Record<Tab, string> = {
  all: "All Studies", liked: "Liked Studies", drafts: "Drafts",
  series: "Series", topics: "Topic Ideas", create: "Create a Study", chart: "Attendance",
};
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
    const savedHidden: string[] = JSON.parse(localStorage.getItem("tf_hidden") || "[]");
    setDark(savedDark);
    setAttendanceGoal(savedGoal);
    setGoalInput(String(savedGoal));
    setHiddenIds(new Set(savedHidden));

    loadUserData().then((data) => {
      // Generated studies stored in notes under key _g
      const rawNotes = data.notes as Record<string, string>;
      const savedGenerated: Study[] = rawNotes._g ? JSON.parse(rawNotes._g) : [];
      const { _g, ...cleanNotes } = rawNotes;
      void _g;
      setGeneratedStudies(savedGenerated);
      setUserData({ ...data, notes: cleanNotes });
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", dark);
    localStorage.setItem("tf_dark", String(dark));
  }, [dark]);

  const persist = useCallback(async (next: UserData, generated?: Study[]) => {
    const gen = generated ?? generatedStudies;
    const notesWithGen = { ...next.notes, _g: JSON.stringify(gen) };
    setUserData(next);
    await saveUserData({ ...next, notes: notesWithGen });
  }, [generatedStudies]);

  const allStudies: Study[] = [
    ...generatedStudies, ...STUDIES, ...userData.drafts,
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
      title: topic, series: "", draft: true,
      anchor: { ref: "", text: "" }, sup: [], bi: "Draft — build this study out.", bd: [], sbd: [], qs: [], tk: [],
    };
    await persist({ ...userData, drafts: [draft, ...userData.drafts] });
    changeTab("drafts");
    showToast(`Draft created: ${topic}`);
  }

  async function handleDeleteDraft(id: string | number) {
    await persist({ ...userData, drafts: userData.drafts.filter((d) => String(d.id) !== String(id)) });
    showToast("Draft deleted.");
  }

  async function handleDeleteStudy(id: string | number) {
    const sid = String(id);
    const updatedGen = generatedStudies.filter((s) => String(s.id) !== sid);
    setGeneratedStudies(updatedGen);
    const nextHidden = new Set(hiddenIds);
    nextHidden.add(sid);
    setHiddenIds(nextHidden);
    localStorage.setItem("tf_hidden", JSON.stringify([...nextHidden]));
    await persist(userData, updatedGen);
    showToast("Study removed.");
  }

  async function handleStudyCreated(study: Study) {
    const updated = [study, ...generatedStudies];
    setGeneratedStudies(updated);
    await persist(userData, updated);
    changeTab("all");
  }

  function showToast(msg: string) { setToast(msg); }
  function changeTab(t: Tab) { setTab(t); setSearch(""); setOpenStudyId(null); }

  function saveGoal() {
    const n = parseInt(goalInput);
    if (!isNaN(n) && n > 0) { setAttendanceGoal(n); localStorage.setItem("tf_goal", String(n)); }
    setEditingGoal(false);
  }

  // Stats
  const published = allStudies.filter((s) => !s.draft).length;
  const attendVals = Object.values(userData.attendance).filter(Boolean) as number[];
  const avgAttend = attendVals.length ? Math.round(attendVals.reduce((a,b)=>a+b,0)/attendVals.length) : null;
  const likedCount = Object.values(userData.liked).filter(Boolean).length;

  const showGrid = GRID_TABS.has(tab);

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo-text">TRIPLE F</div>
          <div className="sidebar-subtitle">Monday Night Bible Study&apos;s</div>
        </div>

        <div className="sidebar-section-label">Library</div>
        {SIDEBAR_ITEMS.map((item) => (
          <button key={item.id} className={`sidebar-item${tab === item.id ? " active" : ""}`} onClick={() => changeTab(item.id)}>
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
            {item.id === "drafts" && userData.drafts.length > 0 && (
              <span className="sidebar-badge">{userData.drafts.length}</span>
            )}
            {item.id === "liked" && likedCount > 0 && (
              <span className="sidebar-badge">{likedCount}</span>
            )}
          </button>
        ))}

        <hr className="sidebar-divider" />
        <div className="sidebar-section-label">Tools</div>
        {SIDEBAR_TOOLS.map((item) => (
          <button key={item.id} className={`sidebar-item${tab === item.id ? " active" : ""}`} onClick={() => changeTab(item.id)}>
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}

        <hr className="sidebar-divider" />
        <div className="sidebar-section-label">Season Stats</div>
        <div className="sidebar-stats">
          <div className="sidebar-stat">
            <span className="sidebar-stat-label">Studies</span>
            <span className="sidebar-stat-val">{published}</span>
          </div>
          <div className="sidebar-stat">
            <span className="sidebar-stat-label">Avg Attendance</span>
            <span className="sidebar-stat-val" style={{ color: avgAttend != null && avgAttend >= attendanceGoal ? "#7fd6a0" : undefined }}>
              {avgAttend ?? "—"}
            </span>
          </div>
          <div className="sidebar-stat">
            <span className="sidebar-stat-label">Student Goal</span>
            {editingGoal ? (
              <form onSubmit={(e) => { e.preventDefault(); saveGoal(); }} style={{ margin: 0 }}>
                <input autoFocus type="number" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} onBlur={saveGoal} className="sidebar-goal-input" />
              </form>
            ) : (
              <span className="sidebar-stat-val goal-edit" onClick={() => setEditingGoal(true)}>
                {attendanceGoal} <span style={{ fontSize: 10, opacity: 0.6 }}>✎</span>
              </span>
            )}
          </div>
          <div className="sidebar-stat">
            <span className="sidebar-stat-label">Season</span>
            <span className="sidebar-stat-val">2025–26</span>
          </div>
        </div>

        <button className="dark-toggle" onClick={() => setDark((d) => !d)}>
          {dark ? "☀️" : "🌙"} {dark ? "Light Mode" : "Dark Mode"}
        </button>

        <div style={{ padding: "8px 20px 20px" }}>
          <a href="/student" target="_blank" style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textDecoration: "none", display: "block" }}>
            📱 Student View ↗
          </a>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-content">
        <div className="content-header">
          <div className="content-title">{SECTION_TITLES[tab]}</div>
          {showGrid && (
            <div className="content-search">
              <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search studies, verses, topics..." />
            </div>
          )}
        </div>

        <div className="content-body">
          {showGrid && (
            <StudyGrid studies={allStudies} userData={userData} tab={tab as "all"|"liked"|"drafts"|"series"} search={search} onOpen={setOpenStudyId} onToggleLike={toggleLike} />
          )}
          {tab === "topics" && <TopicIdeas onCreateDraft={handleCreateDraft} />}
          {tab === "create" && <CreateStudy onStudyCreated={handleStudyCreated} onToast={showToast} />}
          {tab === "chart" && (
            <div className="chart-wrap">
              <AttendanceChart studies={allStudies} userData={userData} goal={attendanceGoal} />
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {BOTTOM_NAV.map((item) => (
            <button key={item.id} className={`bottom-nav-item${tab === item.id ? " active" : ""}`} onClick={() => changeTab(item.id)}>
              <span className="bn-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {openStudy && (
        <StudyModal study={openStudy} userData={userData} onClose={() => setOpenStudyId(null)} onSaveNotes={handleSaveNotes} onSaveAttend={handleSaveAttend} onDeleteDraft={handleDeleteDraft} onDeleteStudy={handleDeleteStudy} onToast={showToast} />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
