# RCG Work — Shipping Workflow

This is the canonical end-to-end flow from a code change to production. Follow it for every change. The CI gates and branch protection rules are configured to enforce most of it; the human discipline (live verification, rollback note) is on you.

---

## TL;DR

```
Diagnose → Edit → Live-verify in dev → Type-check → Pre-deploy gate
        → Commit on feature branch (NOT main) → Push → PR
        → CI runs pre-deploy gate (must be green) → Squash-merge
        → CLICK PUBLISH IN LOVABLE → Smoke-verify on rcgwork.com
```

Four things are non-negotiable:
1. **No direct pushes to `main`** by humans (branch protection enforces this).
2. **PR must pass CI** (the `pre-deploy / pre-deploy` status check) before merge (branch protection enforces).
3. **UI changes get live-verified in a running browser** before commit — type-check is structural, not behavioral.
4. **Merging is NOT deploying.** Lovable does not auto-deploy on push for this project — it's a manual Publish click. Settings → App Updates shows a "Publish pending" amber indicator when `main` is ahead of the deployed `buildTime`. Whoever merges is responsible for publishing, or notifying the person who will.

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

### 9. Click Publish in Lovable

**Lovable does NOT auto-deploy on push for this project.** A successful merge to `main` puts the code into the repo but it does not go live until you manually open Lovable's editor and click Publish. Lovable's build runs in ~2 minutes after that click, then `rcgwork.com` reflects the new code.

Why we know this is manual: verified May 4 2026 — four merged PRs sat on `main` for 6 hours while production stayed on the previous build. Lovable's account-level setting does not appear to expose an auto-deploy toggle.

To make the "merged but not published" state visible, the in-app **Settings → App Updates** card now shows a deploy-status indicator:

- **Green checkmark + "In sync"**: deployed `buildTime` is within 5 minutes of (or after) the latest commit on `main`. Nothing to do.
- **Amber warning + "Publish pending"**: `main` has a commit newer than 5 minutes after the deployed `buildTime`. Open Lovable and click Publish.

The 5-minute buffer absorbs the natural Lovable build window without false-positive alarms.

### 10. Manual smoke on rcgwork.com

Hit the actual deployed flow. For PWA users, check that `Settings → App Updates → Check for Updates` reflects the new version (per [CLAUDE.md](../CLAUDE.md) Gotcha #46).

---

## Branch protection settings (for reference / re-applying)

Configured as a GitHub **Repository Ruleset** on the `main` branch (NOT the legacy branch-protection endpoint — that endpoint's `restrictions` field is organization-only and is rejected on personal repos with HTTP 422). The ruleset is named `main-protection` and is reproducible from [main-ruleset.json](main-ruleset.json).

**Active rules:**

| Rule | Effect | Why |
|---|---|---|
| `pull_request` (review count 0) | All non-bypass actors must merge via PR | Forces all human changes through PR. Review count is 0 because solo dev — gate is CI. |
| `required_status_checks` (`pre-deploy`, strict) | PR can't merge until [pr-checks.yml](../.github/workflows/pr-checks.yml) passes AND PR is up-to-date with main | Single gate to enforce |
| `required_review_thread_resolution` | Unresolved review comments block merge | Catches "I'll address that later" drift |
| `deletion` | `main` cannot be deleted | Idiot-proofing |
| `non_fast_forward` | No force-pushes to `main` | Preserves history |
| `current_user_can_bypass: never` | Even repo admin (you, Cradcliff187) is subject to all rules | The discipline you asked for — no "I'll just push this hotfix" temptation |

**Bypass actor — the Lovable bot:**

| Field | Value |
|---|---|
| `actor_id` | `818760` |
| `actor_type` | `Integration` (GitHub App) |
| `bypass_mode` | `always` |
| App slug | `lovable-dev` |
| Commit display name | `gpt-engineer-app[bot]` (cosmetic — the App was renamed at some point but commit metadata still shows the old name) |

This is the only actor exempt. Lovable's editor + Publish dialog continue to push directly to main as before.

**Re-applying via `gh`** if the ruleset is ever deleted or drifts:

```bash
# Create new ruleset from the canonical JSON
gh api -X POST repos/Cradcliff187/profitbuild-dash/rulesets \
  --input docs/main-ruleset.json

# OR update existing ruleset (find ID first via `gh api repos/.../rulesets`)
gh api -X PUT repos/Cradcliff187/profitbuild-dash/rulesets/<id> \
  --input docs/main-ruleset.json
```

Inspect what's currently active:

```bash
gh api repos/Cradcliff187/profitbuild-dash/rulesets
gh api repos/Cradcliff187/profitbuild-dash/rulesets/<id>
```

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

1. **Lovable's bot (`lovable-dev`, displayed as `gpt-engineer-app[bot]`) commits go straight to `main`** without PR. This is by design — the Ruleset exempts the bot's GitHub App ID. Don't try to "fix" this.
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
2. **Revert it** via PR:
   ```bash
   git revert <sha>
   gh pr create
   ```
   The branch protection ruleset requires PR + passing CI even for reverts. Squash-merge after CI is green.
3. **Click Publish in Lovable** to actually push the revert live. The Settings → App Updates "Publish pending" indicator should clear within ~2 minutes after the build completes.
4. **Smoke-verify** the previously-broken flow on `rcgwork.com`.

For DB migrations or storage objects that were part of the bad change, code revert alone isn't enough — see CLAUDE.md "Critical Migration Rules" for the migration revert procedure, and re-run the `sync-storage.yml` workflow if the storage state needs reverting.

---

## Last updated

2026-05-05 — added the deploy-status indicator section + corrected the "Lovable auto-deploys on push" claim throughout. Update this doc when the workflow changes.
