import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ── Shared event schedule ────────────────────────────────────────────────────
// One timer running on the server; all clients poll this endpoint and stay in
// sync automatically. This is the original Golden Hour mechanism, generalized to
// carry which event is active (golden / rainbow / galaxy). The endpoints are
// unchanged so the client contract stays exactly the same.

type EventId = "golden" | "rainbow" | "galaxy";

interface EventState {
  active: boolean;
  event: EventId | null; // which event is running; null when inactive
  endsAt: number;        // ms epoch; 0 when not active
  nextEventAt: number;   // ms epoch for next event start
}

let state: EventState = {
  active: false,
  event: null,
  endsAt: 0,
  nextEventAt: 0,
};

let endTimer: ReturnType<typeof setTimeout> | null = null;
let nextTimer: ReturnType<typeof setTimeout> | null = null;

// Weighted random pick — golden common, rainbow less so, galaxy rare.
function pickEvent(): EventId {
  const r = Math.random();
  if (r < 0.6) return "golden";
  if (r < 0.9) return "rainbow";
  return "galaxy";
}

function scheduleNext() {
  if (nextTimer) clearTimeout(nextTimer);
  // Random gap: 5 – 20 minutes between events
  const delayMs = (5 * 60 + Math.random() * 15 * 60) * 1000;
  state = { active: false, event: null, endsAt: 0, nextEventAt: Date.now() + delayMs };
  nextTimer = setTimeout(() => startEvent(pickEvent()), delayMs);
}

function startEvent(event: EventId = "golden") {
  if (endTimer) clearTimeout(endTimer);
  const durationMs = 3 * 60 * 1000; // 3 minutes
  state = {
    active: true,
    event,
    endsAt: Date.now() + durationMs,
    nextEventAt: Date.now() + durationMs + 5 * 60 * 1000, // conservative hint
  };
  endTimer = setTimeout(scheduleNext, durationMs);
}

// Kick off on server start
scheduleNext();

router.get("/golden-event", (_req, res) => {
  res.json(state);
});

// ── Admin: force-trigger an event immediately for all players ──────────────────
const ADMIN_PASSWORD = "tengir72";

router.post("/admin/trigger-golden-event", (req, res) => {
  const { password, checkOnly, event } = req.body as {
    password?: string;
    checkOnly?: boolean;
    event?: string;
  };
  if (password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (checkOnly) {
    // Password-validation only — no side effects
    res.json({ ok: true });
    return;
  }
  const ev: EventId = event === "rainbow" || event === "galaxy" ? event : "golden";
  startEvent(ev);
  res.json({ ok: true, state });
});

export default router;
