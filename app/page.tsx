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

const NAV = [
  { id: "all" as Tab,    icon: "📖", label: "All Studies",  section: "library" },
  { id: "liked" as Tab,  icon: "❤️", label: "Liked",        section: "library" },
  { id: "drafts" as Tab, icon: "📝", label: "Drafts",       section: "library" },
  { id: "series" as Tab, icon: "📚", label: "Series",       section: "library" },
  { id: "topics" as Tab, icon: "💡", label: "Topic Ideas",  section: "tools"   },
  { id: "create" as Tab, icon: "✏️", label: "Create Study", section: "tools"   },
  { id: "chart" as Tab,  icon: "📊", label: "Attendance",   section: "tools"   },
];

const TITLES: Record<Tab, string> = {
  all: "All Studies", liked: "Liked", drafts: "Drafts", series: "Series",
  topics: "Topic Ideas", create: "Create Study", chart: "Attendance",
};

const GRID_TABS = new Set<Tab>(["all", "liked", "drafts", "series"]);

export default function Home() {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [userData, setUserData] = useState<UserData>({ liked: {}, notes: {}, attendance: {}, drafts: [] });
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
      // Migrate any previously generated studies stored in the old notes._g format
      const rawNotes = data.notes as Record<string, string>;
      if (rawNotes._g) {
        try {
          const old: Study[] = JSON.parse(rawNotes._g);
          const { _g, ...cleanNotes } = rawNotes;
          void _g;
          const existingIds = new Set(data.drafts.map((d) => String(d.id)));
          const toMerge = old.filter((s) => !existingIds.has(String(s.id)));
          const merged = { ...data, notes: cleanNotes as Record<string, string>, drafts: [...toMerge, ...data.drafts] };
          setUserData(merged);
          saveUserData(merged);
        } catch {
          setUserData(data);
        }
      } else {
        setUserData(data);
      }
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

  // Close sidebar on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const persist = useCallback(async (next: UserData) => {
    setUserData(next);
    await saveUserData(next);
  }, []);

  const allStudies: Study[] = [
    ...STUDIES, ...userData.drafts,
  ].filter((s) => !hiddenIds.has(String(s.id)));

  const openStudy = openStudyId != null
    ? [...STUDIES, ...userData.drafts].find((s) => String(s.id) === String(openStudyId)) ?? null
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
      anchor: { ref: "", text: "" }, sup: [], bi: "Draft — build this study out.",
      bd: [], sbd: [], qs: [], tk: [],
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
    const isGenerated = userData.drafts.some((s) => String(s.id) === sid);
    if (isGenerated) {
      await persist({ ...userData, drafts: userData.drafts.filter((s) => String(s.id) !== sid) });
    } else {
      const nextHidden = new Set(hiddenIds);
      nextHidden.add(sid);
      setHiddenIds(nextHidden);
      localStorage.setItem("tf_hidden", JSON.stringify([...nextHidden]));
    }
    showToast("Study removed.");
  }
  async function handleStudyCreated(study: Study) {
    await persist({ ...userData, drafts: [study, ...userData.drafts] });
    changeTab("all");
  }

  function showToast(msg: string) { setToast(msg); }
  function changeTab(t: Tab) {
    setTab(t); setSearch(""); setOpenStudyId(null); setSidebarOpen(false); setShowSearch(false);
  }
  function saveGoal() {
    const n = parseInt(goalInput);
    if (!isNaN(n) && n > 0) { setAttendanceGoal(n); localStorage.setItem("tf_goal", String(n)); }
    setEditingGoal(false);
  }

  const published = allStudies.filter((s) => !s.draft).length;
  const draftCount = userData.drafts.length;
  const likedCount = Object.values(userData.liked).filter(Boolean).length;
  const attendVals = Object.values(userData.attendance).filter(Boolean) as number[];
  const avgAttend = attendVals.length ? Math.round(attendVals.reduce((a, b) => a + b, 0) / attendVals.length) : null;
  const isGrid = GRID_TABS.has(tab);

  const Sidebar = (
    <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
      <div className="sidebar-brand">
        <img src="/logo.svg" alt="Triple F Bible Study's" style={{ width: 96, height: 96, marginBottom: 10, display: "block" }} />
        <div className="sidebar-tagline" style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: 0.5 }}>Monday Night Bible Study&apos;s</div>
        <div className="sidebar-location">Knoxville, TN</div>
      </div>

      <div className="sidebar-section">Library</div>
      {NAV.filter(n => n.section === "library").map((item) => (
        <button key={item.id} className={`sidebar-item${tab === item.id ? " active" : ""}`} onClick={() => changeTab(item.id)}>
          <span className="sidebar-icon">{item.icon}</span>
          {item.label}
          {item.id === "drafts" && draftCount > 0 && <span className="sidebar-badge">{draftCount}</span>}
          {item.id === "liked" && likedCount > 0 && <span className="sidebar-badge">{likedCount}</span>}
        </button>
      ))}

      <hr className="sidebar-divider" />
      <div className="sidebar-section">Tools</div>
      {NAV.filter(n => n.section === "tools").map((item) => (
        <button key={item.id} className={`sidebar-item${tab === item.id ? " active" : ""}`} onClick={() => changeTab(item.id)}>
          <span className="sidebar-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}

      <hr className="sidebar-divider" />

      {loaded && (
        <div className="sidebar-footer">
          <div className="sidebar-section" style={{ padding: "0 0 10px" }}>Season Stats</div>
          <div className="sidebar-stats-grid">
            <div className="sidebar-stat-box">
              <div className="sidebar-stat-num">{published}</div>
              <div className="sidebar-stat-lbl">Studies</div>
            </div>
            <div className="sidebar-stat-box">
              <div className={`sidebar-stat-num${avgAttend != null && avgAttend >= attendanceGoal ? " goal-met" : ""}`}>
                {avgAttend ?? "—"}
              </div>
              <div className="sidebar-stat-lbl">Avg Attend</div>
            </div>
          </div>
          <div className="goal-row">
            <span className="goal-label">Student goal</span>
            {editingGoal ? (
              <form onSubmit={(e) => { e.preventDefault(); saveGoal(); }} style={{ margin: 0 }}>
                <input autoFocus type="number" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} onBlur={saveGoal} className="goal-input" />
              </form>
            ) : (
              <span className="goal-val" onClick={() => setEditingGoal(true)}>
                {attendanceGoal} <span style={{ fontSize: 11, opacity: 0.5 }}>✎</span>
              </span>
            )}
          </div>
          <button className="dark-toggle" onClick={() => setDark(d => !d)}>
            {dark ? "☀️" : "🌙"} {dark ? "Light Mode" : "Dark Mode"}
          </button>
          <a href="/student" target="_blank" className="student-link">📱 Student View ↗</a>
        </div>
      )}
    </aside>
  );

  return (
    <div className="app-layout">
      {/* Overlay closes sidebar on mobile */}
      <div className={`sidebar-overlay${sidebarOpen ? " open" : ""}`} onClick={() => setSidebarOpen(false)} />

      {Sidebar}

      <div className="main-content">
        {/* Mobile header */}
        <div className="mobile-header">
          <button className="hamburger" onClick={() => setSidebarOpen(o => !o)}>☰</button>
          <img src="/logo.svg" alt="TF" style={{ width: 38, height: 38, flexShrink: 0 }} />
          <span className="mobile-title">{TITLES[tab]}</span>
          {isGrid && (
            <button className="mobile-search-btn" onClick={() => setShowSearch(s => !s)}>🔍</button>
          )}
        </div>

        {/* Mobile search */}
        {isGrid && showSearch && (
          <div className="mobile-search-bar">
            <input autoFocus className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search studies, verses, topics..." />
          </div>
        )}

        {/* Desktop header */}
        <div className="content-header">
          <div className="content-title">{TITLES[tab]}</div>
          {isGrid && (
            <div className="search-wrap-desktop">
              <input className="search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search studies, verses, topics..." />
            </div>
          )}
        </div>

        <div className="content-body">
          {isGrid && (
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

      {/* FAB — mobile only, always accessible */}
      <button className="fab" onClick={() => changeTab("create")}>
        ✏️ Create
      </button>

      {openStudy && (
        <StudyModal study={openStudy} userData={userData} onClose={() => setOpenStudyId(null)}
          onSaveNotes={handleSaveNotes} onSaveAttend={handleSaveAttend}
          onDeleteDraft={handleDeleteDraft} onDeleteStudy={handleDeleteStudy} onToast={showToast} />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
