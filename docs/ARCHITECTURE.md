# Anchor demo architecture

## Flow

```
Send Money ──► POST /api/risk/precheck ──► LOW ───────────────► sent, no friction
                                      └─► MEDIUM ─► short check (purpose, pressure, independent call)
                                      └─► HIGH ───► full Pause & Reflect questionnaire
                                                          │
                                                          ▼
                                         POST /api/risk/score
                                           pattern model (member history)
                                         + answer rules (red flags, contradictions)
                                         + AI narrative check (Azure OpenAI / OpenAI)
                                         = 0–100 score, tier, typology, reason codes
                                           │  stored in risk_assessments
                                           └─ HIGH → auto-alert opted-in trusted contacts
                                                          │
                                                          ▼
                                 Risk Result page: score, reasons, "Alert my trusted
                                 contacts" (POST /api/alerts/trusted-contacts),
                                 decision (PATCH /api/risk/assessments/:id/decision)
```

Score = 100 · σ(6 · (0.35·P + 0.45·A + 0.20·N) − 3). HIGH ≥ 70, MEDIUM ≥ 40.

### Account takeover (Sarah, M1003)

A fraud specialist reviews the signal cluster in the Fraud Console and confirms the takeover
(`POST /api/ato/lockdowns`). Steps 1–2 run at once: **delink** every digital money action and
**contain** (stop pending payments, sign out sessions, revert email and phone). After
**re-verification** by callback to the pre-change phone or a branch visit with photo ID
(`POST /api/ato/lockdowns/:id/reverify`), Anchor **migrates** the balance to a new account and
**demolishes** the old one, requesting recalls for anything already sent. Sarah sees an
"account protected" screen throughout, and Send Money is paused until she's re-verified.

See `docs/diagrams.md` for all flows.

## Layout

```
client/src/
  App.tsx                      flow orchestration + demo member switcher
  lib/payment.ts               builds risk signals from the member's history; demo presets
  lib/api.ts                   typed calls to the server
  components/SendMoney.tsx     payment form → precheck
  components/FraudQuestionnaire.tsx   full (HIGH) or short (MEDIUM) question flow
  components/RiskResult.tsx    risk classifier result, trusted-contact alert, decision
  components/TrustedContact.tsx       enrollment, persisted in Supabase
  lib/ato.ts                   takeover signals, pending and sent payments from history
  components/TakeoverConsole.tsx      employee: confirm takeover, re-verify, watch steps
  components/AccountProtected.tsx     member: plain-language lockdown status

server/src/
  index.ts                     app + existing member/event endpoints
  types.ts                     PaymentSignals, Answers, Reason
  lib/supabase.ts              service-role client
  risk/pattern.ts              history-based pattern score + precheck tier
  risk/answers.ts              questionnaire red flags + contradictions
  risk/ai.ts                   LLM typology + scam probability (falls back to rules-only)
  risk/score.ts                combines the three into the final score
  alerts/notify.ts             trusted-contact alerts (Twilio SMS or simulated)
  ato/lockdown.ts              delink → contain → reverify → migrate → demolish
  routes/risk.ts | alerts.ts | trustedContacts.ts | ato.ts

supabase/migrations/20261017000000_anchor_risk_and_alerts.sql
  trusted_contacts, risk_assessments, contact_alerts (RLS on, server-only access)
supabase/migrations/20261017010000_anchor_takeover_lockdown.sql
  account_lockdowns, lockdown_steps
```

## API

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/risk/precheck` | Tier a payment from history alone |
| POST | `/api/risk/score` | Full AI-assisted score; auto-alerts on HIGH |
| PATCH | `/api/risk/assessments/:id/decision` | Record talk / wait / cancel / send |
| POST | `/api/alerts/trusted-contacts` | Manual alert before Send |
| GET / POST | `/api/members/:id/trusted-contacts` | List / enroll |
| DELETE | `/api/trusted-contacts/:contactId` | Revoke (kept for audit) |
| POST | `/api/ato/lockdowns` | Confirm takeover: delink + contain |
| POST | `/api/ato/lockdowns/:id/reverify` | Re-verify, then migrate + demolish |
| GET | `/api/ato/lockdowns/:id` · `/api/members/:id/lockdown` | Lockdown status |

## Guardrails built in

- Member always decides on their own payment; "Send anyway" routes HIGH to a specialist call.
- Trusted contacts get a minimal notice (no amount, recipient or balance) and no control.
- A contact whose name matches the recipient is suppressed and left for employee review.
- Only kit-allowed signals: amount, rail, recipient, balance, profile/password events.

## Setup

1. Run both migrations in the Supabase SQL editor, in filename order (or `supabase db push`).
2. `cp server/.env.example server/.env` and fill in `SUPABASE_SERVICE_ROLE_KEY`, plus an AI key and Twilio if you want them.
3. `cp client/.env.example client/.env` (the anon key is only needed if the client queries Supabase directly).
4. `npm run dev:all`. The client proxies `/api` to `localhost:3001`.

Demo: switch between **Linda (M1001)** (scores ~92, HIGH) and **Alex (M1057)**, the legitimate home-closing look-alike (scores ~21, LOW), then use "Fill demo payment". For the takeover, switch to **Sarah (M1003)**, open
**Fraud Console**, confirm the takeover, then re-verify; check her Dashboard between steps.
