import { NextRequest, NextResponse } from "next/server";
import {
  readRegistry, writeRegistry, publicCoach, issueToken, requireCoach,
  lockedFor, recordFailure, clearFailures, StoredCoach,
} from "@/lib/auth";
import { MANAGER_ROLES, FULL_ROLES, ROLE_CREATOR, ROLE_ADMIN, ADMIN_ASSIGNABLE, mayManage, assignableRoles } from "@/lib/roles";

/**
 * Coach registry.
 *
 * Listing coaches and signing in are open — the login screen needs both. PINs
 * never leave the server. Adding, changing or removing a coach needs a signed-in
 * Head Coach, with one exception: the very first account, when none exist yet.
 */

export const dynamic = "force-dynamic";

const unavailable = (e: unknown) => NextResponse.json(
  { ok: false, error: e instanceof Error ? e.message : "Registry unavailable" },
  { status: 503 },
);

export async function GET(req: NextRequest) {
  try {
    const coaches = await readRegistry();
    // The sign-in screen is public, so it lists approved coaches only (accounts still waiting stay off it), and the
    // Creator appears there as "Lead Coach": the name is listed, the real role is not. A signed-in manager sees
    // the whole registry as it is.
    const manager = await requireCoach(req, { roles: MANAGER_ROLES });
    const visible = manager.ok
      ? coaches
      : coaches.filter((c) => !c.pending).map((c) => (c.role === ROLE_CREATOR ? { ...c, role: "Lead Coach" } : c));
    return NextResponse.json({ ok: true, coaches: visible.map(publicCoach) });
  } catch (e) {
    return unavailable(e);
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 }); }

  const action = String(body.action || "");

  try {
    // ── Sign in ────────────────────────────────────────────────────────────
    if (action === "verify") {
      const name = String(body.name || "").trim();
      const pin = String(body.pin || "");

      const wait = await lockedFor(name);
      if (wait > 0) {
        return NextResponse.json({ ok: true, coach: null, lockedMinutes: Math.ceil(wait / 60000) });
      }

      const coaches = await readRegistry();
      const match = coaches.find((c) => c.name.toLowerCase() === name.toLowerCase() && c.pin === pin);
      if (!match) {
        const lock = await recordFailure(name);
        // Same shape whether the name or the PIN was wrong, so this can't be
        // used to find out who is registered.
        return NextResponse.json({
          ok: true, coach: null,
          ...(lock ? { lockedMinutes: Math.ceil(lock / 60000) } : {}),
        });
      }
      await clearFailures(name);
      if (match.pending) return NextResponse.json({ ok: true, coach: null, pending: true });
      return NextResponse.json({ ok: true, coach: publicCoach(match), token: issueToken(match) });
    }

    // ── Sign up from the login screen ──────────────────────────────────────
    // Open to anyone, so it can only ever make a pending, non-admin account that sees nothing until a manager
    // approves it. Never Creator, Head Coach or Admin.
    if (action === "signup") {
      const coaches = await readRegistry();
      if (coaches.length === 0) return NextResponse.json({ ok: false, error: "Set up the first account instead." }, { status: 400 });
      const name = String(body.name || "").trim().slice(0, 60);
      const pin = String(body.pin || "");
      const role = String(body.role || "");
      const locationId = String(body.locationId || "");
      if (!name || !/^\d{4}$/.test(pin) || !role || !locationId) {
        return NextResponse.json({ ok: false, error: "Name, role, location and a 4-digit PIN are required." }, { status: 400 });
      }
      if (!ADMIN_ASSIGNABLE.includes(role)) {
        return NextResponse.json({ ok: false, error: "Pick Assistant Coach, Volunteer or Social Media." }, { status: 403 });
      }
      if (coaches.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        // Same words whoever holds the name, so this can't be used to find out who is registered.
        return NextResponse.json({ ok: false, error: "Pick a different name (try first and last)." }, { status: 409 });
      }
      if (coaches.filter((c) => c.pending).length >= 25) {
        return NextResponse.json({ ok: false, error: "Too many sign-ups are waiting. Ask your admin to approve them first." }, { status: 429 });
      }
      const coach: StoredCoach = { id: `coach_${Date.now()}`, name, pin, role, locationId, pending: true };
      await writeRegistry([...coaches, coach]);
      return NextResponse.json({ ok: true, pending: true });
    }

    // ── Add ────────────────────────────────────────────────────────────────
    if (action === "add") {
      const coaches = await readRegistry();
      const bootstrapping = coaches.length === 0;
      let actorAdd: StoredCoach | null = null;

      if (!bootstrapping) {
        const auth = await requireCoach(req, { roles: MANAGER_ROLES });
        if (!auth.ok) return auth.response;
        actorAdd = auth.coach;
      }

      const name = String(body.name || "").trim();
      const pin = String(body.pin || "");
      // The first account must be able to manage the rest, whatever was picked.
      const role = bootstrapping ? ROLE_CREATOR : String(body.role || "");
      const locationId = String(body.locationId || "");
      if (!name || !/^\d{4}$/.test(pin) || !role || !locationId) {
        return NextResponse.json({ ok: false, error: "Name, role, location and a 4-digit PIN are required." }, { status: 400 });
      }
      if (coaches.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        return NextResponse.json({ ok: false, error: "A coach with that name already exists." }, { status: 409 });
      }

      if (actorAdd && (!assignableRoles(actorAdd.role).includes(role) || !mayManage(actorAdd, { role, locationId }))) {
        return NextResponse.json({ ok: false, error: actorAdd.role === ROLE_ADMIN ? "Admins can add coaches at their own location, with a coach, volunteer or social media role." : "You can't give that role." }, { status: 403 });
      }

      const coach: StoredCoach = { id: `coach_${Date.now()}`, name, pin, role, locationId };
      await writeRegistry([...coaches, coach]);
      return NextResponse.json({
        ok: true,
        coach: publicCoach(coach),
        // Only the first-ever account signs straight in. A Head Coach adding
        // someone else must never be handed that person's sign-in.
        ...(bootstrapping ? { token: issueToken(coach) } : {}),
      });
    }

    // Everything below needs a Creator, Head Coach or location Admin.
    const auth = await requireCoach(req, { roles: MANAGER_ROLES });
    if (!auth.ok) return auth.response;
    const coaches = auth.registry;
    // Whoever has full control: there must always be at least one, or nobody could manage the Admin's own bosses.
    const headCount = coaches.filter((c) => FULL_ROLES.includes(c.role)).length;
    const forbidden = () => NextResponse.json({ ok: false, error: auth.coach.role === ROLE_ADMIN ? "Admins can only change coaches at their own location." : "You can't change that coach." }, { status: 403 });

    // ── Update ─────────────────────────────────────────────────────────────
    if (action === "update") {
      const id = String(body.id || "");
      const existing = coaches.find((c) => c.id === id);
      if (!existing) return NextResponse.json({ ok: false, error: "Coach not found." }, { status: 404 });

      const pin = body.pin ? String(body.pin) : "";
      const nextLocation = body.locationId ? String(body.locationId) : existing.locationId;
      if (!mayManage(auth.coach, existing)) return forbidden();
      if (pin && !/^\d{4}$/.test(pin)) {
        return NextResponse.json({ ok: false, error: "PIN must be 4 digits." }, { status: 400 });
      }
      const nextRole = body.role ? String(body.role) : existing.role;
      // First-time hand-over: with no Creator yet, a Head Coach can make themselves the Creator (and only themselves).
      const claimingCreator =
        nextRole === ROLE_CREATOR && existing.id === auth.coach.id && auth.coach.role === "Head Coach" &&
        !coaches.some((c) => c.role === ROLE_CREATOR);
      if (!claimingCreator) {
        if (nextRole !== existing.role && !assignableRoles(auth.coach.role).includes(nextRole)) return forbidden();
        if (!mayManage(auth.coach, { role: nextRole, locationId: nextLocation })) return forbidden();
      }
      if (FULL_ROLES.includes(existing.role) && !FULL_ROLES.includes(nextRole) && headCount <= 1) {
        return NextResponse.json(
          { ok: false, error: "There has to be at least one Creator or Head Coach, or nobody could manage coaches." },
          { status: 409 },
        );
      }
      const nextName = body.name ? String(body.name).trim() : existing.name;
      if (coaches.some((c) => c.id !== id && c.name.toLowerCase() === nextName.toLowerCase())) {
        return NextResponse.json({ ok: false, error: "A coach with that name already exists." }, { status: 409 });
      }

      const updated = coaches.map((c) => c.id === id ? {
        ...c,
        name: nextName,
        role: nextRole,
        locationId: nextLocation,
        ...(pin ? { pin } : {}),
        ...(body.approve ? { pending: false } : {}),
      } : c);
      await writeRegistry(updated);

      // Changing your own PIN invalidates your own sign-in, since the PIN is
      // part of the signature — so hand back a fresh one rather than signing
      // the Head Coach out mid-edit.
      const self = updated.find((c) => c.id === auth.coach.id);
      const refreshedToken = self && self.pin !== auth.coach.pin ? issueToken(self) : undefined;

      return NextResponse.json({
        ok: true,
        coaches: updated.map(publicCoach),
        ...(refreshedToken ? { token: refreshedToken } : {}),
      });
    }

    // ── Remove ─────────────────────────────────────────────────────────────
    if (action === "remove") {
      const id = String(body.id || "");
      const target = coaches.find((c) => c.id === id);
      if (!target) return NextResponse.json({ ok: false, error: "Coach not found." }, { status: 404 });
      if (target.id === auth.coach.id) {
        return NextResponse.json({ ok: false, error: "You can't remove yourself." }, { status: 409 });
      }
      if (!mayManage(auth.coach, target)) return forbidden();
      if (FULL_ROLES.includes(target.role) && headCount <= 1) {
        return NextResponse.json({ ok: false, error: "There has to be at least one Creator or Head Coach." }, { status: 409 });
      }
      const remaining = coaches.filter((c) => c.id !== id);
      await writeRegistry(remaining);
      return NextResponse.json({ ok: true, coaches: remaining.map(publicCoach) });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return unavailable(e);
  }
}
