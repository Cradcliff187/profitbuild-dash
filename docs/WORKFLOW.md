# RCG Work — Shipping Workflow

This is the canonical end-to-end flow from a code change to production. Follow it for every change. The CI gates and branch protection rules are configured to enforce most of it; the human discipline (live verification, rollback note) is on you.

---

## TL;DR

```
Diagnose → Edit → Live-verify in dev → Type-check → Pre-deploy gate
        → Commit on feature branch (NOT main) → Push → PR
        → CI runs pre-deploy gate (must be green) → Squash-merge
        → Lovable auto-deploys main → Smoke-verify on rcgwork.com
```

Three things are non-negotiable:
1. **No direct pushes to `main`** by humans (branch protection enforces this).
2. **PR must pass CI** (the `pre-deploy / pre-deploy` status check) before merge (branch protection enforces).
3. **UI changes get live-verified in a running browser** before commit — type-check is structural, not behavioral.

---

## The flow, step by step

### 1. Diagnose

Read the failing code. Reproduce the bug or measure the gap. Don't start editing until you understand the *why*.

### 2. Edit

Narrowest change that fixes it. Don't surrounding-cleanup unless asked. Don't add scaffolding for hypothetical future requirements (per [CLAUDE.md](../CLAUDE.md) "Doing tasks").

### 3. Live-verify

Start the dev server (`npm run dev`, port `5225`) and exercise the flow in a real browser. Type-check doesn't catch:
- Radix portals that don't close
- Queries that silently return empty
- Realtime subscriptions that fire on the wrong key
- Async race conditions

For UI changes, an end-to-end click-and-confirm is the verification. Console with zero errors is part of the contract.

### 4. Type-check + pre-deploy gate (locally)

```bash
npm run type-check
npm run pre-deploy
```

Pre-deploy bundles lint + type-check + custom safety gates ([scripts/pre-deploy-checks.sh](../scripts/pre-deploy-checks.sh)). If pre-deploy is red, CI will be red — fix locally before pushing.

### 5. Commit on a feature branch

Branch naming: `claude/<kebab-case-description>` (matches recent convention from [git log](https://github.com/Cradcliff187/profitbuild-dash/commits/main)). Commit message format: conventional commits — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`. Body explains the *why*, not the *what*.

**Never commit to `main` directly.** Branch protection will reject it for humans (only `gpt-engineer-app[bot]` is exempt — see "Branch protection settings" below).

### 6. Push + PR

```bash
git push -u origin claude/<branch>
gh pr create
```

The repo's [PR template](pull_request_template.md) auto-fills with the required sections (Summary, Why, Test plan, Rollback). Fill all four.

### 7. Wait for CI

The `pr-checks` workflow runs `npm run pre-deploy` against the PR. Branch protection requires this status check to pass before merge is allowed. Read the failure log — don't bypass.

### 8. Squash-merge

```bash
gh pr merge --squash
```

The repo enforces squash-merge only (no merge commits, no rebase). One PR = one commit on `main` with `(#XX)` suffix.

### 9. Lovable auto-deploys

Within ~2 minutes of `main` push, Lovable rebuilds and deploys to rcgwork.com. The Lovable dashboard shows deploy status if you need to confirm. There is no automatic post-deploy verification — you smoke-test the relevant flow manually after the deploy lands.

### 10. Manual smoke on rcgwork.com

Hit the actual deployed flow. For PWA users, check that `Settings → App Updates → Check for Updates` reflects the new version (per [CLAUDE.md](../CLAUDE.md) Gotcha #46).

---

## Branch protection settings (for reference / re-applying)

These are configured on the `main` branch via GitHub API (and re-applicable via `gh api`). The script that applies them is in this repo's git history (search for `claude/workflow-hardening` PR).

**Active rules:**

| Setting | Value | Why |
|---|---|---|
| Require pull request before merging | ✅ | Forces all human changes through PR + review path |
| Required approving reviews | 0 | Solo dev — gate is CI, not human review |
| Require status checks to pass | ✅ | Specifically `pre-deploy / pre-deploy` from [pr-checks.yml](../.github/workflows/pr-checks.yml) |
| Require branches to be up to date | ✅ | Prevents merging stale PRs |
| Require conversation resolution | ✅ | Forces unresolved review comments to be handled |
| Restrict who can push to matching branches | ✅ | Only `gpt-engineer-app` (Lovable bot) — humans must PR |
| Allow force pushes | `gpt-engineer-app` only | Lovable's Publish dialog force-pushes (Gotcha #31). Humans cannot force-push. |
| Require signed commits | ❌ | Lovable doesn't sign; would brick its bot |
| Require linear history | ❌ | Lovable's commit chains aren't linear |
| Lock branch | ❌ | Would brick Lovable entirely |

**Why `gpt-engineer-app` is exempt:** Lovable's editor and Publish dialog write directly to `main` as `gpt-engineer-app[bot]`. Blocking direct pushes would brick the Lovable workflow. The bypass is scoped to that one App slug — humans (you, Claude, future contributors) must PR.

**Re-applying via `gh`** if branch protection ever drifts, run:

```bash
gh api -X PUT repos/Cradcliff187/profitbuild-dash/branches/main/protection \
  --input docs/branch-protection.json
```

The exact JSON payload is at [branch-protection.json](branch-protection.json).

---

## CI workflows in this repo

| Workflow | When it runs | What it does |
|---|---|---|
| [pr-checks.yml](../.github/workflows/pr-checks.yml) | On every PR to `main` | Runs `npm run pre-deploy` (lint + type-check + custom gates). REQUIRED status check. |
| [sync-storage.yml](../.github/workflows/sync-storage.yml) | On `main` push touching `docs/rcg-invoice-template.docx` | Re-uploads the invoice template to Supabase Storage. Closes the gap where Lovable doesn't push storage objects. |

---

## Secrets (in GitHub Actions)

| Secret | Used by | What it is |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | sync-storage.yml | Personal Access Token from Supabase. Already in your local `.env`. Set in repo Actions secrets via `gh secret set SUPABASE_ACCESS_TOKEN`. |

The repo does NOT use the Supabase **service role key** in CI — the access token (PAT) is sufficient for storage operations and is less risky if exposed (scoped to the user, not the entire DB).

---

## Lovable-specific quirks to remember

These come up often enough that they're called out here in addition to [CLAUDE.md](../CLAUDE.md):

1. **`gpt-engineer-app[bot]` commits go straight to `main`** without PR. This is by design — branch protection exempts the bot. Don't try to "fix" this.
2. **The Publish dialog rewrites `index.html`** (Gotcha #31). It DELETES `<head>` tags it doesn't recognize. Edit `index.html` only for tags Lovable ignores (apple-touch-icon, manifest, theme-color). Title / OG / Twitter / favicon `<link rel="icon">` belong in the Publish dialog, not in code.
3. **Lovable sometimes fails to deploy `ai-report-assistant`** (CLAUDE.md). After changes to that function, deploy via CLI directly: `npx supabase functions deploy ai-report-assistant --project-ref clsjdxwbsjbhjibvlqbz`. There is no GitHub Action for this yet (see "Future tier-2 items").
4. **Lovable's build env doesn't expose git** (Gotcha #18). Production `__APP_VERSION__` falls through to `(build HHMMSS)`, not `(build {sha})`. CI builds would produce a real SHA — don't have CI deploy the app artifact, only Lovable.

---

## What's NOT enforced (yet)

These are gaps where the system relies on human discipline. Future tier-2 work could close them:

- **Auto edge-function deploy** for `ai-report-assistant` and the four `_shared/brandedTemplate.ts` consumers. Currently manual via CLI.
- **Migration drift check** in CI (no real SQL in placeholder files; no BOMs; local file count == DB count). Currently a manual `npm run verify-migration` call.
- **Storage object sync for non-invoice templates** (e.g. contract template `rcg-contract-template.docx` if it exists). Currently the `sync-storage.yml` only covers the invoice template.
- **Deploy verification probe** — nothing pings `/version.json` after a Lovable deploy to confirm it landed.

If any of these become real problems, file an issue and add to the workflow.

---

## Rollback

If a Lovable deploy goes wrong:

1. **Identify the bad commit** on `main`. Usually the most recent.
2. **Revert it** locally:
   ```bash
   git revert <sha>
   git push origin main  # ← yes, branch protection allows revert PRs through normal flow
   ```
   In practice: open a one-line revert PR via `gh pr create`. CI will run, then squash-merge.
3. **Wait ~2 min** for Lovable to redeploy from the revert commit.
4. **Smoke-verify** the previously-broken flow.

For DB migrations or storage objects that were part of the bad change, code revert alone isn't enough — see CLAUDE.md "Critical Migration Rules" for the migration revert procedure, and re-run the `sync-storage.yml` workflow if the storage state needs reverting.

---

## Last updated

2026-05-04 (concurrent with `claude/workflow-hardening` PR). Update this doc when the workflow changes.
