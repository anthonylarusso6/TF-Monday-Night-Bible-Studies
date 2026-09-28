/**
 * The signed-in coach on this device.
 *
 * `token` is the proof of sign-in the server issues after a correct PIN. Every
 * request that reads or changes coach data sends it; without one the server
 * refuses. Sessions saved before tokens existed have none, and are treated as
 * signed out so the coach enters their PIN once to get one.
 */
export interface CoachSession {
  coachId: string;
  name: string;
  role: string;
  locationId: string;
  token?: string;
}

const SESSION_KEY = "tf_coach_session";

export function getSession(): CoachSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setSession(session: CoachSession) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}

/** Fired when the server rejects this device's sign-in, so the app can ask again. */
export const AUTH_EXPIRED_EVENT = "tf:auth-expired";

/**
 * fetch, carrying this device's sign-in. A 401 means the sign-in is no longer
 * valid — expired, the PIN changed, or the coach was removed — so the app is
 * told to show the login screen rather than failing quietly on every save.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getSession()?.token;
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
  return res;
}
