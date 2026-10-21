# HuskyHack 2026, University of Washington and Sound Credit Union

## Inspiration
Scammers don't need to break into accounts anymore. They break into people.

The HuskyHack starter kit introduced us to Linda, a retired teacher who gets a panicked call from her "grandson," then a second call from his "attorney." She's told to keep it secret and tries to wire $8,500, her first wire in over six years. We also met Sarah, who clicks a text that looks like it came from Sound, enters her password and one-time code on a fake site, and loses control of her account within minutes.

Two things stood out to us:

Generic warnings don't work. A member under pressure clicks past "Beware of scams" in seconds.
The fraudster often controls the confirmation channel. In Sarah's case, every code Sound sends to the "new" phone goes straight to the attacker.
We wanted to build something that steps in at the exact moment money moves, respects the member's right to decide, and stays invisible to members whose payments are normal.

What it does
Anchor has two modules that share one risk engine and one employee console.

## Module 1: Pause & Reflect (before Send)
When a payment breaks the member's own pattern, Anchor pauses it before it leaves:

Risk tiers based on the member's history. A routine large payment sees no friction. Linda's first wire in six years to a new recipient triggers the full flow.
A critical questionnaire that exposes the scam script: Were you asked to keep this secret? Were you told what to say if Sound asks? Have you called your grandson on a number you already had?
A "Check my risk score" button that calls our backend and returns an explainable 0–100 score with plain-language reasons.
A trusted-contact alert sent before Send to family or beneficiaries the member chose to enroll. Contacts are informed, never given control.
An employee callback inside the 4-hour hold, with a suggested non-judgmental script.
The member always makes the final decision on their own payment.

## Module 2: Takeover Lockdown (after a takeover is confirmed)
Once Sound confirms an account takeover, Anchor runs a five-step lockdown:

- Delink digital access from every money action (sending, adding recipients, opening accounts).
- Contain by cancelling pending payments, revoking sessions and reverting contact changes.
- Re-verify identity through channels the fraudster doesn't control: a branch visit with photo ID or a callback to the pre-change phone number.
- Migrate the member's funds to a brand-new account, redirecting payroll and autopays.
- Demolish the compromised account so it can never move money again, then request wire recalls and ACH returns.

## How we built it
- Member app and employee console: Next.js and TypeScript, covering the transfer screen, questionnaire, risk result, trusted-contact alert and migration status screen.
- Backend: a .NET API exposing POST /v1/risk/score and POST /v1/alerts/trusted-contacts, with PostgreSQL for cases and the audit log.
- AI: Azure OpenAI classifies the member's free-text answers into known scam typologies.
- Data: the HuskyHack synthetic events file and Member Key, used to replay each journey and to test triggers against the legitimate look-alike members.


<img width="550" height="500" alt="image" src="https://github.com/user-attachments/assets/ffbb5701-82f1-4c8e-873b-6c81ba805336" />


## Challenges we ran into
- Friction versus safety. We had to stop scams while keeping legitimate payments easy. Scoring against each member's own history means friction appears only when a payment truly breaks their pattern.
- Autonomy. For a member's own payment, Sound can pause and advise but can't block. Every screen keeps the final say with the member, and "Send anyway" leads to a human conversation instead of a dead end.
- The compromised confirmation channel. In a takeover, codes sent to the new phone or email reach the fraudster. We built verification around the contact details from before the change, plus in-person verification.
- Trusted contacts can be part of the problem. Contacts receive only a minimal notice, and the alert is suppressed for employee review if a contact is linked to the recipient.
Staying within realistic data. We left out device intelligence, voice analysis and access to members' messages, and built only on data a credit union already has.


## What we learned
- A risk score isn't a solution. The value is in the next best action: the right question, the right person to alert, the right moment to pause.
- Good scam prevention is mostly UX. The questions that work are specific, non-judgmental and written for someone who is scared and in a hurry.
- Speed matters most after prevention fails. Wire recalls and ACH returns get less likely every hour, so recovery has to start the moment a takeover is confirmed.
- Designing for false positives is designing for trust. The synthetic data has far more scam victims than real life, so every trigger needed a fast, respectful way through for legitimate members.
