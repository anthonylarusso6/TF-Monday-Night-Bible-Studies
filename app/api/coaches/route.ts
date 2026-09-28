import { NextRequest, NextResponse } from "next/server";
import {
  readRegistry, writeRegistry, publicCoach, issueToken, requireCoach,
  lockedFor, recordFailure, clearFailures, HEAD_COACH, StoredCoach,
} from "@/lib/auth";

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

export async function GET() {
  try {
    const coaches = await readRegistry();
    return NextResponse.json({ ok: true, coaches: coaches.map(publicCoach) });
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
      return NextResponse.json({ ok: true, coach: publicCoach(match), token: issueToken(match) });
    }

    // ── Add ────────────────────────────────────────────────────────────────
    if (action === "add") {
      const coaches = await readRegistry();
      const bootstrapping = coaches.length === 0;

      if (!bootstrapping) {
        const auth = await requireCoach(req, { roles: [HEAD_COACH] });
        if (!auth.ok) return auth.response;
      }

      const name = String(body.name || "").trim();
      const pin = String(body.pin || "");
      // The first account must be able to manage the rest, whatever was picked.
      const role = bootstrapping ? HEAD_COACH : String(body.role || "");
      const locationId = String(body.locationId || "");
      if (!name || !/^\d{4}$/.test(pin) || !role || !locationId) {
        return NextResponse.json({ ok: false, error: "Name, role, location and a 4-digit PIN are required." }, { status: 400 });
      }
      if (coaches.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        return NextResponse.json({ ok: false, error: "A coach with that name already exists." }, { status: 409 });
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

    // Everything below needs a Head Coach.
    const auth = await requireCoach(req, { roles: [HEAD_COACH] });
    if (!auth.ok) return auth.response;
    const coaches = auth.registry;
    const headCount = coaches.filter((c) => c.role === HEAD_COACH).length;

    // ── Update ─────────────────────────────────────────────────────────────
    if (action === "update") {
      const id = String(body.id || "");
      const existing = coaches.find((c) => c.id === id);
      if (!existing) return NextResponse.json({ ok: false, error: "Coach not found." }, { status: 404 });

      const pin = body.pin ? String(body.pin) : "";
      if (pin && !/^\d{4}$/.test(pin)) {
        return NextResponse.json({ ok: false, error: "PIN must be 4 digits." }, { status: 400 });
      }
      const nextRole = body.role ? String(body.role) : existing.role;
      if (existing.role === HEAD_COACH && nextRole !== HEAD_COACH && headCount <= 1) {
        return NextResponse.json(
          { ok: false, error: "There has to be at least one Head Coach, or nobody could manage coaches." },
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
        locationId: body.locationId ? String(body.locationId) : c.locationId,
        ...(pin ? { pin } : {}),
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
      if (target.role === HEAD_COACH && headCount <= 1) {
        return NextResponse.json({ ok: false, error: "There has to be at least one Head Coach." }, { status: 409 });
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
