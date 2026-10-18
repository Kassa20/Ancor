import type { Answers, PaymentSignals, Reason, Tier } from "../types.js";
import { scorePattern } from "./pattern.js";
import { scoreAnswers } from "./answers.js";
import { analyzeNarrative } from "./ai.js";

const WEIGHTS = { pattern: 0.35, answers: 0.45, ai: 0.2 };

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export interface RiskResult {
  score: number; // 0–100
  tier: Tier;
  typology: string;
  rationale: string;
  reasons: Reason[];
  actions: string[];
  components: { pattern: number; answers: number; ai: number };
  aiUsed: boolean;
}

export function tierFor(score: number): Tier {
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

/** Score = 100 · σ(6·(wP·P + wA·A + wN·N) − 3), each component in 0–1. */
export async function scoreTransaction(payment: PaymentSignals, answers: Answers): Promise<RiskResult> {
  const pattern = scorePattern(payment);
  const ans = scoreAnswers(answers);
  const ai = await analyzeNarrative(payment, answers, ans.score);

  const blended = WEIGHTS.pattern * pattern.score + WEIGHTS.answers * ans.score + WEIGHTS.ai * ai.score;
  const score = Math.round(100 * sigmoid(6 * blended - 3));
  const tier = tierFor(score);

  const actions =
    tier === "HIGH"
      ? ["ALERT_TRUSTED_CONTACTS", "EMPLOYEE_CALLBACK", "HOLD_UP_TO_4H"]
      : tier === "MEDIUM"
        ? ["SUGGEST_VERIFICATION", "OFFER_EMPLOYEE_CALL"]
        : ["RELEASE"];

  return {
    score,
    tier,
    typology: ai.typology,
    rationale: ai.rationale,
    reasons: [...ans.reasons, ...pattern.reasons, ...ai.reasons],
    actions,
    components: {
      pattern: round2(pattern.score),
      answers: round2(ans.score),
      ai: round2(ai.score),
    },
    aiUsed: ai.used,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
