# KPI Guide Update Summary - Lunch Tracking Feature

## Date: December 1, 2024
## Version: 1.2 → 1.3

---

## Changes Made

### 1. KPI Guide Metadata Updated
**File**: `src/pages/KPIGuide.tsx`

- **Version**: Updated from `1.2` to `1.3`
- **Last Updated**: Changed from `2024-11-27` to `2024-12-01`
- **Changelog**: Added new entry:
  ```
  { date: '2024-12-01', version: '1.3', 
    changes: 'Added Lunch Tracking section (4 metrics) - lunch_taken, lunch_duration_minutes, gross_hours, net_hours for time entries' }
  ```

### 2. Expense KPIs Section - Added 4 New Metrics

**Location**: `expenseKPIs` array in `src/pages/KPIGuide.tsx`

Added the following KPI measures:

1. **Lunch Taken**
   - Source: `database`
   - Field: `expenses.lunch_taken`
   - Formula: `Boolean - whether lunch break was taken during shift`
   - Where Used: `TimeEntries table, time entry forms, reports`
   - Notes: `Only applicable to labor_internal expenses (time entries)`

2. **Lunch Duration Minutes**
   - Source: `database`
   - Field: `expenses.lunch_duration_minutes`
   - Formula: `Integer (15-120) - duration of lunch break in minutes`
   - Where Used: `TimeEntries table, lunch tracking UI, reports`
   - Notes: `Only meaningful when lunch_taken = true`

3. **Gross Hours**
   - Source: `database` (calculated)
   - Field: `Calculated from start_time/end_time`
   - Formula: `(end_time - start_time) / 3600`
   - Where Used: `Time entry calculations, reports`
   - Notes: `Total shift duration before lunch deduction`

4. **Net Hours (Billable)**
   - Source: `database` (calculated)
   - Field: `expenses.amount / hourly_rate OR calculated`
   - Formula: `Gross Hours - (Lunch Duration / 60) when lunch_taken = true`
   - Where Used: `TimeEntries table, billing calculations, amount calculation`
   - Notes: `Billable hours after lunch deduction. Amount = Net Hours × Hourly Rate`

### 3. Report Builder - Already Updated ✅

**File**: `src/components/reports/SimpleReportBuilder.tsx`

The following data sources already include lunch tracking fields:

#### `time_entries` Data Source:
- ✅ `lunch_taken` (boolean)
- ✅ `lunch_duration_minutes` (number)
- ✅ `gross_hours` (number)

#### `internal_labor_hours` Data Source:
- ✅ `lunch_taken` (boolean)
- ✅ `lunch_duration_minutes` (number)
- ✅ `gross_hours` (number)

**Status**: No changes needed - fields already present

---

## Impact Summary

### Metrics Count
- **Previous Total**: 57+ measures
- **New Total**: 61+ measures (added 4 new metrics)
- **Expense Section**: Now contains 9 measures (was 5)

### Database Fields Documented
- **New Fields**: 2 (`lunch_taken`, `lunch_duration_minutes`)
- **Calculated Fields**: 2 (`gross_hours`, `net_hours`)

### Report Capabilities
- ✅ Time entries reports can filter/group by lunch status
- ✅ Internal labor hours reports include lunch metrics
- ✅ All lunch fields available for custom report building

---

## Business Logic Documentation

The KPI guide now documents the critical business rule:

**Net Hours Calculation**:
```
NET_HOURS = GROSS_HOURS - (LUNCH_TAKEN ? LUNCH_DURATION_MINUTES/60 : 0)
AMOUNT = NET_HOURS × HOURLY_RATE
```

This ensures administrators understand that:
1. Amount is calculated on **net hours** (not gross)
2. Lunch deduction only applies when `lunch_taken = true`
3. Gross hours represent total shift duration
4. Net hours represent billable/paid hours

---

## Verification Checklist

- ✅ KPI Guide version updated to 1.3
- ✅ Changelog entry added with today's date
- ✅ 4 new metrics added to expenseKPIs section
- ✅ All metrics include proper source, field, formula, and usage notes
- ✅ Report builder already includes lunch fields (verified)
- ✅ No linting errors introduced
- ✅ Documentation aligns with implementation

---

## Next Steps

The KPI guide is now fully updated and synchronized with the lunch tracking feature implementation. Administrators and managers can reference this guide to understand:

1. How lunch tracking affects cost calculations
2. Which fields are available for reporting
3. The formulas used for net hours and amount calculations
4. Where these metrics are used throughout the application

**Status**: ✅ Complete and ready for use

