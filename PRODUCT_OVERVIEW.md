# RCG Work - Application Capability Overview

**Construction Project Management & Financial Tracking Platform**

RCG Work is a comprehensive construction management application built for Radcliff Construction Group. It serves the entire organization from field workers through executives, providing project management, financial tracking, field operations, and team communication tools.

---

## Executive Summary

RCG Work combines **eight core modules** into a unified platform:

| Module | Primary Users | Key Value |
|--------|--------------|-----------|
| **Estimation & Project Management** | Project Managers, Executives | Streamlined bid-to-project workflow |
| **Project Scheduling (Gantt)** | Project Managers | Visual timeline with dependencies |
| **Field Worker Portal** | Field Crews | Mobile time tracking, receipts, media capture |
| **Financial Operations** | Accounting, PMs | Real-time profit tracking, QuickBooks integration |
| **Reporting & Analytics** | All Roles | 21+ templates across 6 categories, custom builder |
| **Training Center (LMS)** | Admins → All Users | Lightweight learning management |
| **Communication Hub** | Admins, Managers | SMS alerts, scheduled reminders, branded emails |
| **Administration** | Admins | Users, roles, branding, settings |

---

## Module 1: Estimation & Project Management

### Project Lifecycle

Projects flow through a defined status workflow:
```
Estimating → Quoted → Approved → In Progress → Complete
                                      ↓
                                  On Hold / Cancelled
```

### Project Types

| Type | Description | Use Case |
|------|-------------|----------|
| **Construction Projects** | Full-scope jobs | New builds, remodels, renovations |
| **Work Orders** | Smaller service jobs | Repairs, maintenance, quick fixes |
| **System Projects** | Internal tracking | SYS-000, 000-UNASSIGNED |
| **Overhead Projects** | Expense allocation | 001-GAS, 002-GA (expenses/receipts only) |

### Estimation Features

- **Hierarchical Line Items**: Phases → Categories → Items with cost/price breakdown
- **Estimate Versioning**: Track revisions with version history
- **Contingency Tracking**: Built-in contingency with usage monitoring
- **Internal vs External Costs**: Separate labor (internal) from vendor costs

### Quote Management

- **Quote Requests**: Create RFQs for subcontractors/vendors
- **Quote Comparison**: Side-by-side vendor quote analysis
- **Quote Acceptance**: Accept quotes that update project cost projections
- **Quote-to-Estimate Linking**: Connect vendor quotes to estimate line items

### Bid Management

- **Branch Bids**: Capture incoming bid requests
- **Client Association**: Link bids to existing or new clients
- **Bid-to-Project Conversion**: Convert accepted bids into active projects

### Change Order Management

- **Change Order Creation**: Document scope changes with cost/revenue impact
- **Approval Workflow**: Pending → Approved/Rejected status flow
- **Financial Impact Tracking**: Track margin impact of change orders
- **Line Item Detail**: Change orders have their own line items

### Project Financial Fields (Database-Calculated)

| Metric | Description |
|--------|-------------|
| `contracted_amount` | Approved estimate + approved change order revenue |
| `current_margin` | Contract amount - actual expenses |
| `margin_percentage` | Margin as percentage of contract |
| `projected_margin` | Expected final margin using best cost data |
| `contingency_remaining` | Unused contingency budget |
| `total_accepted_quotes` | Sum of accepted vendor quotes |

---

## Module 2: Project Scheduling (Gantt Chart)

### Interactive Gantt Chart

- **Visual Timeline**: gantt-task-react powered interactive scheduling
- **Task Representation**: Each estimate/change order line item becomes a schedulable task
- **View Modes**: Day, Week, Month views
- **Drag-and-Drop**: Reschedule tasks by dragging on timeline

### Task Scheduling Features

- **Start/End Dates**: Set scheduled dates for each task
- **Duration Tracking**: Automatic duration calculation
- **Multi-Phase Tasks**: Split single line items into multiple execution phases
- **Milestones**: Mark critical completion points

### Dependencies

- **Task Dependencies**: Define predecessor relationships
- **Visual Arrows**: Dependencies shown as connecting lines
- **Sequence Warnings**: Alerts for unusual scheduling patterns (e.g., scheduling before dependencies complete)

### Change Order Integration

- **Visual Distinction**: Change order tasks display with different styling
- **Automatic Updates**: New approved change orders appear on schedule
- **CO Badge**: Clear identification of change order items

### Schedule Export

| Format | Description |
|--------|-------------|
| CSV | Task list spreadsheet |
| Daily Activity | Day-by-day breakdown |
| MS Project | Compatible with Microsoft Project/Primavera |
| PDF | Printable Gantt chart |

### Schedule Statistics Dashboard

- Project duration calculation
- Completed task count
- Overdue task identification
- Critical path item count

---

## Module 3: Field Worker Portal

### Mobile Time Tracking

The field worker experience is optimized for mobile devices (PWA with Capacitor):

#### Clock In/Out Flow
1. **Select Worker**: Choose from internal labor team members
2. **Select Project**: Mobile-optimized project picker (construction only)
3. **Clock In**: Start timer with automatic time capture
4. **Clock Out**: Stop timer with lunch prompt option

#### Lunch Period Tracking
- **Lunch Prompt**: On clock-out, asks if lunch was taken
- **Duration Options**: 15, 30, 45, 60, 90, 120 minutes
- **Net Hours Calculation**: Automatically calculates worked hours minus lunch
- **Display**: Shows 🍴 indicator on entries with lunch taken

#### Time Entry Features
- **Manual Entry**: Create time entries without clocking in
- **Edit Capability**: Modify existing entries (with overlap detection)
- **Weekly View**: Grid-style timesheet overview
- **Offline Support**: Clock in/out works offline, syncs when connected
- **Receipt Prompt**: After clock-out, option to add a receipt

### Receipt Capture

- **Camera Integration**: Capture receipts using device camera
- **Project Assignment**: Associate receipt with a project
- **Expense Linking**: Connect receipts to expense records
- **Metadata**: Capture date, amount, description
- **Email Notification**: Admins notified of new receipt captures

### Field Media (Photo/Video)

#### Photo Capture
- **GPS Tagging**: Automatic location capture when available
- **Caption Support**: Text captions with AI enhancement option
- **Voice Captions**: Speak caption, transcribed via AI
- **Quick Capture Mode**: Streamlined multi-photo workflow
- **EXIF Metadata**: Timestamp, device info when available

#### Video Capture
- **Duration Limits**: Configurable max duration
- **Thumbnail Generation**: Auto-generated video thumbnails
- **Project Association**: All media linked to specific projects

#### Media Gallery
- **Project-Scoped View**: Browse media by project
- **Photo/Video Tabs**: Separate views for each media type
- **Comments**: Add comments to individual media items
- **Report Generation**: Export media as formatted PDF reports

---

## Module 4: Financial Operations

### Expense Management

#### Expense Entry
- **Manual Entry**: Create expenses with full detail
- **Category System**: 12 expense categories (labor, materials, equipment, etc.)
- **Transaction Types**: Expense, Bill, Check, Credit Card, Cash
- **Payee Assignment**: Link to vendors/subcontractors

#### Expense Splitting
- **Split Across Projects**: Allocate single expense to multiple projects
- **Percentage or Amount**: Split by percentage or fixed amounts
- **Split Tracking**: Visual indicators for split expenses

#### Receipt-to-Expense Linking
- **Link Receipts**: Connect uploaded receipts to expense records
- **Visual Indicator**: See which expenses have receipts attached

### QuickBooks Integration

#### CSV Import
- **Transaction Import**: Import expenses and revenues from QuickBooks exports
- **Intelligent Parsing**: Handles various QuickBooks CSV formats
- **Header Row Detection**: Automatically skips QuickBooks-specific headers
- **Amount Parsing**: Handles parentheses notation, currency symbols

#### Duplicate Detection
- **In-File Detection**: Identifies duplicates within uploaded file
- **Database Detection**: Checks against existing records before import
- **Composite Key Matching**: date + amount + payee for identification

#### Smart Matching
- **Project Matching**: Maps project numbers from memo/description
- **Payee Matching**: Fuzzy matching with confidence scores
- **Client Matching**: Links revenue transactions to clients
- **Category Mapping**: Maps QuickBooks accounts to internal categories

#### Account Mappings
- **Custom Mappings**: Define QuickBooks account → internal category rules
- **Fallback Logic**: Static mappings → description analysis → default

### Invoice/Revenue Tracking

- **Revenue Entry**: Track invoices and payments received
- **Invoice Splitting**: Split invoices across projects (mirrors expense splitting)
- **Client Association**: Link revenues to clients
- **QuickBooks Import**: Import invoice transactions from CSV

### Profit Analysis

- **Project Profitability**: Real-time margin calculations
- **Budget vs Actual**: Compare estimated vs actual costs
- **Cost Variance**: Track deviations from original estimates
- **Margin Thresholds**: Alerts when margins fall below targets

---

## Module 5: Reporting & Analytics

### Report Builder Architecture

Three-tier system:
```
┌─────────────────────────────────────┐
│   USER INTERFACE (React)            │
│  • Field selection by group         │
│  • Visual filter builder (AND/OR)   │
│  • Live preview with pagination     │
│  • Export controls                  │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│   BUSINESS LOGIC                    │
│  • Report configuration manager     │
│  • Query builder service            │
│  • Export engine (PDF/Excel/CSV)    │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│   DATABASE (PostgreSQL)             │
│  • reporting.project_financials     │
│  • reporting.training_status        │
│  • execute_simple_report RPC        │
└─────────────────────────────────────┘
```

### Data Sources

| Source | Description | Key Fields |
|--------|-------------|------------|
| **Projects** | Project financials view | Margins, costs, revenues, status |
| **Expenses** | All expense records | Amount, category, payee, approval status |
| **Quotes** | Vendor quotes | Amount, status, comparison metrics |
| **Time Entries** | Time tracking data | Hours, rates, worker, approval status |
| **Estimate Line Items** | Estimate detail | Cost/price, category, quantities |
| **Internal Costs** | Labor expenses | Hours, rates, by worker |
| **Training Status** | Training completion | Assignments, completions, due dates |

### Available Report Fields by Category

#### Financial Metrics (25+)
- Contract amounts (estimated revenue)
- Total invoiced (actual revenue)
- Revenue variance (estimated vs actual)
- Total expenses by category
- Current/projected/original margins
- Margin percentages
- Budget utilization
- Cost variance
- Target/minimum margin thresholds

#### Project Information
- Project number, name, client
- Status, type, category
- Start/end dates
- Address, job type

#### Time & Labor Metrics
- Estimated vs actual hours
- Hours variance
- Lunch taken/duration
- Gross hours, net hours
- Hourly rates
- Worker assignments

#### Change Order Metrics
- Change order count
- Revenue impact
- Cost impact
- Margin impact
- Net margin from change orders

#### Contingency Tracking
- Original contingency
- Contingency used
- Contingency remaining

#### Invoicing
- Invoice count
- Total invoiced
- Revenue variance percentage

#### Composition Flags
- Has labor internal
- Has subcontractors
- Has materials
- Has equipment
- Only labor internal
- Category list

### Pre-Built Report Templates (21+)

Organized into **6 categories** with dedicated icons:

| Category | Icon | Reports |
|----------|------|---------|
| **Financial Performance** | 📈 | Project Profitability Analysis, Margin Analysis, Revenue Reconciliation, Billing Progress |
| **Project Management** | 🏢 | Active Projects Dashboard, Projects Summary, Contingency Utilization |
| **Cost Analysis** | 💰 | Expense Report by Category, Cost Variance Report, Budget vs Actual, Change Order Impact |
| **Time & Labor** | ⏱️ | Time Entries Summary, Internal Labor Costs, Internal Labor Hours Tracking |
| **Training** | 🎓 | Training Completion Status, Overdue Training, Training by Employee |
| **Client & Vendor** | 📋 | Client Profitability Ranking, Quote Comparison |

### Report Features

- **Custom Reports**: Build and save custom report configurations
- **Field Browser**: Browse fields by group (financial, dates, status, etc.)
- **Flexible Filtering**: 
  - Multiple filter conditions
  - AND/OR logic support
  - Date range filters
  - Multi-select dropdowns
  - Boolean Yes/No filters
- **Sorting & Pagination**: 25, 50, 100, 200 rows per page
- **Export Formats**: PDF, Excel, CSV
- **Favorites System**: Star frequently used reports
- **Template Actions**: Use, duplicate, add to favorites, view details

### Dashboard & Activity

- **Financial Dashboard**: Real-time KPIs at a glance
- **Activity Feed**: Comprehensive audit trail
  - Time entries, schedule changes, approvals
  - User actions with timestamps
  - Entity-level tracking (project, expense, etc.)
  - Metadata capture for context
- **Project Overview Cards**: Status, margin, progress indicators

---

## Module 6: Training Center (LMS)

### Content Management (Admin)

- **Content Types**: 
  - Video links (YouTube, Vimeo, Loom)
  - Embedded videos
  - Documents (PDF, presentations)
  - External links
- **Content Status**: Draft → Published → Archived
- **Required vs Optional**: Mark content as mandatory
- **Duration Tracking**: Estimated completion time

### Assignment System

- **Assign By**: All users, specific roles, individual users
- **Due Dates**: Set completion deadlines
- **Priority Levels**: Prioritize assignments
- **Notifications**: Email alerts on assignment (via Resend)

### User Experience

- **My Training Page**: View assigned content with status
- **Progress Tracking**: Pending, Completed, Overdue status
- **Content Viewer**: Embedded videos, PDF viewer, external links
- **Completion Acknowledgment**: Mark training as complete with optional notes
- **Time Tracking**: Actual time spent vs estimated

### Reporting Integration

Training integrates with the main report builder (NOT a separate page):

- **Data Source**: `reporting.training_status` view
- **Available Fields**:
  - Employee name, email, active status
  - Content title, description, type
  - Required flag, estimated duration
  - Assignment date, due date, priority
  - Completion date, actual duration
  - Calculated status (pending/completed/overdue)
- **Pre-Built Templates**:
  - Training Completion Status
  - Overdue Training Report
  - Training by Employee
  - Compliance Summary

---

## Module 7: Communication Hub

### SMS Messaging (Textbelt)

#### Send SMS Features
- **Recipient Selection**: 
  - Individual users
  - By role (admin, manager, field worker)
  - By project assignment
  - All field workers
- **Message Composition**:
  - Free-form text
  - Template selection
  - Variable substitution ({{name}}, {{project_name}})
- **Character Counter**: SMS segment estimation
- **Quota Display**: Remaining SMS credits with low-quota warnings

#### Smart Deep Links

| Link Type | Opens To | Use Case |
|-----------|----------|----------|
| `clock_in` | Time Tracker | Morning reminders |
| `timesheet` | Timesheet History | Weekly review |
| `receipt` | Receipt Capture | Expense reminders |
| `project` | Project Details | Assignment notifications |
| `dashboard` | Main Dashboard | General updates |

#### Scheduled SMS

- **Recurring Schedules**: Daily, weekly reminders
- **Day Selection**: Choose specific days (Mon-Sun)
- **Time Zone Support**: Deliver at appropriate local time
- **Target Audiences**: By role, all users, specific individuals
- **Execution Logging**: Track scheduled message delivery
- **Test Mode**: Validate without using credits

#### Message History & Tracking

- **Delivery Status**: Sent, Delivered, Failed, Unknown
- **Status Refresh**: Check Textbelt API for updates
- **Error Tracking**: Capture failure reasons
- **History View**: Searchable message log with filters

#### SMS Templates

Pre-built templates with variable substitution:
- Clock In Reminder
- Timesheet Review
- End of Day
- Project Assignment
- Custom templates

### Email Notifications (Resend)

All emails use **branded HTML templates** with company branding from `company_branding_settings`.

#### Authentication Emails

| Type | Trigger | Content |
|------|---------|---------|
| **Password Reset** | Admin-initiated or user request | Secure link with 24hr expiry |
| **User Invitation (Temp)** | New user with temp password | Welcome + temporary password + login link |
| **User Invitation (Perm)** | New user with set password | Welcome + confirmation + login link |

#### Operational Emails

| Type | Trigger | Recipients |
|------|---------|------------|
| **Training Assignment** | Admin assigns training | Assigned user |
| **Receipt Notification** | Field worker captures receipt | Admin notification |

#### Email Branding

All emails dynamically load from `company_branding_settings`:
- Company logo (full horizontal)
- Company name, legal name, abbreviation
- Primary, secondary, accent colors
- Background colors
- Company address, phone, license

---

## Module 8: Administration

### User Management

- **User Creation**: Admin-created accounts with temporary or permanent passwords
- **Password Reset**: Admin-initiated resets via email link or temporary password
- **Must Change Password**: Force password change on first login
- **User Activation**: Enable/disable user accounts
- **Profile Management**: Full name, email, phone

### Role Management

| Role | Access Level |
|------|--------------|
| **Admin** | Full system access, user management, settings |
| **Manager** | Projects, financials, team oversight, reports |
| **Field Worker** | Assigned projects only, time tracking, receipts |

#### Role Assignment
- **Multi-Role Support**: Users can have multiple roles
- **Bulk Assignment**: Select multiple users for role changes
- **Role Filtering**: View users by role
- **Assignment Audit**: Track who assigned what role when

### Company Branding

Centralized branding used across emails, reports, and exports:

| Setting | Usage |
|---------|-------|
| `logo_full_url` | Email headers, reports |
| `logo_icon_url` | Favicon, compact displays |
| `logo_stacked_url` | Alternative layouts |
| `logo_report_header_url` | Report headers |
| `company_name` | Display name |
| `company_legal_name` | Legal documents |
| `company_abbreviation` | Short references |
| `primary_color` | Buttons, accents |
| `secondary_color` | Headers, backgrounds |
| `accent_color` | Highlights |
| `light_bg_color` | Email backgrounds |
| `company_address` | Reports, documents |
| `company_phone` | Contact info |
| `company_license` | Legal compliance |

### Client Management

- **Client Roster**: Manage customer information
- **Contact Details**: Name, company, contact person, email, phone
- **Addresses**: Billing and mailing addresses
- **Client Type**: Categorization
- **Payment Terms**: Default payment terms
- **Tax Exempt Status**: Track tax exemptions
- **QuickBooks Link**: Customer ID for sync
- **Active/Inactive**: Manage client status

### Payee/Vendor Management

- **Unified Structure**: Vendors, subcontractors, internal labor in one table
- **Payee Types**: Vendor, subcontractor, internal
- **Capabilities**: Provides labor, provides materials, permit issuer
- **1099 Tracking**: Requires 1099 flag
- **Insurance Tracking**: Expiration date tracking
- **Hourly Rates**: Default rates for internal labor
- **QuickBooks Link**: Vendor ID for sync
- **User Link**: Connect to internal user profile

### System Settings

- **Feature Flags**: Key-value configuration
- **QuickBooks Account Mappings**: Map QB accounts to internal categories
- **Sync Logging**: Track import/export operations

### Activity Audit

- **Admin Actions Log**: Track privileged operations
  - Password resets
  - Role changes
  - User creation/deletion
- **Action Details**: JSON metadata for context
- **Target Tracking**: Who was affected
- **Timestamp**: When action occurred

---

## AI-Powered Features

### Caption Enhancement

- **Photo Captions**: AI improves user-entered captions
- **Context-Aware**: Considers project context in suggestions
- **Accept/Reject**: User controls final caption
- **Hook**: `useAICaptionEnhancement`

### Voice Caption Transcription

- **Speech-to-Text**: Speak captions instead of typing
- **Audio Recording**: Built-in audio capture with visualizer
- **Audio Processing**: Convert recording to text
- **Hook**: `useAudioTranscription`, `useAudioRecording`

### Smart Categorization (CSV Import)

- **Category Suggestions**: AI-assisted expense categorization
- **Account Path Analysis**: Parse QuickBooks account hierarchies
- **Confidence Scoring**: Show match confidence for suggestions
- **Payee Fuzzy Matching**: Intelligent vendor/payee matching

### Expense Correlation

- **Line Item Matching**: Suggest which estimate line item an expense belongs to
- **Quote Matching**: Connect expenses to accepted quotes
- **Change Order Detection**: Identify change order-related expenses

---

## Technical Architecture

### Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **UI Components** | shadcn/ui, Tailwind CSS |
| **State Management** | TanStack Query (React Query) |
| **Forms** | react-hook-form + Zod validation |
| **Mobile** | Capacitor PWA with offline support |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| **Email** | Resend |
| **SMS** | Textbelt |
| **Charts** | gantt-task-react (scheduling) |

### Database Architecture

- **31 Database Calculations**: PostgreSQL triggers/functions for financial accuracy
- **26 Frontend Calculations**: Display-only calculations in React
- **Reporting Views**: 
  - `reporting.project_financials` - Main financial metrics
  - `reporting.training_status` - Training completion data
- **RLS Policies**: Row-level security by user role and project assignment

### Offline Capabilities

| Feature | Offline Support |
|---------|----------------|
| Time Clock In/Out | ✅ Full (syncs when online) |
| Receipt Capture | ✅ Full (queues for upload) |
| Photo Capture | ✅ Full (queues for upload) |
| Time Entry Edit | ⚠️ Partial (read cached data) |
| Project Browsing | ⚠️ Partial (cached data) |
| Reports | ❌ Requires connection |

### Background Sync

- **Offline Queue**: Actions stored locally when offline
- **Automatic Sync**: Uploads when connection restored
- **Conflict Resolution**: Last-write-wins with audit trail
- **Sync Status Indicators**: Visual feedback on sync state

### Key Design Principles

1. **Database-First Financials**: All financial calculations in PostgreSQL, not frontend
2. **Mobile-First Design**: 48px touch targets, PWA offline capability
3. **Data-Dense Interface**: Professional appearance similar to Procore/QuickBooks
4. **Leverage Existing Patterns**: Reports integrate with builder (not separate pages)

---

## User Roles & Permissions

| Role | Capabilities |
|------|--------------|
| **Admin** | Full access, user management, settings, all reports |
| **Manager** | Project management, expense approval, team oversight, reports |
| **Field Worker** | Assigned projects only, time tracking, receipts, training |

### Project Assignment

- Users can be assigned to specific projects
- Field workers only see assigned projects
- Managers/admins see all projects

---

## Critical Business Rules

1. **Receipts are Documentation Only**: Receipts do NOT feed into financial calculations—expense data comes from direct entry or QuickBooks import
2. **Vendors vs Subcontractors**: "Vendors" are material suppliers; "subcontractors" are trade contractors—unified structure for QuickBooks compatibility
3. **Cost vs Price**: Cost = what company pays vendors; Price = what clients are charged
4. **Project Categories**: Construction (visible everywhere), System (internal), Overhead (expenses/receipts only)
5. **`projectFinancials.ts` is DEPRECATED**: Use database fields directly from projects table
6. **Reports Use Existing Builder**: Training, time, and other reports integrate with main report builder—no separate report pages

---

## Application URLs

- **GitHub Repository**: https://github.com/Cradcliff187/profitbuild-dash.git
- **Production PWA**: rcgwork.com (Capacitor PWA)

---

## Summary: What RCG Work Does

**In one sentence**: RCG Work is a construction management platform that takes projects from bid to completion, tracking every dollar, every hour, and every photo along the way—with built-in scheduling, training, and team communication.

**For field workers**: A mobile app that makes clocking in, capturing receipts, and documenting job sites simple and fast—even offline.

**For project managers**: A command center for estimates, scheduling (Gantt charts), change orders, expense tracking, and real-time profitability monitoring.

**For executives**: Comprehensive reporting (21+ templates across 6 categories) and dashboards showing project health, margin analysis, and financial KPIs across the organization.

**For accounting**: QuickBooks integration that imports transactions, matches to projects, and maintains audit-ready records.

**For admins**: User management, role assignment, training content delivery, and branded communication tools (SMS + email).

---

*Document generated from codebase analysis - December 2024*
