import { Router } from "express";
import { alertTrustedContacts } from "../alerts/notify.js";

export const alertsRouter = Router();

/** Manual "Alert my trusted contacts" button, available at any tier before Send. */
alertsRouter.post("/trusted-contacts", async (req, res) => {
  const { memberId, memberFirstName, assessmentId, recipientName } = req.body as {
    memberId?: string;
    memberFirstName?: string;
    assessmentId?: string | null;
    recipientName?: string;
  };
  if (!memberId) {
    res.status(400).json({ error: "memberId is required" });
    return;
  }
  try {
    const alerts = await alertTrustedContacts({
      memberId,
      memberFirstName: memberFirstName || "A Sound member",
      assessmentId: assessmentId ?? null,
      recipientName: recipientName || "",
      trigger: "manual",
      onlyAutoAlert: false,
    });
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});
