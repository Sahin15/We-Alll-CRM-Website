---
Purpose: Official Production Hardening (P0) roadmap for Payroll V2.
Status: Active — blocks all new feature work until go-live gates are green
Branch: develop
Last Updated: 2026-07-27
---

# Payroll V2 — Production Hardening (P0)

## Mandate

The Production Readiness Audit returned **NO GO** (score **58/100**).

Until the Go-Live Gate in this folder is fully green:

- **No** new Payroll features (no R7b / R8b / R9b / YTD product work / future roadmap items)
- **No** enabling `PAYROLL_V2_ENGINE=true` in staging or production
- **Only** production hardening work tracked here

## Documents

| File | Role |
|------|------|
| [README.md](./README.md) | This index + phase rules |
| [P0_BLOCKERS.md](./P0_BLOCKERS.md) | Tracked blockers (full work items) |
| [IMPLEMENTATION_ORDER.md](./IMPLEMENTATION_ORDER.md) | PH-01 … PH-12 sequence |
| [VERIFICATION_CHECKLIST.md](./VERIFICATION_CHECKLIST.md) | Per-blocker acceptance, tests, rollback |
| [ROLLBACK_STRATEGY.md](./ROLLBACK_STRATEGY.md) | Flag / deploy / data rollback |
| [TEST_PLAN.md](./TEST_PLAN.md) | Hardening test strategy |
| [GO_LIVE_GATE.md](./GO_LIVE_GATE.md) | Final enablement gate |

## Upstream audit

- `../PRODUCTION_READINESS_REPORT.md`
- `../RISK_REGISTER.md`
- `../KNOWN_LIMITATIONS.md`
- `../GO_LIVE_CHECKLIST.md`

## Phase rules

1. Work only from **`develop`**.
2. One PH item (or tightly coupled pair) per PR where possible.
3. Keep `PAYROLL_V2_ENGINE=false` until **GO_LIVE_GATE** is complete.
4. Do not start PH-12 (production cutover) until PH-01–PH-11 are done and signed.
5. Update `docs/ACTIVE_DEVELOPMENT.md` when the active PH item changes.

## Success definition

Payroll V2 is safe to enable for real pay when every item on `GO_LIVE_GATE.md` is green and Finance + CTO have signed.
