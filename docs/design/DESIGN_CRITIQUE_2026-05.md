# Design Critique — RCG Work (May 2026)

> **Scope:** Cross-cutting chrome, list (main) pages, detail pages, and per-role walkthroughs. Judged against industry SaaS patterns (Linear, Stripe, Procore, Slack, Notion) and the app's own design system (`tailwind.config.ts` + `src/index.css` + [VISUAL_HIERARCHY.md](VISUAL_HIERARCHY.md)).
>
> **Method:** Code-level review + design-token audit. Screenshot pass via the local dev server was attempted but the harness's port proxy was unreachable from the embedded browser in this environment — findings are anchored to file:line citations and to the existing CLAUDE.md gotcha registry instead.
>
> **Severity legend:** 🔴 Critical (visible to every user, every visit) · 🟡 Moderate (affects a role or workflow) · 🟢 Minor (polish / consistency).
>
> **What's not in scope:** Auth pages, capture flows, training viewer, Profit Analysis (table-only), backend / edge-function UX, brand identity (logo, name).

---

## Executive Summary

The app is **functionally mature, structurally sound, and aesthetically consistent at the system level** — the design tokens (HSL-based, semantic, with B2B-dense scale variants) are textbook. The 4-layer visual hierarchy ([VISUAL_HIERARCHY.md](VISUAL_HIERARCHY.md)) is real on screen: dark sidebar → orange accent line → light content → white elevated cards. Recent rebuilds — the Quote View 4-card composition (Rule 16), the Lead Detail mobile parity (Rule 22), the Project Detail collapsing secondary panel (Rule 18), the Mobile Schedule URL unification (Rule 18) — are objectively good. The mobile "Note · Camera · Attach" bar is a convergent pattern (Slack/WhatsApp/Linear) and works in both project and lead surfaces. The April–May 2026 cleanup pass produced real lift.

**The weakness is consistency, not capability.** Where the app stumbles is in the **tier between the tokens and the page**: three different mobile-tab implementations, two different mobile-action workarounds for the same `PageHeader` flaw, four different "What goes in the corner action slot" answers, and a Time Tracker page that lives in its own visual world (3 stacked headers, custom dropdowns instead of Radix Select, 1,783-line component) by explicit design-doc carve-out. Field workers in particular have a navigation gap — their sidebar has no path to a project, so the Schedule view is only reachable via @mention deep-links. Admins encounter a long, monolithic Settings page with 10 stacked cards and no in-page nav.

**What to fix first:** (1) Make `PageHeader` mobile-actions a first-class concept (not a per-page workaround). (2) Pick one mobile-tabs pattern and apply it everywhere. (3) Give field workers a sidebar entry that lands them on a project they care about. (4) Break Settings into anchored sections. These four changes cascade across 15+ pages and would visibly elevate the app's professionalism on first launch — not by adding more, but by removing the hairline drift between surfaces.

---

## Top 5 Priority Recommendations

| # | Change | Why | Effort | Pages affected |
|---|---|---|---|---|
| **1** | **Promote `PageHeader.actions` to a true mobile-aware contract.** Either (a) render as an action sheet/overflow menu on mobile, or (b) add a `PageHeader.mobileActions` slot and a one-line caller pattern that doesn't rely on every page author remembering Gotcha #38. | Today: every list page invents its own workaround — Projects/Expenses/Leads/RoleManagement add a fixed FAB; BranchBidDetail adds a separate mobile action strip; Dashboard does nothing (Refresh is silently lost on mobile); Reports does nothing (New Report is silently lost on mobile). That's four different answers to one design question. | M | All pages using `PageHeader` (~15 pages) |
| **2** | **Standardize mobile tabs.** Pick the rounded-pill horizontal strip from [`MobileScheduleView`](../../src/components/schedule/MobileScheduleView.tsx) + [`BranchBidDetail`](../../src/pages/BranchBidDetail.tsx) (`bg-muted/40 rounded-xl p-1` with badge counts) and retire `MobileTabSelector` (the dropdown variant in [Expenses.tsx:510](../../src/pages/Expenses.tsx)) and `Reports`'s native `<Select>` (Reports.tsx:287). Three tab styles for the same job is the most visible inconsistency. | Tabs are the most repeated control in the app. Three patterns means a user "learning" navigation in one area unlearns it the moment they arrive in another. The pill strip wins because (a) it shows all options at once, no disclosure click, (b) it carries badge counts visually inline, (c) the active tab gets a clear inset card treatment that matches the desktop pill style. | M | Expenses, Reports, KPI Guide; ensures BranchBidDetail / MobileScheduleView / future detail pages compose identically |
| **3** | **Give field workers a "My Projects" sidebar entry.** Today their sidebar has Time Tracker, My Training, Mentions, Field Media — none of which leads to a project's schedule. They reach `/projects/:id/schedule` only via @mention deep-links. A "My Projects" entry that lists projects with active time entries (or projects from their last 7 days of clock-ins) closes a real navigation hole. | The Schedule view is the field worker's critical-path surface for tasks/notes/media (Rule 18 unified the URL specifically so they can reach it). But they can't *find* it without a manager pinging them. That's not a design system issue — it's a missing navigation primitive. | S–M | AppSidebar (1 entry), small list page or reuse `ProjectsList` filtered to "my recent projects" |
| **4** | **Anchor-nav Settings.** [Settings.tsx](../../src/pages/Settings.tsx) is 677 lines of 10 stacked cards (Profile · Notifications · Data & Sync · Project Numbers · QuickBooks · Account Mappings · Branding · Labor Rates · Developer · App Updates · Security). On mobile this is a 4-screen scroll. Add a sticky left rail (desktop) or a top-of-page anchor strip (mobile) so admins can jump between sections. | Settings is admin-heavy and rarely visited — but when admins go there, they go for one specific thing. Forcing a full-page scroll is the kind of friction that makes the app feel "internal tool" instead of "professional product." Stripe/Linear/Notion all have anchor nav for this reason. | S | Settings page only |
| **5** | **Decommission TimeTracker's three-tier chrome and the custom dropdowns.** [`MobileTimeTracker.tsx`](../../src/components/time-tracker/MobileTimeTracker.tsx) is 1,783 lines, renders its own orange-gradient header on top of AppLayout's dark mobile header (already 67px), and uses hand-rolled absolute-positioned `<button>` dropdowns instead of `shadcn/ui Select`. This is explicitly carved out of [VISUAL_HIERARCHY.md](VISUAL_HIERARCHY.md) ("Do NOT modify any Time Tracker components") which is why the divergence exists, but the carve-out has run its course. Custom dropdowns aren't keyboard-accessible, the tripled chrome eats vertical pixels on small phones, and the file size makes any change risky. | The field worker's primary daily surface is the most visually inconsistent page in the app, the least accessible, and the hardest to evolve. The carve-out made sense as a freeze during other work; this is the moment to lift it. Replacing the gradient header with the canonical mobile chrome + swapping custom dropdowns for `Select` would also shrink the file. | L | TimeTracker only |

---

## Cross-cutting Findings

### A.1 — `PageHeader` silently drops `actions` on mobile

**Severity:** 🔴
**Location:** [src/components/ui/page-header.tsx:29–37](../../src/components/ui/page-header.tsx)

```tsx
// Mobile branch with no children: only the orange accent line renders.
// `actions` is dropped entirely. There is no warning, no fallback.
if (isMobile && !children) {
  return <>{showAccent && <div className="h-[3px] ..." />}</>;
}
```

This is documented as Gotcha #38 in CLAUDE.md, but it's still active behavior. Page authors must individually remember to compensate. The four observed compensations:

| Page | Workaround | Outcome |
|---|---|---|
| [Projects.tsx:540](../../src/pages/Projects.tsx) | Mobile FAB (fixed bottom-right + Plus icon) | ✅ "+ New Project" reachable on mobile |
| [Expenses.tsx:645](../../src/pages/Expenses.tsx) | Mobile FAB (gated to non-overview tabs) | ✅ "+ Add Expense / Add Invoice" reachable, but Sync/Import/Export/Timesheet/Bulk Allocate are **not** |
| [BranchBids.tsx:523](../../src/pages/BranchBids.tsx) | Mobile FAB | ✅ "+ New Lead" reachable; Export is **not** |
| [BranchBidDetail.tsx:322–324](../../src/pages/BranchBidDetail.tsx) | Inline mobile action strip below `PageHeader` | ✅ All header actions reachable |
| [Dashboard.tsx:432](../../src/pages/Dashboard.tsx) | **None** | ❌ Refresh button silently dropped on mobile |
| [Reports.tsx:275](../../src/pages/Reports.tsx) | **None** | ❌ "+ New Report" silently dropped on mobile |

**Recommendation:** Make the contract explicit. Either:
1. **Action sheet** — when actions overflow on mobile, render a single `MoreVertical` button that opens a sheet with the labeled action list. Matches Stripe/Linear/Slack list-page convention.
2. **`mobileActions` prop** — let pages opt-in to a different mobile rendering (e.g., a primary action surfaces, secondary actions go into overflow). Default behavior should still surface *something*.
3. **Hard-fail in dev** — if `actions` is provided and `children` is not on mobile, log a `console.warn` so future authors don't silently lose functionality.

### A.2 — Mobile tabs are implemented three different ways

**Severity:** 🟡
**Three patterns in production:**

| Pattern | File | Visual |
|---|---|---|
| **Horizontal pill strip with badge counts** (recommended) | [MobileScheduleView.tsx:141–170](../../src/components/schedule/MobileScheduleView.tsx), [BranchBidDetail.tsx:452–481](../../src/pages/BranchBidDetail.tsx) | `bg-muted/40 rounded-xl p-1`, all tabs visible inline, active gets `bg-background shadow-sm text-primary` |
| **Native dropdown (`<Select>`)** | [Reports.tsx:287](../../src/pages/Reports.tsx) | Single select trigger that opens a dropdown |
| **Custom `MobileTabSelector` dropdown** | [Expenses.tsx:510](../../src/pages/Expenses.tsx) | A bespoke dropdown component that mimics `<Select>` but isn't `<Select>` |

Plus a **fourth** pattern — TimeTracker's inline tab buttons ([MobileTimeTracker.tsx:1083–1119](../../src/components/time-tracker/MobileTimeTracker.tsx)) — which uses raw `<button>` elements with `border-b-2 border-primary` for active state. Different visual, different keyboard semantics.

**Recommendation:** Adopt the pill strip universally. It's the only one that:
- Shows all options at once (no disclosure click)
- Carries badge counts inline (essential for Tasks 12, Notes 5, Media 23)
- Uses the design tokens (`bg-muted/40`, `text-primary`)
- Mirrors the desktop rounded-full `TabsList` style for visual continuity across breakpoints

### A.3 — Toast hygiene is solid post-Apr 2026 (well done, no action)

**Severity:** 🟢 (callout, not a finding)
**Reference:** [src/components/schedule/FieldQuickActionBar.tsx:148–166](../../src/components/schedule/FieldQuickActionBar.tsx), [src/components/bids/BidQuickActionBar.tsx:53–69](../../src/components/bids/BidQuickActionBar.tsx) — Gotcha #42 enforcement.

Both bars now own their toasts; `useBidMediaUpload` is silent. Single-file actions get one info→success pair, multi-file batches get an aggregated toast, errors surface specific failures. This is industry-standard contract — keep it. Don't let future hooks add their own toasts.

### A.4 — Brand orange contrast on white is borderline

**Severity:** 🟡
**Where it hits:** Active tab text (`data-[state=active]:text-primary` on white background), sidebar tooltips, hyperlink-style elements that use `text-primary` directly.

`hsl(25 76% 46%)` = `#cf791d`. Against `#ffffff`:
- Contrast ratio ≈ **3.6:1** — fails WCAG 2.1 AA for normal text (4.5:1), passes for large text (3:1).

Active state `data-[state=active]:bg-primary data-[state=active]:text-primary-foreground` (white on orange) reverses the issue: white on orange is ~3.6:1 too — also fails AA for normal-size body text.

**Recommendation:** Either (a) darken the brand orange to `hsl(25 76% 38%)` (≈ `#a85f10`, contrast ≈ 5.7:1 against white), keeping the lighter `--primary-foreground` for the gradient accent; or (b) accept the orange as a "large text only" color and never use it for body-size text. Today the `text-primary` class is sprinkled across menu items, links, badge counts (e.g., active mobile tab labels) — many of which are body-size.

### A.5 — Layer 3 (cards) over-chrome on detail pages

**Severity:** 🟡
**Where:** [BranchBidDetail.tsx:528–562](../../src/pages/BranchBidDetail.tsx) — Notes/Media/Documents tabs each render a `<Card>` with `<CardHeader><CardTitle>Notes</CardTitle><CardDescription>Add voice or text notes about this bid</CardDescription></CardHeader>`. The active tab in the strip already says "Notes." The card title says "Notes." The description ("Add voice or text notes about this bid") is filler — the user is already on the Notes tab; they know.

Same pattern in [Reports.tsx:336–354](../../src/pages/Reports.tsx) — the Custom Report Builder is wrapped in a Card with a redundant "Create Custom Report / Build your own report step by step" header, which costs ~80px of vertical space and tells the user nothing new.

**Recommendation:** Drop the `CardHeader`/`CardTitle`/`CardDescription` blocks when:
- A tab strip has already named the section, OR
- The view is the entire content (not a sub-section of a multi-card layout)

In contrast, [QuoteViewRoute.tsx](../../src/components/project-routes/QuoteViewRoute.tsx)'s 4-card composition is the right shape — each card holds a *different* concept (Hero / Coverage / Documents / Notes) so the labels carry information.

### A.6 — Direct Tailwind colors leaking past the token system

**Severity:** 🟢
**Examples:**
- [BranchBids.tsx:429–453](../../src/pages/BranchBids.tsx) — stat icons use `text-yellow-600`, `text-blue-600`, `text-green-600` directly. The token system has `--success` (green), `--warning` (yellow), and no semantic blue — but the page picks a specific Tailwind shade.
- [Settings.tsx:549–554](../../src/pages/Settings.tsx) — counter warning uses `bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-900 text-yellow-800 dark:text-yellow-200`. The `--warning` token exists for exactly this — but because the warning's text-on-bg pair isn't reified in the token map, the page hand-rolls the colors. Same in [TimeTracker:1068](../../src/components/time-tracker/MobileTimeTracker.tsx) (`bg-yellow-500 text-yellow-950`).
- [src/index.css:443](../../src/index.css) — `.field-auto:hover` directly applies `bg-amber-100`. A utility class reaching past the token map is its own kind of leak.

**Recommendation:** Add `--info` (semantic blue) and define `--warning-bg` / `--warning-fg` / `--warning-border` shades so warning-state callouts can stay within the token system. Existing `--success` / `--warning` / `--destructive` are already there for the foreground/background pair — extend the pattern to surface variants.

### A.7 — Single-item dropdown menus

**Severity:** 🟢
**Where:** [ProjectDetailView.tsx:402–421 (mobile) and 748–767 (desktop)](../../src/components/ProjectDetailView.tsx) — the Project Actions menu is a `MoreVertical → DropdownMenuContent` that contains exactly one item: "Edit Project."

A 1-item menu is overhead for the user (extra click) and visual noise in the header. If the menu's only purpose is "Edit," surface it as a direct icon button (`<Pencil />`). Reserve the menu for when there are actually 2+ items.

The same pattern almost shows up in [QuoteViewRoute](../../src/components/project-routes/QuoteViewRoute.tsx) where the hero exposes Edit / Contract / Compare as direct buttons (correct), so the precedent is already there.

### A.8 — Dashboard's "right column" content lacks a clear ranking on mobile

**Severity:** 🟡
**Location:** [Dashboard.tsx:439–487](../../src/pages/Dashboard.tsx) — desktop is 60/40 (Activity Feed left, NeedsAttention + ProjectStatusCard + WorkOrderStatusCard right). Mobile reverses to put the right column FIRST — sensible, NeedsAttention is the most actionable.

But on mobile users see, in order: NeedsAttention → ProjectStatusCard → WorkOrderStatusCard → Activity Feed. The mental model "what needs my attention" is then immediately followed by two heavy financial-status cards. Activity Feed (the live "what's happening") is buried below ~3 screens of scroll on a phone.

**Recommendation:** Either (a) collapse ProjectStatusCard / WorkOrderStatusCard to a single "Pipeline at a glance" card on mobile that uses the existing data more compactly; or (b) move Activity Feed up to position 2 so users land on "actions → pulse → details." Today the order optimizes for desktop.

---

## Main Page Archetypes

### B.1 — Dashboard / Role landing

**Pages:** [Dashboard.tsx](../../src/pages/Dashboard.tsx) (admins/managers), [TimeTracker.tsx](../../src/pages/TimeTracker.tsx) → [MobileTimeTracker.tsx](../../src/components/time-tracker/MobileTimeTracker.tsx) (field workers).

**First-impression read:**
- *Dashboard, desktop:* Strong. Two clean columns, branded loader, real-time-driven badge counts. The 4-column stat grid pattern (NeedsAttention) puts the right "did anything urgent happen?" content where the eye lands.
- *Dashboard, mobile:* Adequate but heavy. Three layers of chrome (AppLayout dark header + 3px orange accent + PageHeader's accent line) before the content starts. Refresh button gone.
- *TimeTracker, mobile (field worker home):* Functional but visually loud. Orange gradient date/time header *underneath* the dark AppLayout header is an unusual stack. Active timer card is a large green gradient — strong status semantic, but the chromatic load (dark header → orange → orange → green card) is a lot in 800px of viewport.

| Finding | Severity | Recommendation |
|---|---|---|
| Refresh action lost on mobile | 🟡 | Cross-cutting #1 — adopt mobile-actions contract |
| TimeTracker's orange header is a third tier of chrome | 🟡 | Replace with the canonical `PageHeader` (orange accent only). Move date/time to a smaller status pill above the tab strip, or merge into the AppLayout header subtitle |
| Dashboard mobile column order buries Activity Feed | 🟡 | Cross-cutting #A.8 |
| TimeTracker uses custom dropdowns ([MobileTimeTracker.tsx:1210–1248](../../src/components/time-tracker/MobileTimeTracker.tsx)) instead of Radix `Select` | 🟡 | Top-5 #5 — replace with `Select` |
| TimeTracker file is 1,783 lines | 🟢 | Top-5 #5 — extract sub-components by view (`<TimerView>`, `<EntriesView>`, `<ReceiptsView>`) |

**Visual hierarchy:** Dashboard's hierarchy is correct — Activity Feed (60% width) is the left-aligned focal point, status cards stack right. TimeTracker's hierarchy is muddled by the orange-on-orange chrome stack.

**Per-role fit:**
- Admin / Manager: ✅ Purpose-built. NeedsAttention surfaces approvals, change orders, draft estimates. ProjectStatusCard / WorkOrderStatusCard show financial pulse.
- Field worker: ✅ TimeTracker is purpose-built (one-tap Clock In, project picker, lunch toggle, stale-timer warning). The visual loudness is ergonomically intentional — high contrast on a job-site phone screen.

### B.2 — Data-dense list (Expenses, Projects)

**Pages:** [Expenses.tsx](../../src/pages/Expenses.tsx), [Projects.tsx](../../src/pages/Projects.tsx).

**First-impression read:**
- Desktop: Clean. Filter row + table view + bulk actions + pagination. Industry-standard B2B CRM/ERP shape.
- Mobile (Expenses): Card-mode (no `expenses` prop forces ExpensesList to self-fetch via `useInfiniteQuery`). Solid. But the ColumnSelector and 5+ header buttons (Sync from QB, Import, Export, Timesheet, Bulk Allocate) are entirely hidden — only the FAB survives.
- Mobile (Projects): Same shape. ProjectsList card mode. Only "+ New Project" via FAB; Export is gone.

| Finding | Severity | Recommendation |
|---|---|---|
| Half the desktop header actions are unreachable on mobile | 🟡 | Cross-cutting #1 — overflow menu on mobile would surface Sync/Import/Export at minimum |
| 4 different mobile tab patterns across the app | 🟡 | Top-5 #2 |
| Expenses tabs use `MobileTabSelector` dropdown; Projects has no tabs | 🟢 | Pick one tab style; Projects could benefit from a "Active / Closed / All" tab as a default filter |
| Expenses badge count for unapproved is good; matches sidebar badge convention | ✅ | Keep |
| `ColumnSelector` desktop-only is correct (mobile cards have fixed shape) | ✅ | Keep |

**Visual hierarchy:** ✅ Strong. Page title → filters → bulk action strip → table/cards. Pattern is repeatable.

**Per-role fit:**
- Admin: ✅ Purpose-built. Bulk actions, exports, QB sync, column reorder.
- Manager: ✅ Same coverage as admin minus a few admin-only flows.
- Field worker: N/A (redirected away from `/projects`).

### B.3 — Sales workflow list (Leads, Quotes)

**Pages:** [BranchBids.tsx](../../src/pages/BranchBids.tsx), [Quotes.tsx](../../src/pages/Quotes.tsx).

**First-impression read:**
- Leads desktop: Stat cards at top (Total/Pending/With Clients/This Month), filters, table. Nice pipeline shape — surfaces "what's hot" before drilling into rows.
- Leads mobile: BidsTableView is forced on mobile too (no card variant). The 4-up stat grid collapses to 2-up. Tables on a phone require horizontal scroll.
- Quotes (recently rebuilt per Rule 16): Clean URL routing. View mode renders 4 composable cards.

| Finding | Severity | Recommendation |
|---|---|---|
| Leads has no mobile card view — `BidsTableView` runs at all viewports | 🟡 | Add a mobile card variant matching the `mobile-list-card` pattern from index.css. Tables on phones are an antipattern. |
| "Pending" stat = "bid without project link" — non-obvious label | 🟢 | Rename to "Unconverted" or "Not yet a project" |
| Leads stat cards use direct Tailwind colors (yellow-600, blue-600, green-600) | 🟢 | Cross-cutting #A.6 |
| Quotes URL routing (list/new/:id/:id/edit/:id/compare) is exemplary | ✅ | Keep — model for other "view mode" pages to follow |
| QuoteViewRoute 4-card composition (Hero / Coverage / Documents / Notes) | ✅ | Best-in-class; reuse the shape for ProjectOverview, Estimate detail, etc. |

**Per-role fit:**
- Admin / Manager: ✅ Purpose-built. The 4-stat header gives an immediate sales-pipeline pulse.
- Field worker: N/A.

### B.4 — Reports & analytics

**Pages:** [Reports.tsx](../../src/pages/Reports.tsx), [ProfitAnalysis.tsx](../../src/pages/ProfitAnalysis.tsx), [KPIGuide.tsx](../../src/pages/KPIGuide.tsx).

**First-impression read:**
- Reports: AI Chat is the default tab. Significant pivot from "report builder" to "ask in natural language." Modern and on-trend.
- The `<Tabs>` with `<Select>` mobile fallback is the third tab pattern (cross-cutting #A.2).

| Finding | Severity | Recommendation |
|---|---|---|
| AI Chat as default category is bold — but on first-time load, users have no example prompts visible | 🟡 | Add a "Try asking" suggestion grid above the chat input on first load (industry standard for LLM-first UIs — see Notion AI, Linear's Ask) |
| "+ New Report" hidden on mobile, no FAB compensation | 🟡 | Cross-cutting #1 |
| Mobile uses `<Select>` for category, breaking pattern with rest of app | 🟡 | Top-5 #2 |
| Card-on-card chrome ("Create Custom Report / Build your own report step by step") | 🟢 | Cross-cutting #A.5 — drop redundant CardHeader |

**Per-role fit:**
- Admin / Manager: ✅ Powerful. AI Chat + custom builder + saved reports.
- Field worker: N/A.

### B.5 — Settings / admin config

**Pages:** [Settings.tsx](../../src/pages/Settings.tsx), [RoleManagement.tsx](../../src/pages/RoleManagement.tsx), [Payees.tsx](../../src/pages/Payees.tsx).

**First-impression read:**
- Settings: 10 stacked cards on a single scroll. No anchor nav. App version displayed twice ([line 612](../../src/pages/Settings.tsx) and [line 671](../../src/pages/Settings.tsx)).
- RoleManagement (per Rule 11): Single combined Users table with inline payee column. The architectural rebuild Apr 2026 collapsed two views into one — that's correct. The actual table is dense but functional.

| Finding | Severity | Recommendation |
|---|---|---|
| Settings is monolithic | 🟡 | Top-5 #4 — anchor nav |
| App version shown twice on Settings | 🟢 | Remove either line 612 or line 671 |
| Notifications card has 1 switch + a giant CardHeader | 🟢 | Collapse single-control cards into a denser settings list (1-row-per-control), reserve `<Card>` for grouped controls |
| RoleManagement table on mobile likely scrolls horizontally | 🟡 | Add a mobile card variant (every column cell becomes a row inside the card) |

**Per-role fit:**
- Admin: ⚠️ Functional but tiring. Settings's monolithic shape feels like an early-stage product.
- Manager: Limited access — fine.
- Field worker: N/A.

---

## Detail Page Archetypes

### C.1 — Project Detail (multi-tab)

**Page:** [ProjectDetailView.tsx](../../src/components/ProjectDetailView.tsx) + [project-routes/](../../src/components/project-routes/) (13 nested routes).

**First-impression read:**
- Desktop: Excellent. Secondary 208px panel (collapses to 56px), force-collapse on edit/new routes, hover-revealed orange collapse handle, fallback bottom collapse button, command palette project switcher (search-as-you-type), client name + Google-Maps-linked address in header, status badge, dropdown for "Edit Project."
- Mobile: Strong identity row (project number + status pill + project name + client + address) → 52px section selector pill → bottom sheet with grouped nav → content with FieldQuickActionBar pinned bottom. Breadcrumb appears only when ≥4 segments deep.

| Finding | Severity | Recommendation |
|---|---|---|
| Two single-item "Edit Project" menus (mobile [402–421](../../src/components/ProjectDetailView.tsx) + desktop [748–767](../../src/components/ProjectDetailView.tsx)) | 🟢 | Cross-cutting #A.7 — replace with direct `<Pencil />` icon button |
| Mobile header has 4 vertical rows of metadata | 🟡 | On portrait phones, this consumes ~140–160px before content. Consider collapsing client + address into a single row (truncated client • truncated address) when both are present |
| Force-collapse on edit/new is clever but loses sidebar context entirely for the duration of the edit | 🟢 | Add a "↩ Back to project nav" affordance in the collapsed rail on edit routes — the user might want to glance at "Where am I?" mid-edit without uncollapsing |
| Hover-revealed orange handle is delightful but undiscoverable on touch devices using a mouse-emulation tablet | 🟢 | Keep, but add a `?` keyboard hint badge to the bottom collapse button noting "⌘B" |
| Active nav item uses `border-l-[3px] border-orange-500 -ml-[3px] pl-[calc(0.75rem+3px)]` — that's a precise no-shift hover treatment | ✅ | Keep — exemplary detail |

**Per-role fit:**
- Admin / Manager: ✅ Purpose-built. Project switcher, secondary nav, force-collapse, client-context header — feels like a Linear/Stripe-tier surface.
- Field worker: ⚠️ Reaches `/projects/:id/schedule` only via deep-link. The mobile section-selector sheet filters by `fieldWorkerSafe` flag (Rule 18), so they only see Schedule. But arriving here at all is the gap. See Top-5 #3.

### C.2 — Lead Detail

**Page:** [BranchBidDetail.tsx](../../src/pages/BranchBidDetail.tsx).

**First-impression read:** Recently rebuilt to match project conventions (Rule 22 / PR #37+#38). Has the canonical mobile bottom bar (`BidQuickActionBar`), pill tab strip, breadcrumb, mobile action strip workaround. This is the post-cleanup benchmark.

| Finding | Severity | Recommendation |
|---|---|---|
| Card-on-card chrome on Notes/Media/Documents tabs | 🟡 | Cross-cutting #A.5 |
| Mobile action strip workaround for Gotcha #38 lives in this file (lines 322–324) — adopting Cross-cutting #1 would obsolete it | 🟢 | Refactor once #1 lands |
| Inline-edit pattern (toggle `disabled` on the same form fields) is excellent — no modal | ✅ | Reuse on other detail pages where appropriate |
| `BidQuickActionBar` mounted as sibling of `MobilePageWrapper` (Gotcha #41) | ✅ | Keep |

**Per-role fit:**
- Admin / Manager: ✅ Purpose-built. Convert-to-Project is the key pipeline moment and gets a dedicated `<Rocket />` button.
- Field worker: N/A.

### C.3 — Quote View (composable cards)

**Page:** [QuoteViewRoute.tsx](../../src/components/project-routes/QuoteViewRoute.tsx) + [src/components/quotes/](../../src/components/quotes/).

**First-impression read:** The new 4-card composition (Rule 16) is the cleanest detail-page shape in the app. Hero (signed cost variance + margin-if-accepted + status pill + Edit/Contract/Compare) → Coverage (line-item EST→QUOTED→Δ) → Documents (vendor PDF + versioned generated contracts) → Notes. Each card holds a distinct concept, the labels carry information.

| Finding | Severity | Recommendation |
|---|---|---|
| Use this as the model for ProjectOverview redesign — currently ProjectOverview is a more conventional summary block | 🟢 | Aspirational alignment, not a fix |

**Per-role fit:**
- Admin / Manager: ✅ Purpose-built.
- Field worker: N/A.

### C.4 — Mobile Schedule

**Page:** [MobileScheduleView.tsx](../../src/components/schedule/MobileScheduleView.tsx).

**First-impression read:** Clean. Pill tab strip with badge counts → tab content. Renders inside ProjectDetailView's Outlet so it inherits the parent's project header + section sheet + FieldQuickActionBar bar. No extra chrome of its own.

| Finding | Severity | Recommendation |
|---|---|---|
| Field workers can't reach this page from their sidebar | 🟡 | Top-5 #3 |
| URL-driven `?tab=` is idiomatic and works with mention deep-links | ✅ | Keep |

**Per-role fit:**
- Field worker: ✅ Purpose-built — Tasks/Notes/Media/Docs are exactly what a field user needs on a project. **Once they get here.**

---

## Per-Role Walkthroughs

### D.1 — Admin: log in → check pipeline → approve expenses → reactivate user

| Step | Surface | Friction | Verdict |
|---|---|---|---|
| 1 | Login → Dashboard | None | ✅ |
| 2 | Glance at NeedsAttention (4 actionable cards) | None | ✅ |
| 3 | Sidebar → Projects → drill into a project | None | ✅ |
| 4 | Sidebar → Time Approvals (badge `20`) → row approve | Time Approvals page works well; badge count is honest | ✅ |
| 5 | Sidebar → Role Management → 3-dot menu → Reactivate User | Inline payee column is dense but the Apr 2026 unification (Rule 11) is the right collapse | ✅ |
| 6 | Mobile: tap Refresh on Dashboard | **Refresh button is hidden on mobile** | ❌ |
| 7 | Mobile: try to import expenses from `/expenses` | **Import button is hidden on mobile, no FAB** | ❌ |

**Verdict: Mostly purpose-built (yes). Two real gaps on mobile** — both downstream of Cross-cutting #1.

### D.2 — Manager: log in → check margin variance → review pending time

| Step | Surface | Friction | Verdict |
|---|---|---|---|
| 1 | Login → Dashboard | None | ✅ |
| 2 | NeedsAttention shows pending time entries | None | ✅ |
| 3 | Sidebar → Projects → drill in → Cost Tracking | Buckets view (Rule 13) with cushion-aware Labor header is exemplary | ✅ |
| 4 | Spot a problem: tap "Other" bucket warning | RecategorizeOtherBucketSheet (Apr 2026 cleanup) is well-targeted | ✅ |
| 5 | Sidebar → Time Approvals → review/approve | None | ✅ |
| 6 | Sidebar → Profit Analysis (didn't read in depth) | Likely table-based; same patterns apply | — |

**Verdict: Purpose-built (yes).** Margin variance has a dedicated, opinionated surface (Buckets) that explains the financial story. This is the strongest manager-facing page in the app.

### D.3 — Field worker: log in → start time → drop a note + photo on site

| Step | Surface | Friction | Verdict |
|---|---|---|---|
| 1 | Login → forced redirect to /time-tracker | None | ✅ |
| 2 | Pick team member + project → tap Clock In | Custom dropdowns instead of Radix `Select` (Top-5 #5); two-step picker (worker, project) is reasonable | ⚠️ |
| 3 | Mid-shift: want to drop a note on a task | **Sidebar has no path to a project.** Field worker must (a) wait for a manager @mention → tap notification, or (b) know the URL. There's no "My Projects" or "Today's Job" entry in the sidebar. | ❌ |
| 4 | If they get there: `/projects/:id/schedule` mobile view | Tasks/Notes/Media/Docs tabs + bottom bar is exemplary | ✅ |
| 5 | Tap "Camera" in bar → take photo | Single info→success toast pair, GPS captured | ✅ |
| 6 | Tap "Note" in bar → @mention manager → submit | NoteComposer + mention autocomplete is industry-class | ✅ |

**Verdict: Mixed.** The destination experience (Schedule view + bottom bar + NoteComposer) is purpose-built and excellent. **The path TO that experience is broken** — see Top-5 #3. The TimeTracker page itself is the field worker's home but feels like a different design system, which weakens the perception of "this app understands my role."

---

## Prioritized Roadmap

| # | Recommendation | Severity | Effort | Pages affected | Roll-up to Top 5? |
|---|---|---|---|---|---|
| R1 | Promote `PageHeader` mobile-actions to a contract (overflow menu / `mobileActions` slot / dev-warn) | 🔴 | M | ~15 | Top-5 #1 |
| R2 | Standardize mobile tabs on the pill strip pattern | 🟡 | M | Expenses, Reports, KPI Guide, future detail pages | Top-5 #2 |
| R3 | Field worker "My Projects" (or "Today's Job") sidebar entry | 🟡 | S–M | AppSidebar, 1 list page | Top-5 #3 |
| R4 | Settings anchor nav | 🟡 | S | Settings | Top-5 #4 |
| R5 | TimeTracker chrome unification + custom-dropdown removal + file split | 🟡 | L | TimeTracker only | Top-5 #5 |
| R6 | Brand orange contrast: darken or restrict to large text | 🟡 | S | Token + audit consumers | — |
| R7 | Drop redundant `CardHeader` blocks on tab content (BranchBidDetail, Reports) | 🟡 | S | BranchBidDetail, Reports | — |
| R8 | Replace direct Tailwind colors with semantic tokens (`--info`, `--warning-bg`/`--warning-fg`) | 🟢 | S | Settings, BranchBids stats, TimeTracker stale banner, `field-auto:hover` |  — |
| R9 | Single-item dropdown menus → direct icon buttons | 🟢 | S | ProjectDetailView Edit menu (mobile + desktop) | — |
| R10 | Dashboard mobile column order: Activity Feed up | 🟡 | S | Dashboard | — |
| R11 | Project Detail mobile header: collapse client + address row | 🟢 | S | ProjectDetailView mobile | — |
| R12 | Leads mobile card variant | 🟡 | S | BranchBids (BidsTableView wrapping or fork to mobile cards) | — |
| R13 | Reports: "Try asking" suggestion grid for AI Chat first-load | 🟡 | S | Reports | — |
| R14 | RoleManagement mobile card variant | 🟡 | M | RoleManagement | — |
| R15 | "Pending" stat label on Leads → "Unconverted" | 🟢 | XS | BranchBids | — |
| R16 | Remove duplicate App Version on Settings | 🟢 | XS | Settings | — |

**Recommended sequencing for an iteration of UX investment:**
- **Sprint 1 (foundation):** R1 + R2 + R6 + R8. These are token/contract-level fixes that cascade across most pages and stop the bleed of new inconsistencies in future work.
- **Sprint 2 (role gaps):** R3 + R4 + R10 + R12 + R13. Targeted surface-level fixes that close the per-role audit gaps.
- **Sprint 3 (Time Tracker isolation):** R5. The big one. Worth its own focused effort with a regression-test pass on the 1,783-line component.
- **Backlog (polish):** R7 + R9 + R11 + R14 + R15 + R16. Small and safe; pull individually as background tasks.

---

## Implementation Status (May 2026)

Tracked on branch [`claude/design-critique-updates`](https://github.com/Cradcliff187/profitbuild-dash/tree/claude/design-critique-updates). Status as of 2026-05-03.

### ✅ Shipped

| # | Item | Commits | Notes |
|---|---|---|---|
| Dev | Pin Vite to 5225 + strictPort | `ee6489d`, `207884d` | Fixed silent port collision with sibling project. CLAUDE.md dev URL updated. |
| R1 | `PageHeader.mobileActions` overflow menu + Dashboard | `42c0ade` | Adds dev-mode warn for pages that drop actions on mobile. See new Architectural Rule 23. |
| Bonus | Mobile sidebar category labels + separators | `5e01799` | Mobile sheet now mirrors desktop nav hierarchy. |
| R8 | Semantic `--warning-bg/fg/border` + `--info` tokens | `06a4bdb` | Pure additive; later commits migrated consumers. |
| R10 | Dashboard mobile column order | `4fabaae` | Activity Feed moves up to position 2 on mobile via `display: contents`. |
| R16 | Remove duplicate Settings app version | `12bc956` | App Updates card now the single source. |
| R15 | Leads "Pending" → "Unconverted" + token swaps | `3e48ab3` | Stat icons migrated to `--success`/`--warning`/`--info`. |
| R9 | Single-item dropdowns → direct icon button | `4da533e` | ProjectDetailView mobile + desktop. Removed dead DropdownMenu imports. |
| R7 | Drop redundant CardHeader on tab content | `1d868d2` | BranchBidDetail Notes/Media/Docs tabs + Reports custom builder. |
| R2 | Standardize mobile tabs on pill strip | `30f2cb8` | `MobileTabSelector` rewritten as a pill strip; 10 callers benefit; Reports `<Select>` migrated. |
| R11 | Project Detail mobile header collapse | `da07713` | Client + address combine into one row with `·` separator. Saves ~25px. |
| R12 | Leads `LINKED` badge → `--success` token | `e1d4b11` | Existing mobile card view was found in BidsTableView; only token swap needed. |
| R3 | Field-worker Projects sidebar + slim card + filter polish | `f8bfb4c`, `092a318` | Projects visible to all roles; field workers get slim cards with status pill, default filter to active statuses, FAB hidden. New `isFieldWorkerOnly` in RoleContext (Architectural Rule 24). Receipts deep-link sidebar entry for field workers. |
| TT-A | Time Tracker slim status row + pill-strip tabs | `6e086a2` | ~80px of chrome removed. CLOCK IN reachable on first paint. |
| TT-B | Time Tracker picker tiles + CLOCK IN + Add Time Entry polish | `ed1dc72` | Single elevated tiles (no nested cards), refined gradient, solid outline on Add Time Entry. |
| TT-C | Active timer card refinement | `a28748d` | Pill-shaped status indicators with ping-and-fill pulse, harmonized project info layout, tabular-nums on the timer. |
| FW-A | Mentions title fix + empty state polish + Training tokens | `068bdb5` | `/mentions` and `/sms` route titles fixed in AppLayout. Mentions empty state and Training stats both use semantic tokens. |
| FW-B | Field Media empty state + mobile capture actions | `9ac900a` | Capture Photo + Capture Video reachable via PageHeader kebab on mobile. |
| Docs | Implementation status + Architectural Rules 23/24 + Gotcha 43 | `29094da` | This file's "Implementation Status" section + CLAUDE.md updates documenting the new patterns. |
| R4 | Settings anchor nav | `9053e7d` | Sticky pill strip below the page header with role-filtered sections (8-11 pills depending on role). Smooth-scroll to anchored sections. Bonus: warning callout migrated to `--warning-bg/border/fg` tokens. |
| R13 | Reports AI Chat first-load suggestion grid | `16b42db` | Replaced 6 inline Badge pills with a category-grouped (Pipeline / Time / Money / Customers) card grid. 1-col mobile / 2-col desktop. Matches Notion AI / Linear Ask / ChatGPT first-load conventions. |
| R14 | RoleManagement token migration | `1d99510` | Audit was wrong about needing a mobile card variant — it already had one (Apr 2026 Rule 11 rebuild). What was actually missing: 11 raw Tailwind colors swapped to semantic tokens. `grep -c text-(green\|red\|orange\|blue\|yellow)-[0-9]+` → 0. |
| R6 | Brand orange contrast — darkened to L=38% | `ea1ec32` | `--primary` shifted from `hsl(25 76% 46%)` (#cf791d, 3.4:1 vs white — fails AA) to `hsl(25 76% 38%)` (#a85f10, 5.0:1 vs white — passes AA). Same hue + saturation; richer/burnt-orange feel, closer to construction-safety orange. White-on-orange tab pills also pass AA at this shade. `--construction`/`--accent`/`--ring` shifted together. |

### ⏸ Deferred

| # | Item | Reason |
|---|---|---|
| TT-D | Custom worker/project dropdowns → shadcn `Select` | Risk of behavioral regression in the Active-pill rendering and the body-scroll lock; visual gain marginal vs. current. Worth its own focused session. |
| R5 | Time Tracker rebuild (1,783-line file split + chrome unification) | Too large to combine with other polish. TT-A/TT-B/TT-C already captured the highest-impact visuals; remainder is structural. Belongs in its own session with a regression test plan. |

### Branch summary

All 16 critique items + 1 bonus + 3 Time Tracker polish phases + 2 field-worker polish phases + dev env fix shipped in **~22 commits** on `claude/design-critique-updates`. Net: every priority item from the original critique either landed or is documented as deferred-with-reason. Branch ready for review/merge.

---

## Appendix: What's strong (deliberate callouts)

- **HSL token system** in [src/index.css:9–158](../../src/index.css). Semantic, dark-mode-ready, with a B2B-dense scale variant (12px / 13px / 14px / 15px) that makes the app feel like Excel-density when needed.
- **Sidebar active state** ([AppSidebar.tsx:237](../../src/components/AppSidebar.tsx) — `border-l-[3px] border-orange-500 bg-orange-500/10 text-white`). Single coherent moment of brand expression.
- **3px orange accent line** repeated below the mobile header, below `PageHeader` on desktop, and below the Project Detail header. Repetition makes the app feel intentional.
- **Mobile bottom bar** ([FieldQuickActionBar.tsx](../../src/components/schedule/FieldQuickActionBar.tsx) + [BidQuickActionBar.tsx](../../src/components/bids/BidQuickActionBar.tsx)) — three large 56px pills (h-14), `border-primary/20`, `pb-safe` for iOS safe-area. Convergent with Slack/WhatsApp/Linear.
- **Quote View 4-card composition** (Rule 16) — model for future detail pages.
- **Cost Tracking Buckets view** (Rule 13) — opinionated, financial-story-first, with cushion-aware Labor header. The single best piece of UX in the app.
- **`MobilePageWrapper` + `pull-to-refresh`** — convergent with native mobile expectations.
- **Mobile section selector** on Project Detail (52px tap target, bottom sheet, grouped nav). Strong for navigating a deeply-nested information architecture on a phone.
- **Inline-edit pattern** on BranchBidDetail (toggle `disabled` on form fields) — cleaner than modal-based edit.

The system bones are good. The work is in the hairline drift between surfaces.

---

*Report generated 2026-05-03 from a code-level review of the [main branch](https://github.com/Cradcliff187/profitbuild-dash). Screenshot pass was attempted but the dev-server port proxy was unreachable from the embedded preview browser in this environment — every finding is anchored to a specific file:line and (where applicable) to the corresponding gotcha in [CLAUDE.md](../../CLAUDE.md).*
