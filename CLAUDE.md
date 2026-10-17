# HuskyHack 2026 - Stop the Scam Before the Money Moves

## Project Overview
Hackathon project for Sound Credit Union's HuskyHack 2026 challenge. Build a fraud intervention tool that recognizes when a member is being manipulated, compromised, or deceived and delivers the right intervention before money is lost.

## Architecture
- **Framework**: React 19 + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Data**: Synthetic event data (7,471 events, 118 members) in `src/data/events.json` and member key in `src/data/members.json`
- **No backend** - this is a clickable prototype/demo

## Demo Structure
Two-panel or tab-switched layout:
1. **Member Side** - What the member sees in mobile/online banking when a hold or friction screen triggers
2. **Employee Side** - What the fraud ops person or branch teller sees: flagged member, signal stack, recommended action/script

## Primary Scenarios
1. **Linda (M1001) - Family Emergency Scam** (PRIMARY PATH) - Authorized scam. Retired teacher, grandparent scam, $8,500 wire attempt. First wire in 6+ years, new destination, urgency. She overrides a hold; next-day cash request stopped. This is the harder regulatory case (authorized payment).
2. **Sarah (M1003) - Account Takeover** (SECONDARY) - Unauthorized/ATO. Fake Sound text, credential phish, password reset → profile change → new recipient → payment. Clearest signal cluster. Sound can stop this outright.

## Key Design Constraints
- Sound can pause wires/ACH/external transfers up to 4 hours
- P2P payments cannot be recalled once sent (pause must happen before submit)
- For authorized payments: Sound can delay and advise, but member decides
- For ATO: Sound can stop the payment
- Trusted contacts: voluntary, revocable, member-directed, informed but never given control
- Must NOT use: device intelligence, biometrics, voice analysis, personal comms, browser history
- Must show: false-positive path with legitimate look-alike member from the 20 in data
- Do not restrict members based on age or demographics

## Judging Criteria
- Impact on Member Safety: 30%
- User Experience & Trust: 25%
- Feasibility: 20%
- Innovation: 15%
- Prototype & Presentation: 10%

## Timeline
- Phase 1 (Sat Oct 17): 2-min elevator pitch + 3-min Q&A
- Phase 2 (Sun Oct 18): 5-min live demo + 3-min Q&A, up to 10 slides, prototype link due

## Data Notes
- Anchor personas: M1001 (Linda), M1002 (Michael), M1003 (Sarah), M1004 (James)
- 20 legitimate look-alike members (is_legitimate_lookalike = "Yes") for false-positive testing
- 50 routine members
- 12 members per scenario type
- All data is synthetic/fictional

## Commands
- `npm run dev` - Start dev server
- `npm run build` - Build for production

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
