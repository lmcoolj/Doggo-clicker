import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ── Shared event schedule ────────────────────────────────────────────────────
// One timer runs on the server; every client polls this endpoint and stays in
// sync automatically. There are three escalating events; each is rarer than the
// last. The admin panel can also trigger a specific event for everyone.

type EventId = "golden" | "rainbow" | "galaxy";

interface EventState {
  active: boolean;
  event: EventId | null;
  endsAt: number;      // ms epoch; 0 when not active
  nextEventAt: number; // ms epoch for next event start (hint)
}

let state: EventState = {
  active: false,
  event: null,
  endsAt: 0,
  nextEventAt: 0,
};

let endTimer: ReturnType<typeof setTimeout> | null = null;
let nextTimer: ReturnType<typeof setTimeout> | null = null;

const DURATION_MS = 3 * 60 * 1000; // every event lasts 3 minutes

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

function startEvent(event: EventId) {
  if (endTimer) clearTimeout(endTimer);
  state = {
    active: true,
    event,
    endsAt: Date.now() + DURATION_MS,
    nextEventAt: Date.now() + DURATION_MS + 5 * 60 * 1000, // conservative hint
  };
  endTimer = setTimeout(scheduleNext, DURATION_MS);
}

// Kick off on server start
scheduleNext();

// Current event state. `/golden-event` kept as a backward-compatible alias.
router.get("/events", (_req, res) => {
  res.json(state);
});
router.get("/golden-event", (_req, res) => {
  res.json(state);
});

// ── Admin: force-trigger an event immediately for all players ─────────────────
const ADMIN_PASSWORD = "tengir72";

router.post("/admin/trigger-event", (req, res) => {
  const { password, event, checkOnly } = req.body as {
    password?: string;
    event?: string;
    checkOnly?: boolean;
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
