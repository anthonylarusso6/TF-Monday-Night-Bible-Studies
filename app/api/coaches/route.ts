import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Coach registry. Every operation runs here rather than in the browser so the
 * PIN list is never sent to a device: a coach's PIN used to be readable by
 * anyone who opened the network tab, which let a student sign in as staff.
 */

const REGISTRY_ID = "_coaches";

export const dynamic = "force-dynamic";

interface Coach {
  id: string;
  name: string;
  pin: string;
  role: string;
  locationId: string;
}

/** What the browser is allowed to see — everything except the PIN. */
type PublicCoach = Omit<Coach, "pin">;
const strip = ({ pin, ...rest }: Coach): PublicCoach => { void pin; return rest; };

async function readRegistry(): Promise<Coach[]> {
  const { data, error } = await supabaseServer
    .from("user_data").select("notes").eq("id", REGISTRY_ID).single();
  // PGRST116 = no row yet, which genuinely means no coaches are registered.
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  const notes = (data?.notes ?? null) as Record<string, string> | null;
  return notes?.list ? JSON.parse(notes.list) : [];
}

async function writeRegistry(coaches: Coach[]): Promise<void> {
  const { error } = await supabaseServer.from("user_data").upsert({
    id: REGISTRY_ID,
    notes: { list: JSON.stringify(coaches) },
    liked: {}, attendance: {}, drafts: [],
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function GET() {
  try {
    const coaches = await readRegistry();
    return NextResponse.json({ ok: true, coaches: coaches.map(strip) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Registry unavailable" },
      { status: 503 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 }); }

  const action = String(body.action || "");

  try {
    const coaches = await readRegistry();

    if (action === "verify") {
      const name = String(body.name || "").trim().toLowerCase();
      const pin = String(body.pin || "");
      const match = coaches.find((c) => c.name.toLowerCase() === name && c.pin === pin);
      // Deliberately identical response shape whether the name or the PIN was
      // wrong, so this can't be used to enumerate who is registered.
      if (!match) return NextResponse.json({ ok: true, coach: null });
      return NextResponse.json({ ok: true, coach: strip(match) });
    }

    if (action === "add") {
      const name = String(body.name || "").trim();
      const pin = String(body.pin || "");
      const role = String(body.role || "");
      const locationId = String(body.locationId || "");
      if (!name || !/^\d{4}$/.test(pin) || !role || !locationId) {
        return NextResponse.json({ ok: false, error: "Name, role, location and a 4-digit PIN are required." }, { status: 400 });
      }
      if (coaches.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        return NextResponse.json({ ok: false, error: "A coach with that name already exists." }, { status: 409 });
      }
      const coach: Coach = { id: `coach_${Date.now()}`, name, pin, role, locationId };
      await writeRegistry([...coaches, coach]);
      return NextResponse.json({ ok: true, coach: strip(coach) });
    }

    if (action === "update") {
      const id = String(body.id || "");
      const existing = coaches.find((c) => c.id === id);
      if (!existing) return NextResponse.json({ ok: false, error: "Coach not found." }, { status: 404 });
      const pin = body.pin ? String(body.pin) : "";
      if (pin && !/^\d{4}$/.test(pin)) {
        return NextResponse.json({ ok: false, error: "PIN must be 4 digits." }, { status: 400 });
      }
      // Re-read happened above, so a coach added from another device is kept.
      const updated = coaches.map((c) => c.id === id ? {
        ...c,
        name: body.name ? String(body.name).trim() : c.name,
        role: body.role ? String(body.role) : c.role,
        locationId: body.locationId ? String(body.locationId) : c.locationId,
        ...(pin ? { pin } : {}),
      } : c);
      await writeRegistry(updated);
      return NextResponse.json({ ok: true, coaches: updated.map(strip) });
    }

    if (action === "remove") {
      const id = String(body.id || "");
      const remaining = coaches.filter((c) => c.id !== id);
      if (remaining.length === coaches.length) {
        return NextResponse.json({ ok: false, error: "Coach not found." }, { status: 404 });
      }
      await writeRegistry(remaining);
      return NextResponse.json({ ok: true, coaches: remaining.map(strip) });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Registry unavailable" },
      { status: 503 }
    );
  }
}
