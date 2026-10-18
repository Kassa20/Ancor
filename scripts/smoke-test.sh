#!/usr/bin/env bash
# Quick check that the API is running and scoring. Run while ./scripts/start.sh is up.
set -euo pipefail
API=${API:-http://localhost:3001}
PAYMENT='{"rail":"Wire","amount":8500,"recipientName":"Robert Hale, Esq.","recipientIsNew":true,"daysSinceLastSameRail":2410,"amountToBaselineRatio":4.78,"availableBalance":47494.18,"recentPasswordReset":false,"recentProfileChange":false}'

echo "Precheck (expect HIGH):"
curl -s -X POST "$API/api/risk/precheck" -H 'Content-Type: application/json' -d "{\"payment\":$PAYMENT}"
echo; echo
echo "Score (expect ~90+, HIGH):"
curl -s -X POST "$API/api/risk/score" -H 'Content-Type: application/json' -d "{
  \"memberId\":\"M1001\",\"memberFirstName\":\"Linda\",\"payment\":$PAYMENT,
  \"answers\":{\"purpose\":\"legal-fees\",\"contactType\":\"someone-else\",\"metInPerson\":\"no\",\"howContacted\":\"phone\",
  \"actQuickly\":\"yes\",\"keepPrivate\":\"yes\",\"toldWhatToSay\":\"yes\",\"storyChanged\":\"no\",\"calledDirectly\":\"no\",
  \"relationship\":\"professional\",\"sentBefore\":\"no\",\"moneySetAside\":\"yes\",\"impactIfLost\":\"severe\",\"hasPlan\":\"no\",
  \"freeText\":\"Lawyer says my grandson needs bail tonight\"}}"
echo; echo
echo "Trusted contacts for M1001 (expect [] or a list; an error means the migration hasn't run):"
curl -s "$API/api/members/M1001/trusted-contacts"
echo
