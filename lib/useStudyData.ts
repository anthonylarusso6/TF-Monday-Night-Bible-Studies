import { useCallback, useEffect, useMemo, useState } from "react";
import { STUDIES } from "./studies";
import { loadUserData, saveUserData } from "./supabase";
import { Study, UserData } from "./types";

export function useStudyData(showToast: (msg: string) => void) {
  const [userData, setUserData] = useState<UserData>({ liked: {}, notes: {}, attendance: {}, drafts: [] });
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const savedHidden: string[] = JSON.parse(localStorage.getItem("tf_hidden") || "[]");
    setHiddenIds(new Set(savedHidden));

    loadUserData().then((data) => {
      const rawNotes = data.notes as Record<string, string>;
      if (rawNotes._g) {
        try {
          const old: Study[] = JSON.parse(rawNotes._g);
          const { _g, ...cleanNotes } = rawNotes;
          void _g;
          const existingIds = new Set(data.drafts.map((d) => String(d.id)));
          const toMerge = old.filter((s) => !existingIds.has(String(s.id)));
          const merged = {
            ...data,
            notes: cleanNotes as Record<string, string>,
            drafts: [...toMerge, ...data.drafts],
          };
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

  const persist = useCallback(async (next: UserData) => {
    setUserData(next);
    await saveUserData(next);
  }, []);

  const allStudies = useMemo(
    () => [...STUDIES, ...userData.drafts].filter((s) => !hiddenIds.has(String(s.id))),
    [userData.drafts, hiddenIds]
  );

  function getStudy(id: string | number): Study | null {
    return [...STUDIES, ...userData.drafts].find((s) => String(s.id) === String(id)) ?? null;
  }

  const stats = useMemo(() => {
    const published = allStudies.filter((s) => !s.draft).length;
    const draftCount = userData.drafts.filter((d) => d.draft).length;
    const likedCount = Object.values(userData.liked).filter(Boolean).length;
    const attendVals = Object.values(userData.attendance).filter(Boolean) as number[];
    const avgAttend = attendVals.length
      ? Math.round(attendVals.reduce((a, b) => a + b, 0) / attendVals.length)
      : null;
    return { published, draftCount, likedCount, avgAttend };
  }, [allStudies, userData]);

  async function toggleLike(id: string | number): Promise<void> {
    const sid = String(id);
    await persist({ ...userData, liked: { ...userData.liked, [sid]: !userData.liked[sid] } });
  }

  async function saveNotes(id: string | number, notes: string): Promise<void> {
    await persist({ ...userData, notes: { ...userData.notes, [String(id)]: notes } });
  }

  async function saveAttend(id: string | number, count: number): Promise<void> {
    await persist({ ...userData, attendance: { ...userData.attendance, [String(id)]: count } });
  }

  async function createDraft(topic: string): Promise<void> {
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
    showToast(`Draft created: ${topic}`);
  }

  async function deleteDraft(id: string | number): Promise<void> {
    await persist({ ...userData, drafts: userData.drafts.filter((d) => String(d.id) !== String(id)) });
    showToast("Draft deleted.");
  }

  async function deleteStudy(id: string | number): Promise<void> {
    const sid = String(id);
    if (userData.drafts.some((s) => String(s.id) === sid)) {
      await persist({ ...userData, drafts: userData.drafts.filter((s) => String(s.id) !== sid) });
    } else {
      const nextHidden = new Set(hiddenIds);
      nextHidden.add(sid);
      setHiddenIds(nextHidden);
      localStorage.setItem("tf_hidden", JSON.stringify([...nextHidden]));
    }
    showToast("Study removed.");
  }

  async function studyCreated(study: Study): Promise<void> {
    await persist({ ...userData, drafts: [study, ...userData.drafts] });
  }

  return {
    userData,
    allStudies,
    getStudy,
    stats,
    loaded,
    toggleLike,
    saveNotes,
    saveAttend,
    createDraft,
    deleteDraft,
    deleteStudy,
    studyCreated,
  };
}
