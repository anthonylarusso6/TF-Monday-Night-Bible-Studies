import { NextRequest, NextResponse } from "next/server";
import {
  readRegistry, writeRegistry, publicCoach, issueToken, requireCoach, hashPin, pinMatches, pinKey,
  lockedFor, recordFailure, clearFailures, StoredCoach,
} from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { cleanLocationIds } from "@/lib/locations";
import { MANAGER_ROLES, FULL_ROLES, ROLE_CREATOR, ROLE_ADMIN, ADMIN_ASSIGNABLE, SIGNUP_ROLES, mayManage, assignableRoles } from "@/lib/roles";

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
    // A signed-in coach also gets their own record (role, AI switch, PIN flag) so their app can keep up with the Creator's changes.
    const self = manager.ok ? manager : await requireCoach(req);
    const me = self.ok ? publicCoach(self.coach) : null;
    const visible = manager.ok
      ? coaches
      : coaches
          .filter((c) => !c.pending && !c.suspended)
          // Only the name, role and place: the PIN flags are the Creator's business.
          .map((c) => ({ ...c, mustChangePin: undefined, role: c.role === ROLE_CREATOR ? "Lead Coach" : c.role }));
    return NextResponse.json({ ok: true, coaches: visible.map(publicCoach), me });
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
      const match = coaches.find((c) => c.name.toLowerCase() === name.toLowerCase() && pinMatches(c, pin));
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
      // A PIN still stored in plain text is converted the first time that coach signs in. Their other devices sign in
      // again once, because the token is tied to the PIN's stored form.
      await logActivity({ coachId: match.id, name: match.name, action: "signin", detail: "signed in" });
      if (!match.pinHash) {
        const upgraded: StoredCoach = { ...match, pinHash: hashPin(match.id, pin) };
        delete upgraded.pin;
        await writeRegistry(coaches.map((c) => (c.id === match.id ? upgraded : c)));
        if (upgraded.pending) return NextResponse.json({ ok: true, coach: null, pending: true });
        if (upgraded.suspended) return NextResponse.json({ ok: true, coach: null, suspended: true });
        return NextResponse.json({ ok: true, coach: publicCoach(upgraded), token: issueToken(upgraded) });
      }
      if (match.pending) return NextResponse.json({ ok: true, coach: null, pending: true });
      if (match.suspended) return NextResponse.json({ ok: true, coach: null, suspended: true });
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
      const locationIds = cleanLocationIds(body.locationIds ?? [body.locationId]);
      const locationId = locationIds[0] || "";
      if (!name || !/^\d{4}$/.test(pin) || !role || !locationId) {
        return NextResponse.json({ ok: false, error: "Name, role, at least one location and a 4-digit PIN are required." }, { status: 400 });
      }
      if (!SIGNUP_ROLES.includes(role)) {
        return NextResponse.json({ ok: false, error: "Pick Assistant Coach, Volunteer, Head Coach or Social Media." }, { status: 403 });
      }
      if (coaches.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        // Same words whoever holds the name, so this can't be used to find out who is registered.
        return NextResponse.json({ ok: false, error: "Pick a different name (try first and last)." }, { status: 409 });
      }
      if (coaches.filter((c) => c.pending).length >= 25) {
        return NextResponse.json({ ok: false, error: "Too many sign-ups are waiting. Ask your admin to approve them first." }, { status: 429 });
      }
      const id = `coach_${Date.now()}`;
      const coach: StoredCoach = { id, name, pinHash: hashPin(id, pin), role, locationId, locationIds, pending: true };
      await writeRegistry([...coaches, coach]);
      await logActivity({ coachId: coach.id, name: coach.name, action: "signup", detail: `asked to join as ${role} (${locationIds.join(" + ")})` });
      return NextResponse.json({ ok: true, pending: true });
    }

    // ── Change my own PIN ──────────────────────────────────────────────────
    if (action === "changePin") {
      const auth = await requireCoach(req);
      if (!auth.ok) return auth.response;
      const oldPin = String(body.oldPin || "");
      const newPin = String(body.newPin || "");
      if (!pinMatches(auth.coach, oldPin)) {
        return NextResponse.json({ ok: false, error: "That is not your current PIN." }, { status: 403 });
      }
      if (!/^\d{4}$/.test(newPin)) return NextResponse.json({ ok: false, error: "PIN must be 4 digits." }, { status: 400 });
      if (newPin === oldPin) return NextResponse.json({ ok: false, error: "Pick a different PIN than the one you have." }, { status: 400 });
      if (/^(\d)\1{3}$/.test(newPin) || newPin === "1234" || newPin === "4321") {
        return NextResponse.json({ ok: false, error: "That PIN is too easy to guess. Pick another." }, { status: 400 });
      }
      const updatedSelf: StoredCoach = { ...auth.coach, pinHash: hashPin(auth.coach.id, newPin), mustChangePin: false };
      delete updatedSelf.pin;
      await writeRegistry(auth.registry.map((c) => (c.id === auth.coach.id ? updatedSelf : c)));
      await logActivity({ coachId: auth.coach.id, name: auth.coach.name, action: "pin", detail: "changed their own PIN" });
      return NextResponse.json({ ok: true, coach: publicCoach(updatedSelf), token: issueToken(updatedSelf) });
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
      const locationIds = cleanLocationIds(body.locationIds ?? [body.locationId]);
      const locationId = locationIds[0] || "";
      if (!name || !/^\d{4}$/.test(pin) || !role || !locationId) {
        return NextResponse.json({ ok: false, error: "Name, role, at least one location and a 4-digit PIN are required." }, { status: 400 });
      }
      if (coaches.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        return NextResponse.json({ ok: false, error: "A coach with that name already exists." }, { status: 409 });
      }

      if (actorAdd && (!assignableRoles(actorAdd.role).includes(role) || !mayManage(actorAdd, { role, locationId }))) {
        return NextResponse.json({ ok: false, error: actorAdd.role === ROLE_ADMIN ? "Admins can add coaches at their own location, with a coach, volunteer or social media role." : "You can't give that role." }, { status: 403 });
      }

      const newId = `coach_${Date.now()}`;
      // The Creator picked this PIN, so the coach chooses their own at first sign-in (unless this is the very first account).
      const coach: StoredCoach = { id: newId, name, pinHash: hashPin(newId, pin), role, locationId, locationIds, ...(bootstrapping ? {} : { mustChangePin: true }) };
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
      const nextLocationIds = body.locationIds !== undefined ? cleanLocationIds(body.locationIds) : (existing.locationIds ?? [existing.locationId]);
      if (!nextLocationIds.length) return NextResponse.json({ ok: false, error: "Pick at least one location." }, { status: 400 });
      const nextLocation = nextLocationIds[0];
      if (!mayManage(auth.coach, existing)) return forbidden();
      if (pin && !/^\d{4}$/.test(pin)) {
        return NextResponse.json({ ok: false, error: "PIN must be 4 digits." }, { status: 400 });
      }
      if (body.suspended === true && existing.id === auth.coach.id) {
        return NextResponse.json({ ok: false, error: "You can't suspend yourself." }, { status: 409 });
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
        locationIds: nextLocationIds,
        ...(pin ? { pinHash: hashPin(c.id, pin), pin: undefined, mustChangePin: body.forceChange === true } : {}),
        ...(typeof body.suspended === "boolean" ? { suspended: body.suspended } : {}),
        ...(body.approve ? { pending: false } : {}),
      } : c);
      await writeRegistry(updated);
      {
        const what: string[] = [];
        if (body.approve) what.push("approved");
        if (typeof body.suspended === "boolean") what.push(body.suspended ? "suspended" : "restored");
        if (pin) what.push("PIN changed");
        if (body.role) what.push(`role ${nextRole}`);
        await logActivity({ coachId: auth.coach.id, name: auth.coach.name, action: "admin", detail: `${existing.name}: ${what.join(", ") || "edited"}` });
      }

      // Changing your own PIN invalidates your own sign-in, since the PIN is
      // part of the signature — so hand back a fresh one rather than signing
      // the Head Coach out mid-edit.
      const self = updated.find((c) => c.id === auth.coach.id);
      const refreshedToken = self && pinKey(self) !== pinKey(auth.coach) ? issueToken(self) : undefined;

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
      await logActivity({ coachId: auth.coach.id, name: auth.coach.name, action: "admin", detail: `${target.name}: removed` });
      return NextResponse.json({ ok: true, coaches: remaining.map(publicCoach) });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return unavailable(e);
  }
}
