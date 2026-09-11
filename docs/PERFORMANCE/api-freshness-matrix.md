# API Freshness Requirements Matrix (Draft)

**Status:** Draft — requires product/engineering sign-off before any persistent TTL caching.

**Default policy until approved:** In-flight request deduplication only. No TTL cache on business-critical data.

| Resource | Endpoint(s) | Used by | Freshness requirement | TTL cache allowed? | Owner sign-off |
|----------|-------------|---------|----------------------|-------------------|----------------|
| User roster (active) | `GET /api/users?status=active` | Dashboards, modals, departments | Must reflect new/deactivated users within **TBD** | No (default) | Pending |
| User roster (excludePast) | `GET /api/users?excludePast=true` | Work item mentions, HR widgets | Must reflect roster changes within **TBD** | No (default) | Pending |
| Departments | `GET /api/departments` | Department list, filters | Structural changes visible within **TBD** | No (default) | Pending |
| Projects list | `GET /api/projects` | Assign work, dashboards | Assignment changes within **TBD** | No (default) | Pending |
| Notifications | `GET /api/notifications/*` | Bell, context | Near real-time | Existing polling only | N/A |
| Dashboard aggregates | Various parallel fetches | Admin/HR dashboard | Stats tolerance **TBD** | No (default) | Pending |

## Notes

- Tier A optimization uses [`apiOptimizer.deduplicate`](../../frontend/src/utils/apiOptimizer.js) — does not change data freshness (same response shared across concurrent callers).
- Any future TTL must document invalidation triggers (e.g. after user CRUD, department member add/remove).
