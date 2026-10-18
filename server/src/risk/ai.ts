import type { Answers, PaymentSignals, Reason } from "../types.js";

export interface AiResult {
  score: number; // 0–1 likelihood this is a scam
  typology: string;
  rationale: string;
  reasons: Reason[];
  used: boolean; // false when no AI provider is configured or the call failed
}

const TYPOLOGIES = [
  "FAMILY_EMERGENCY",
  "ROMANCE_INVESTMENT",
  "IMPERSONATION",
  "GOVERNMENT_TECH_SUPPORT",
  "LEGITIMATE",
  "UNCLEAR",
] as const;

const SYSTEM_PROMPT = `You are a fraud analyst at a credit union. You review one outgoing payment the member is about to send, plus their answers to a short scam-screening questionnaire.
Classify the most likely situation and estimate the probability it is a scam.
Rules:
- Use only the information provided. Do not infer age, ethnicity or other demographics.
- Legitimate large payments (home closings, car purchases, helping real family the member verified) are common. Do not over-flag.
- Secrecy, coaching on what to tell the bank, third parties collecting money for a relative, and urgency are strong scam signals.
Respond with JSON only:
{"typology": one of ${TYPOLOGIES.join(", ")}, "scamProbability": number 0-1, "rationale": one plain-language sentence for the member, "signals": [up to 3 short phrases]}`;

function buildUserPrompt(p: PaymentSignals, a: Answers): string {
  return JSON.stringify({
    payment: {
      rail: p.rail,
      amount: p.amount,
      recipientIsNew: p.recipientIsNew,
      daysSinceLastSameRail: p.daysSinceLastSameRail,
      amountToBaselineRatio: p.amountToBaselineRatio,
    },
    answers: a,
  });
}

/** Calls Azure OpenAI if configured, else OpenAI, else returns a non-AI fallback. */
async function callModel(userPrompt: string): Promise<string | null> {
  const body = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  };
  const signal = AbortSignal.timeout(8000);

  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azureKey = process.env.AZURE_OPENAI_API_KEY;
  const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  if (azureEndpoint && azureKey && azureDeployment) {
    const version = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
    const url = `${azureEndpoint.replace(/\/$/, "")}/openai/deployments/${azureDeployment}/chat/completions?api-version=${version}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": azureKey },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) throw new Error(`Azure OpenAI ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return json.choices[0]?.message.content ?? null;
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ ...body, model: process.env.OPENAI_MODEL || "gpt-4o-mini" }),
      signal,
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return json.choices[0]?.message.content ?? null;
  }

  return null;
}

/** Fallback when no model is available: mirror the answer score so the demo still works. */
function fallback(answerScore: number, a: Answers): AiResult {
  const familyStory = a.purpose === "family-emergency" || a.purpose === "legal-fees";
  return {
    score: answerScore,
    typology: answerScore >= 0.4 ? (familyStory ? "FAMILY_EMERGENCY" : "UNCLEAR") : "LEGITIMATE",
    rationale:
      answerScore >= 0.4
        ? "Your answers match patterns we often see in scams."
        : "Your answers don't show the usual warning signs.",
    reasons: [],
    used: false,
  };
}

export async function analyzeNarrative(p: PaymentSignals, a: Answers, answerScore: number): Promise<AiResult> {
  try {
    const content = await callModel(buildUserPrompt(p, a));
    if (!content) return fallback(answerScore, a);
    const parsed = JSON.parse(content) as {
      typology?: string;
      scamProbability?: number;
      rationale?: string;
      signals?: string[];
    };
    const typology = TYPOLOGIES.includes(parsed.typology as (typeof TYPOLOGIES)[number]) ? parsed.typology! : "UNCLEAR";
    const score = Math.max(0, Math.min(1, Number(parsed.scamProbability) || 0));
    return {
      score,
      typology,
      rationale: parsed.rationale || "",
      reasons: (parsed.signals || []).slice(0, 3).map((s) => ({ code: "AI_SIGNAL", label: s, source: "ai" as const })),
      used: true,
    };
  } catch (err) {
    console.error("AI narrative check failed, using fallback:", err);
    return fallback(answerScore, a);
  }
}
