import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { scorePattern, precheckTier } from "../risk/pattern.js";
import { scoreTransaction } from "../risk/score.js";
import { alertTrustedContacts, type AlertDelivery } from "../alerts/notify.js";
import type { Answers, PaymentSignals } from "../types.js";

export const riskRouter = Router();

/** Tier the payment before asking any questions. LOW sends with no friction. */
riskRouter.post("/precheck", (req, res) => {
  const payment = req.body.payment as PaymentSignals | undefined;
  if (!payment || typeof payment.amount !== "number") {
    res.status(400).json({ error: "payment is required" });
    return;
  }
  const pattern = scorePattern(payment);
  res.json({ tier: precheckTier(pattern.score), patternScore: pattern.score, reasons: pattern.reasons });
});

/**
 * Full score after the questionnaire. Stores the assessment and, on HIGH,
 * alerts trusted contacts who opted in to automatic alerts — before Send.
 */
riskRouter.post("/score", async (req, res) => {
  const { memberId, memberFirstName, payment, answers } = req.body as {
    memberId?: string;
    memberFirstName?: string;
    payment?: PaymentSignals;
    answers?: Answers;
  };
  if (!memberId || !payment || !answers) {
    res.status(400).json({ error: "memberId, payment and answers are required" });
    return;
  }

  const result = await scoreTransaction(payment, answers);

  // Persistence is best-effort so a database hiccup never blocks the member.
  const { data: row, error } = await supabase
    .from("risk_assessments")
    .insert({
      member_id: memberId,
      payment,
      answers,
      pattern_score: result.components.pattern,
      answer_score: result.components.answers,
      ai_score: result.components.ai,
      score: result.score,
      tier: result.tier,
      typology: result.typology,
      reasons: result.reasons,
      actions: result.actions,
      ai_used: result.aiUsed,
    })
    .select("id")
    .single();
  if (error) console.error("Failed to store risk assessment:", error.message);
  const assessmentId: string | null = row?.id ?? null;

  let alerts: AlertDelivery[] = [];
  if (result.tier === "HIGH") {
    try {
      alerts = await alertTrustedContacts({
        memberId,
        memberFirstName: memberFirstName || "A Sound member",
        assessmentId,
        recipientName: payment.recipientName,
        trigger: "auto",
        onlyAutoAlert: true,
      });
    } catch (err) {
      console.error("Auto alert failed:", err);
    }
  }

  res.json({ assessmentId, ...result, alerts });
});

/** Record the member's final decision. The member always decides on their own payment. */
riskRouter.patch("/assessments/:id/decision", async (req, res) => {
  const decision = req.body.decision as string;
  if (!["talk", "wait", "cancel", "send"].includes(decision)) {
    res.status(400).json({ error: "decision must be talk, wait, cancel or send" });
    return;
  }
  const { error } = await supabase
    .from("risk_assessments")
    .update({ decision, decided_at: new Date().toISOString() })
    .eq("id", req.params.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});
