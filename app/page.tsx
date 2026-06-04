"use client";
import { useEffect, useState, useCallback } from "react";
import { STUDIES } from "@/lib/studies";
import { loadUserData, saveUserData } from "@/lib/supabase";
import { Study, UserData } from "@/lib/types";
import { LOCATIONS, Location } from "@/lib/locations";
import { getSession, clearSession, CoachSession } from "@/lib/coaches";
import StudyGrid from "@/components/StudyGrid";
import StudyModal from "@/components/StudyModal";
import TopicIdeas from "@/components/TopicIdeas";
import CreateStudy from "@/components/CreateStudy";
import AttendanceChart from "@/components/AttendanceChart";
import CoachGrow from "@/components/CoachGrow";
import PrayerRequests from "@/components/PrayerRequests";
import SeasonPlanner from "@/components/SeasonPlanner";
import LocationDashboard from "@/components/LocationDashboard";
import PinLogin from "@/components/PinLogin";
import Toast from "@/components/Toast";

type Tab = "all" | "liked" | "drafts" | "series" | "topics" | "create" | "chart" | "grow" | "prayer" | "planner" | "dashboard";

const NAV = [
  { id: "all" as Tab,       icon: "📖", label: "All Studies",    section: "library" },
  { id: "liked" as Tab,     icon: "❤️", label: "Liked",          section: "library" },
  { id: "drafts" as Tab,    icon: "📝", label: "Drafts",         section: "library" },
  { id: "series" as Tab,    icon: "📚", label: "Series",         section: "library" },
  { id: "topics" as Tab,    icon: "💡", label: "Topic Ideas",    section: "tools"   },
  { id: "create" as Tab,    icon: "✏️", label: "Create Study",   section: "tools"   },
  { id: "prayer" as Tab,    icon: "🙏", label: "Prayer Requests",section: "tools"   },
  { id: "planner" as Tab,   icon: "📅", label: "Season Planner", section: "tools"   },
  { id: "chart" as Tab,     icon: "📊", label: "Attendance",     section: "tools"   },
  { id: "dashboard" as Tab, icon: "🏟", label: "All Locations",  section: "tools"   },
  { id: "grow" as Tab,      icon: "🌱", label: "Coach Grow",     section: "coach"   },
];

const TITLES: Record<Tab, string> = {
  all: "All Studies", liked: "Liked", drafts: "Drafts", series: "Series",
  topics: "Topic Ideas", create: "Create Study", chart: "Attendance", grow: "Coach Grow",
  prayer: "Prayer Requests", planner: "Season Planner", dashboard: "All Locations",
};

const GRID_TABS = new Set<Tab>(["all", "liked", "drafts", "series"]);

export default function Home() {
  const [session, setSession] = useState<CoachSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [location, setLocation] = useState<Location>(LOCATIONS[0]);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [userData, setUserData] = useState<UserData>({ liked: {}, notes: {}, attendance: {}, drafts: [] });
  const [generatedStudies, setGeneratedStudies] = useState<Study[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [openStudyId, setOpenStudyId] = useState<string | number | null>(null);
  const [prefilledTopic, setPrefilledTopic] = useState<string | undefined>(undefined);
  const [dark, setDark] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [attendanceGoal, setAttendanceGoal] = useState(20);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("20");

  useEffect(() => {
    // Load coach session
    const coachSession = getSession();
    setSession(coachSession);
    setSessionLoaded(true);

    const savedDark = localStorage.getItem("tf_dark") === "true";
    const savedGoal = parseInt(localStorage.getItem("tf_goal") || "20");
    const savedHidden: string[] = JSON.parse(localStorage.getItem("tf_hidden") || "[]");
    // If coach has a location, use it; otherwise fall back to saved
    const savedLocationId = coachSession?.locationId || localStorage.getItem("tf_location") || LOCATIONS[0].id;
    const savedLocation = LOCATIONS.find(l => l.id === savedLocationId) || LOCATIONS[0];
    setDark(savedDark);
    setAttendanceGoal(savedGoal);
    setGoalInput(String(savedGoal));
    setHiddenIds(new Set(savedHidden));
    setLocation(savedLocation);

    loadUserData(savedLocationId).then((data) => {
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

  // Close sidebar on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const persist = useCallback(async (next: UserData, generated?: Study[]) => {
    const gen = generated ?? generatedStudies;
    const notesWithGen = { ...next.notes, _g: JSON.stringify(gen) };
    setUserData(next);
    await saveUserData({ ...next, notes: notesWithGen }, location.id);
  }, [generatedStudies, location.id]);

  async function switchLocation(loc: Location) {
    setLoaded(false);
    setLocation(loc);
    setLocationPickerOpen(false);
    localStorage.setItem("tf_location", loc.id);
    const data = await loadUserData(loc.id);
    const rawNotes = data.notes as Record<string, string>;
    const savedGenerated: Study[] = rawNotes._g ? JSON.parse(rawNotes._g) : [];
    const { _g, ...cleanNotes } = rawNotes;
    void _g;
    setGeneratedStudies(savedGenerated);
    setUserData({ ...data, notes: cleanNotes });
    setLoaded(true);
    showToast(`Switched to ${loc.name}`);
  }

  // Built-in studies only show for locations that have hasBuiltInStudies: true
  const builtInStudies = location.hasBuiltInStudies ? STUDIES : [];
  const allStudies: Study[] = [
    ...generatedStudies, ...builtInStudies, ...userData.drafts,
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
        <img src="/logo.svg" alt="Triple F" style={{ width: 56, height: 56, flexShrink: 0 }} />
        <div className="sidebar-brand-text">
          <div className="sidebar-logo-text">TRIPLE F</div>
          <div className="sidebar-tagline">Monday Night Bible Study&apos;s</div>
        </div>
      </div>

      {/* Location switcher */}
      <div style={{ padding: "6px 12px 4px" }}>
        <button
          onClick={() => setLocationPickerOpen(o => !o)}
          style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", color: "white", fontSize: 12, fontWeight: 700, WebkitTapHighlightColor: "transparent" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: location.color, flexShrink: 0 }} />
            {location.name}
          </span>
          <span style={{ opacity: 0.5, fontSize: 10 }}>{locationPickerOpen ? "▲" : "▼"}</span>
        </button>
        {locationPickerOpen && (
          <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, overflow: "hidden", marginTop: 4 }}>
            {LOCATIONS.map(loc => (
              <button
                key={loc.id}
                onClick={() => switchLocation(loc)}
                style={{ width: "100%", padding: "9px 12px", background: loc.id === location.id ? "rgba(255,255,255,0.12)" : "none", border: "none", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: loc.id === location.id ? "white" : "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: loc.id === location.id ? 700 : 500, textAlign: "left", WebkitTapHighlightColor: "transparent" }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: loc.color, flexShrink: 0 }} />
                <div>
                  <div>{loc.name}</div>
                  <div style={{ fontSize: 10, opacity: 0.5, marginTop: 1 }}>{loc.city}</div>
                </div>
                {loc.id === location.id && <span style={{ marginLeft: "auto", fontSize: 12 }}>✓</span>}
              </button>
            ))}
          </div>
        )}
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
      <div className="sidebar-section">Coach</div>
      {NAV.filter(n => n.section === "coach").map((item) => (
        <button key={item.id} className={`sidebar-item${tab === item.id ? " active" : ""}`} onClick={() => changeTab(item.id)}>
          <span className="sidebar-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}

      <hr className="sidebar-divider" />

      {loaded && (
        <div className="sidebar-footer">
          <div className="sidebar-section" style={{ padding: "0 0 8px" }}>Season</div>
          <div className="sidebar-stats">
            <div className="sidebar-stat">
              <span className="sidebar-stat-label">Studies</span>
              <span className="sidebar-stat-val">{published}</span>
            </div>
            <div className="sidebar-stat">
              <span className="sidebar-stat-label">Avg Attendance</span>
              <span className={`sidebar-stat-val${avgAttend != null && avgAttend >= attendanceGoal ? " goal-met" : ""}`}>{avgAttend ?? "—"}</span>
            </div>
            <div className="sidebar-stat">
              <span className="sidebar-stat-label">Student Goal</span>
              {editingGoal ? (
                <form onSubmit={(e) => { e.preventDefault(); saveGoal(); }} style={{ margin: 0 }}>
                  <input autoFocus type="number" value={goalInput} onChange={(e) => setGoalInput(e.target.value)} onBlur={saveGoal} className="goal-input" />
                </form>
              ) : (
                <span className="goal-val" onClick={() => setEditingGoal(true)}>
                  {attendanceGoal} <span style={{ fontSize: 10, opacity: 0.45 }}>✎</span>
                </span>
              )}
            </div>
            <div className="sidebar-stat">
              <span className="sidebar-stat-label">Season</span>
              <span className="sidebar-stat-val">2025–26</span>
            </div>
          </div>
          {/* Logged-in coach */}
          {session && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0 8px", borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0 }}>
                {session.name.split(" ").map((w:string) => w[0]).join("").toUpperCase().slice(0,2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session.name}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{session.role}</div>
              </div>
              <button onClick={() => { clearSession(); setSession(null); }} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "4px 8px", color: "rgba(255,255,255,0.45)", fontSize: 11, cursor: "pointer", flexShrink: 0, fontFamily: "Arial, sans-serif" }}>
                Sign out
              </button>
            </div>
          )}
          <button className="dark-toggle" onClick={() => setDark(d => !d)}>
            {dark ? "☀️" : "🌙"} {dark ? "Light Mode" : "Dark Mode"}
          </button>
          <a href="/student" target="_blank" className="student-link">📱 Student View ↗</a>
        </div>
      )}
    </aside>
  );

  // Show PIN login if session not loaded yet or not logged in
  if (!sessionLoaded) return null;
  if (!session) return (
    <PinLogin onLogin={(s) => {
      setSession(s);
      // Set location based on coach's assigned location
      const loc = LOCATIONS.find(l => l.id === s.locationId) || LOCATIONS[0];
      switchLocation(loc);
    }} />
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
          {isGrid && (() => {
            const latestStudy = tab === "all" && !search ? (allStudies.find(s => !s.draft) ?? null) : null;
            const gridStudies = latestStudy ? allStudies.filter(s => String(s.id) !== String(latestStudy.id)) : allStudies;
            const gridCount = gridStudies.filter(s => tab === "drafts" ? s.draft : tab === "liked" ? !!userData.liked[String(s.id)] : !s.draft).length;
            return (
              <>
                {latestStudy && (
                  <div className="featured-study" onClick={() => setOpenStudyId(latestStudy.id)}>
                    <div className="featured-badge">⚡ Latest Study</div>
                    {latestStudy.series && <div className="featured-series">{latestStudy.series}</div>}
                    <div className="featured-title">{latestStudy.title}</div>
                    {latestStudy.anchor?.ref && <div className="featured-verse">{latestStudy.anchor.ref} — {latestStudy.anchor.text.substring(0, 85)}...</div>}
                    <div className="featured-footer">
                      <span className="featured-date">{latestStudy.date}</span>
                      <span className="featured-cta">Open Study →</span>
                    </div>
                  </div>
                )}
                {gridCount > 0 && (
                  <div className="section-header">
                    <span className="section-label">{tab === "liked" ? "Liked Studies" : tab === "drafts" ? "Drafts" : tab === "series" ? "By Series" : "All Studies"}</span>
                    <span className="section-count">{gridCount}</span>
                  </div>
                )}
                <StudyGrid studies={gridStudies} userData={userData} tab={tab as "all"|"liked"|"drafts"|"series"} search={search} onOpen={setOpenStudyId} onToggleLike={toggleLike} />
              </>
            );
          })()}
          {tab === "topics" && (
            <TopicIdeas
              onCreateDraft={handleCreateDraft}
              onQuickCreate={(topic) => {
                setPrefilledTopic(topic);
                changeTab("create");
              }}
            />
          )}
          {tab === "create" && (
            <CreateStudy
              prefilledTopic={prefilledTopic}
              onStudyCreated={(study) => { setPrefilledTopic(undefined); handleStudyCreated(study); }}
              onToast={showToast}
            />
          )}
          {tab === "grow" && (
            <CoachGrow
              latestStudy={allStudies.find(s => !s.draft) ?? null}
              allStudies={allStudies}
              userData={userData}
              attendanceGoal={attendanceGoal}
              onSaveReflection={async (text) => {
                await persist({ ...userData, notes: { ...userData.notes, "_coach_journal": text } });
                showToast("Reflection saved!");
              }}
              onSaveProfile={async (profile) => {
                await persist({ ...userData, notes: { ...userData.notes, "_coach_profile": JSON.stringify(profile) } });
                showToast("Profile saved!");
              }}
              onSaveSeasonVerse={async (verse) => {
                await persist({ ...userData, notes: { ...userData.notes, "_season_verse": JSON.stringify(verse) } });
                showToast("Season verse set!");
              }}
            />
          )}
          {tab === "prayer" && (
            <PrayerRequests
              userData={userData}
              onSave={async (requests) => {
                await persist({ ...userData, notes: { ...userData.notes, _prayers: JSON.stringify(requests) } });
              }}
            />
          )}
          {tab === "planner" && (
            <SeasonPlanner
              allStudies={allStudies}
              userData={userData}
              onSave={async (plan) => {
                await persist({ ...userData, notes: { ...userData.notes, _plan: JSON.stringify(plan) } });
              }}
            />
          )}
          {tab === "chart" && (
            <div className="chart-wrap">
              <AttendanceChart studies={allStudies} userData={userData} goal={attendanceGoal} />
            </div>
          )}
          {tab === "dashboard" && <LocationDashboard />}
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
