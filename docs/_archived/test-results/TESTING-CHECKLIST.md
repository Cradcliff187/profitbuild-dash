# Schedule Feature Testing Checklist

## Pre-Deployment Testing

### Database Safety
- [ ] Database backup created
- [ ] Migration runs successfully on local
- [ ] Migration runs successfully on staging
- [ ] Rollback migration tested
- [ ] All existing data intact after migration

### Feature Flag Testing
- [ ] Schedule tab hidden when flag OFF
- [ ] Schedule tab visible when flag ON
- [ ] Can toggle flag without redeployment
- [ ] No errors in console when flag OFF

### Existing Functionality (CRITICAL)
- [ ] Projects list page works normally
- [ ] Project detail page loads without errors
- [ ] Create new project works
- [ ] Create estimate works
- [ ] Create quote works
- [ ] Create expense works
- [ ] Create change order works
- [ ] All existing tabs (Overview, Estimates, etc.) work
- [ ] Financial calculations unchanged
- [ ] No performance degradation on projects without schedules

### Schedule Feature (When Enabled)
- [ ] Schedule tab appears for projects with approved estimates
- [ ] Schedule tab does NOT appear for projects without approved estimates
- [ ] Gantt chart displays correctly
- [ ] Can click tasks to edit
- [ ] Can drag tasks to change dates
- [ ] Dependencies save to database
- [ ] Warnings display correctly
- [ ] Stats calculate correctly
- [ ] Change orders appear with stripe pattern

### Mobile Testing
- [ ] Schedule view works on iOS Safari
- [ ] Schedule view works on Android Chrome
- [ ] Touch targets are large enough
- [ ] Side panel slides in correctly
- [ ] Gantt chart scrolls horizontally

### Performance Testing
- [ ] Page load time < 2 seconds
- [ ] Gantt renders in < 1 second
- [ ] No memory leaks on page
- [ ] Database queries optimized (check Supabase logs)

### Edge Cases
- [ ] Empty project (no estimates)
- [ ] Project with only estimate (no change orders)
- [ ] Project with only change orders (no estimate)
- [ ] 50+ line items (performance)
- [ ] Line items with no scheduled dates
- [ ] Circular dependencies handled
- [ ] Invalid dates handled

### Rollback Testing
- [ ] Can disable feature via environment variable
- [ ] Can run rollback migration
- [ ] App works normally after rollback
- [ ] No orphaned data

## Production Rollout Checklist

### Phase 1: Enable for One Project
- [ ] Enable flag for one test project only
- [ ] Verify functionality
- [ ] Monitor for 24 hours
- [ ] Check error logs
- [ ] Get user feedback

### Phase 2: Enable for Beta Users
- [ ] Enable for 5-10 projects
- [ ] Monitor performance
- [ ] Gather feedback
- [ ] Fix any issues

### Phase 3: Full Rollout
- [ ] Enable for all projects
- [ ] Monitor error rates
- [ ] Watch database performance
- [ ] Support tickets monitoring

## Rollback Triggers

Immediately disable feature if:
- [ ] Error rate > 1%
- [ ] Page load time > 5 seconds
- [ ] Database CPU > 80%
- [ ] User reports data loss
- [ ] Critical bug discovered

