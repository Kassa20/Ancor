import { Router } from "express";
import {
  getLatestLockdownForMember,
  getLockdown,
  reverifyAndMigrate,
  startLockdown,
  type ReverifyMethod,
  type StartLockdownInput,
} from "../ato/lockdown.js";

export const atoRouter = Router();

/** Fraud specialist confirms a takeover: delink and contain run immediately. */
atoRouter.post("/ato/lockdowns", async (req, res) => {
  const body = req.body as Partial<StartLockdownInput>;
  if (!body.memberId || !body.confirmedBy) {
    res.status(400).json({ error: "memberId and confirmedBy are required" });
    return;
  }
  try {
    const lockdown = await startLockdown({
      memberId: body.memberId,
      confirmedBy: body.confirmedBy,
      signals: body.signals ?? [],
      pendingPayments: body.pendingPayments ?? [],
      completedUnauthorized: body.completedUnauthorized ?? [],
      balance: body.balance ?? 0,
    });
    res.status(201).json(lockdown);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/** Identity re-verified through a channel the fraudster doesn't control: migrate and demolish. */
atoRouter.post("/ato/lockdowns/:id/reverify", async (req, res) => {
  const method = req.body.method as ReverifyMethod;
  if (method !== "branch_photo_id" && method !== "pre_change_callback") {
    res.status(400).json({ error: "method must be branch_photo_id or pre_change_callback" });
    return;
  }
  try {
    res.json(await reverifyAndMigrate(req.params.id, method));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

atoRouter.get("/ato/lockdowns/:id", async (req, res) => {
  try {
    res.json(await getLockdown(req.params.id));
  } catch (err) {
    res.status(404).json({ error: (err as Error).message });
  }
});

/** Latest lockdown for a member, or null. Drives the member's "account protected" screen. */
atoRouter.get("/members/:id/lockdown", async (req, res) => {
  try {
    res.json(await getLatestLockdownForMember(req.params.id));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
