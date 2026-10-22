/**
 * What each role is here to do.
 *
 * The app was built for coaches leading a study, so everyone saw all of it —
 * including drafts, attendance, prayer requests and the delete buttons inside a
 * study. Someone handling the posts needs none of that and shouldn't have to
 * pick their way past it.
 */

export const ROLE_SOCIAL_MEDIA = "Social Media";

/** Tab ids a social media role is shown. Every other role sees everything. */
const SOCIAL_MEDIA_TABS = ["social"] as const;

export function isSocialMediaRole(role: string | undefined): boolean {
  return role === ROLE_SOCIAL_MEDIA;
}

/**
 * The tabs this role may open, or null when the role is unrestricted.
 * Returning null rather than the full list keeps coaches unaffected by
 * anything added here later.
 */
export function allowedTabs(role: string | undefined): readonly string[] | null {
  return isSocialMediaRole(role) ? SOCIAL_MEDIA_TABS : null;
}

/** Where this role should land when they sign in. */
export function defaultTab(role: string | undefined): string {
  return isSocialMediaRole(role) ? "social" : "all";
}

export const ROLE_CREATOR = "Creator";
export const ROLE_ADMIN = "Admin";
export const ROLE_HEAD_COACH = "Head Coach";

/**
 * Who may use the AI (generate a study, import, spin-off ideas, prep guide). Each call spends the Gemini quota and
 * writes in Anthony's voice, so only the Creator gets it. The server enforces this on every AI route; the app just
 * hides the buttons so nobody taps into an error.
 */
export const AI_ROLES = [ROLE_CREATOR];

export function canUseAI(role: string | undefined, ai?: boolean): boolean {
  return (!!role && AI_ROLES.includes(role)) || ai === true;
}

/** Full control of every coach at every location. */
export const FULL_ROLES = [ROLE_CREATOR];

/** Anyone who sees the Admin portal. Only the Creator: Head Coach and Admin are roles people hold, not keys to this. */
export const MANAGER_ROLES = [ROLE_CREATOR];

/** The only roles a location Admin can hand out: nobody can promote someone above or level with themselves. */
export const ADMIN_ASSIGNABLE = ["Assistant Coach", "Volunteer", ROLE_SOCIAL_MEDIA];

export function isManager(role: string | undefined): boolean {
  return !!role && MANAGER_ROLES.includes(role);
}

/** Roles this signed-in role may give to a coach. */
export function assignableRoles(role: string | undefined): string[] {
  if (role === ROLE_CREATOR) return [ROLE_CREATOR, ROLE_HEAD_COACH, ROLE_ADMIN, ...ADMIN_ASSIGNABLE];
  if (role === ROLE_HEAD_COACH) return [ROLE_HEAD_COACH, ROLE_ADMIN, ...ADMIN_ASSIGNABLE];
  if (role === ROLE_ADMIN) return ADMIN_ASSIGNABLE;
  return [];
}

/**
 * May a signed-in coach change this target (or create one with this role and location)?
 * Creator and Head Coach: anyone except a Creator (only a Creator touches a Creator). Admin: only coaches at their
 * own location whose role is one they could assign.
 */
export function mayManage(
  actor: { role: string; locationId: string },
  target: { role: string; locationId: string },
): boolean {
  if (actor.role === ROLE_CREATOR) return true;
  if (target.role === ROLE_CREATOR) return false;
  if (actor.role === ROLE_HEAD_COACH) return true;
  if (actor.role === ROLE_ADMIN) return target.locationId === actor.locationId && ADMIN_ASSIGNABLE.includes(target.role);
  return false;
}
