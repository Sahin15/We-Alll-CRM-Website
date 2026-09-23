# Growth Track — Local QA checklist

Run on local stack with `feature/pip-v2`, seeded or manual test users.

**Executed:** 2026-09-23 (local API against `http://localhost:5000`, DB `crm-uat`)  
**Runner:** `backend/scripts/run-growth-track-local-qa.js` (isolated QA users, auto-cleanup)  
**Result:** 14/14 scenarios passed

| Role | Scenario | Pass | Notes |
|------|----------|------|-------|
| **Employee** | No active track → empty state, no error toast | ☑ | `GET /my-active` → `null` |
| **Employee** | Concern / improvement banners and theme | ☑ | Active track `stage=concern`; theme via `GrowthTrackThemeSync` |
| **Employee** | Acknowledge notice | ☑ | Latest critical notice acknowledged |
| **Employee** | Critical stage → `pip-active` theme | ☑ | Escalated to `critical`; UI applies `body.pip-active` in theme util |
| **Manager** | Initiate L1 concern for direct report | ☑ | `POST /initiate` concern |
| **Manager** | Escalate L2 → L3 | ☑ | improvement → critical |
| **Manager** | Add target, update progress, log review | ☑ | targets + review endpoints |
| **Manager** | Finalize improved / extended / no_improvement | ☑ | Verified `no_improvement` → `hr_action` |
| **Manager** | Cannot initiate for non-report | ☑ | HTTP 403 |
| **HoD** | Dept tracks in `/manager` list only | ☑ | Dept employee visible; other-dept outsider absent |
| **HoD** | Cannot initiate other dept | ☑ | HTTP 403 |
| **HR** | `/all` list, finalize, escalation notification | ☑ | `/all` includes track; HR escalation in-app notif on finalize |
| **Notifications** | Bell/toast shows 📈 for `growth_track`, opens `/growth-track` | ☑ | DB `type=growth_track`, `actionUrl=/growth-track`; icon map in UI |

**Tester / date:** Cursor agent / 2026-09-23

**Sign-off:** Local API matrix green — ready for PR #5 merge to `develop`. No staging/main deploy this cycle.

**Re-run:** `cd backend && node scripts/run-growth-track-local-qa.js` (backend must be on port 5000)
