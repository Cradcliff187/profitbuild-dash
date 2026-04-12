# Gantt Schedule Implementation - Quick Reference Card

**Print this page and keep it handy during development!**

---

## ⚠️ BEFORE YOU START ANYTHING

```bash
# 1. Check your branch
git branch --show-current

# If it says "main" → STOP! Switch to feature branch:
git checkout feature/gantt-schedule

# If feature branch doesn't exist yet:
git checkout -b feature/gantt-schedule
git push -u origin feature/gantt-schedule
```

---

## 📋 DAILY WORKFLOW

### Starting Your Day
```bash
1. git checkout feature/gantt-schedule
2. git pull origin feature/gantt-schedule
3. git status  # Should be clean
```

### During Development
```bash
# See what changed
git status
git diff

# Save your work
git add .
git commit -m "feat: what you did"
git push origin feature/gantt-schedule
```

### End of Day
```bash
git status  # Make sure everything is committed
git push origin feature/gantt-schedule
```

---

## 🎯 THE THREE LAYERS OF SAFETY

```
1. Git Branch        → Main untouched
2. Feature Flags     → Can disable instantly  
3. Additive Only     → No destructive changes
```

---

## 📚 WHICH DOCUMENT TO USE?

| Question | Document |
|----------|----------|
| "What branch?" | safe-implementation-strategy.md |
| "What code to write?" | gantt-implementation-instructions.md |
| "How to test?" | safe-implementation-strategy.md |
| "Component structure?" | gantt-implementation-instructions.md |

---

## 🚨 EMERGENCY COMMANDS

**Undo last commit (keep changes):**
```bash
git reset --soft HEAD~1
```

**Undo ALL uncommitted changes:**
```bash
git reset --hard HEAD  # CAREFUL!
```

**Worked on wrong branch by accident:**
```bash
git stash
git checkout feature/gantt-schedule
git stash pop
```

**Start completely over:**
```bash
git checkout main
git branch -D feature/gantt-schedule
git checkout -b feature/gantt-schedule
```

---

## ✅ COMMIT MESSAGE FORMAT

```bash
git commit -m "feat: add schedule component"
git commit -m "fix: correct date calculation"
git commit -m "docs: add comments to types"
git commit -m "test: add unit tests"
```

**Types:** feat, fix, docs, style, refactor, test, chore

---

## 📁 WHERE FILES GO

```
✓ New components → src/components/schedule/
✓ New types → src/types/schedule.ts
✓ Feature flags → src/lib/featureFlags.ts
✓ Safety scripts → scripts/
✓ Migrations → supabase/migrations/
```

**❌ NEVER modify existing files (except one integration point)**

---

## 🧪 TESTING CHECKLIST

Before merging to main:

- [ ] `git branch --show-current` = feature/gantt-schedule
- [ ] `npm run type-check` passes
- [ ] `npm run build` succeeds
- [ ] Feature flag OFF → app works normally
- [ ] Feature flag ON → schedule appears
- [ ] Tested on test project (not real data)
- [ ] Tested on mobile
- [ ] All existing features still work

---

## 🚀 PHASE ORDER

```
Phase -1: Git branching (5 min)
Phase 0:  Safety setup (1 hour)
Phase 1:  Database (30 min)
Phase 2:  Types (20 min)
Phase 3:  Dependencies (10 min)
Phase 4:  Components (3-4 hours)
Phase 5:  Integration (1 hour)
Phase 6:  Testing (2 hours)
Phase 7:  Documentation (30 min)
```

---

## 🔥 ABSOLUTE RULES

1. **ALWAYS** check branch before any work
2. **NEVER** modify existing database columns
3. **NEVER** modify existing TypeScript types
4. **NEVER** push to main (only to feature branch)
5. **ALWAYS** test with feature flag OFF
6. **ALWAYS** backup database before migrations
7. **NEVER** test on real projects (use test project)

---

## 📞 WHEN TO ASK FOR HELP

- Git shows merge conflicts
- TypeScript won't compile
- Tests are failing
- Existing features broke
- Not sure which branch you're on
- Migration failed
- Can't undo a change

**Don't be afraid to ask! Better safe than sorry.**

---

## 💾 BACKUP COMMAND

```bash
# Before database changes
./scripts/backup-database.sh

# Or manually:
supabase db dump > backup_$(date +%Y%m%d).sql
```

---

## 🎓 LEARNING RESOURCES

**Git basics:**
- `git status` - What changed?
- `git diff` - Show changes
- `git log --oneline` - See history
- `git branch -a` - See all branches

**GitHub has great docs:** github.com/git-guides

---

## 🎉 YOU'RE SAFE BECAUSE:

✅ Main branch protected  
✅ All changes in isolated branch  
✅ Feature flags = instant disable  
✅ Database changes reversible  
✅ Can delete feature branch anytime  
✅ Test project = no real data risk  
✅ Gradual rollout = find bugs early  

**Develop with confidence!**

---

**Keep this card visible while working. When in doubt, check your branch first!**

```bash
git branch --show-current
```

