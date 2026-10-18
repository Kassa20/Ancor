import type { Answers, Reason } from "../types.js";

const yes = (v: string) => v === "yes";
const no = (v: string) => v === "no";
const RISKY_PURPOSE = new Set(["family-emergency", "legal-fees", "investment"]);

/** Answer score (0–1): weighted red-flag answers plus a penalty for contradictions. */
export function scoreAnswers(a: Answers): { score: number; reasons: Reason[] } {
  const reasons: Reason[] = [];
  let points = 0;
  const flag = (cond: boolean, pts: number, code: string, label: string) => {
    if (!cond) return;
    points += pts;
    reasons.push({ code, label, source: "answers" });
  };

  flag(yes(a.keepPrivate), 22, "SECRECY_REQUEST", "Asked to keep it secret, the most common sign of this scam");
  flag(yes(a.toldWhatToSay), 22, "COACHED_ANSWERS", "Told what to say to Sound");
  flag(yes(a.actQuickly), 12, "URGENCY", "Pressured to act quickly");
  flag(a.contactType === "someone-else", 14, "THIRD_PARTY_PAYEE", "Someone else is asking for the money on a relative's behalf");
  flag(no(a.calledDirectly), 12, "NOT_INDEPENDENTLY_VERIFIED", "Not verified on a number you already had");
  flag(yes(a.storyChanged), 10, "STORY_CHANGED", "The story changed since the first contact");
  flag(no(a.metInPerson), 6, "NEVER_MET_RECIPIENT", "You haven't met the recipient in person");
  flag(a.howContacted === "phone" || a.howContacted === "text" || a.howContacted === "social", 4, "UNSOLICITED_CONTACT", "They contacted you first by phone, text or social media");
  flag(RISKY_PURPOSE.has(a.purpose), 6, "HIGH_RISK_PURPOSE", "Payment purpose matches common scam stories");

  // Contradiction: says they've met the person, yet a stranger reached out by phone about an emergency.
  flag(
    yes(a.metInPerson) && a.contactType === "someone-else" && (a.purpose === "family-emergency" || a.purpose === "legal-fees"),
    10,
    "CONTRADICTORY_ANSWERS",
    "Answers contradict each other",
  );

  return { score: Math.min(points, 100) / 100, reasons };
}
