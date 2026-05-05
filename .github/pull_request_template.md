<!--
PR template — answers structure what reviewers (and future you) need.
Delete sections that genuinely don't apply, but don't skip "Test plan" or
"Rollback".
-->

## Summary

<!-- 1-3 sentences: what does this PR do? -->

## Why

<!-- The problem it solves, the bug observed, the user-facing symptom, or the
constraint that prompted this. Future-you will thank present-you. -->

## Test plan

- [ ] `npm run type-check` clean
- [ ] `npm run pre-deploy` clean (will also run in CI)
- [ ] Live verification: <!-- describe what you clicked / observed in the
      running app. UI changes especially need this — type-check doesn't
      catch e.g. Radix portals not closing or queries returning empty. -->
- [ ] Manual smoke after deploy: <!-- name the specific flow to re-test on
      rcgwork.com once Lovable rolls this out -->

## Publish

<!-- Lovable does NOT auto-deploy on push for this project.
     Tick when you've actually clicked Publish in Lovable's editor and
     verified `Settings → App Updates` shows green "In sync".
     If someone else will publish, name them here. -->
- [ ] Will publish in Lovable after this merges (and verify the
      Settings → App Updates indicator turns green)

## Rollback

<!-- One sentence. Usually: "Revert PR, click Publish in Lovable, smoke-test."
     If a DB migration or storage object is involved, name the extra step. -->

---

🤖 If generated with [Claude Code](https://claude.com/claude-code), the
"Generated with" line is added automatically by the assistant.
