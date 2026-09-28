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
