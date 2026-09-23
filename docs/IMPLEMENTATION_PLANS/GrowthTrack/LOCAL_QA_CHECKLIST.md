# Growth Track — Local QA checklist

Run on local stack with `feature/pip-v2`, seeded or manual test users.

| Role | Scenario | Pass | Notes |
|------|----------|------|-------|
| **Employee** | No active track → empty state, no error toast | ☐ | `GET /my-active` → `null` |
| **Employee** | Concern / improvement banners and theme | ☐ | `GrowthTrackThemeSync` |
| **Employee** | Acknowledge notice | ☐ | |
| **Employee** | Critical stage → `pip-active` theme | ☐ | Details + dashboard |
| **Manager** | Initiate L1 concern for direct report | ☐ | |
| **Manager** | Escalate L2 → L3 | ☐ | |
| **Manager** | Add target, update progress, log review | ☐ | |
| **Manager** | Finalize improved / extended / no_improvement | ☐ | |
| **Manager** | Cannot initiate for non-report | ☐ | 403 API |
| **HoD** | Dept tracks in `/manager` list only | ☐ | |
| **HoD** | Cannot initiate other dept | ☐ | |
| **HR** | `/all` list, finalize, escalation notification | ☐ | |
| **Notifications** | Bell/toast shows 📈 for `growth_track`, opens `/growth-track` | ☐ | |

**Tester / date:** _______________

**Sign-off:** _______________
