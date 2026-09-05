# Branch protection setup (one-time, GitHub UI)

Configure these in **GitHub → Repository → Settings → Branches → Branch protection rules**.

GitHub CLI (`gh`) is optional; use the web UI if CLI is not installed.

## `main`

| Setting | Value |
|---------|--------|
| Require a pull request before merging | Yes |
| Require status checks to pass | Yes |
| Required checks | `Backend tests`, `Authz catalog validate`, `Frontend build` |
| Require branches to be up to date | Recommended |
| Do not allow bypassing | Recommended for admins |

## `develop`

| Setting | Value |
|---------|--------|
| Require status checks to pass | Yes |
| Required checks | Same three CI jobs as above |
| Require a pull request | Optional (team preference) |

## GitHub Environments (for CD)

**Settings → Environments**

### `production`

- Required reviewers: at least one approver before deploy
- Deployment branches: `main` only
- Secrets (repository or environment): `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`

### `uat`

- Deployment branches: `staging` only
- Same VPS SSH secrets as production

## CI workflow name

Workflow file: `.github/workflows/ci.yml`  
Job names must match the required check names listed above.

After the first successful CI run on a PR, the check names appear in the branch protection dropdown.
