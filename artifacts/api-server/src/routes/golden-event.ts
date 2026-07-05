import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ── Shared Golden Hour schedule ──────────────────────────────────────────────
// One timer running on the server; all clients poll this endpoint and stay
// in sync automatically.

interface GoldenEventState {
  active: boolean;
  endsAt: number;      // ms epoch; 0 when not active
  nextEventAt: number; // ms epoch for next event start
}

let state: GoldenEventState = {
  active: false,
  endsAt: 0,
  nextEventAt: 0,
};

let endTimer: ReturnType<typeof setTimeout> | null = null;
let nextTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleNext() {
  if (nextTimer) clearTimeout(nextTimer);
  // Random gap: 5 – 20 minutes between events
  const delayMs = (5 * 60 + Math.random() * 15 * 60) * 1000;
  state = { active: false, endsAt: 0, nextEventAt: Date.now() + delayMs };
  nextTimer = setTimeout(startEvent, delayMs);
}

function startEvent() {
  if (endTimer) clearTimeout(endTimer);
  const durationMs = 3 * 60 * 1000; // 3 minutes
  state = {
    active: true,
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

export default router;
