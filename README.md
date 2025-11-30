# ProfitBuild Dashboard

**Construction Project Management & Financial Tracking Platform**

A comprehensive full-stack web application built for construction companies to manage projects, track finances, generate estimates/quotes, monitor field operations, and analyze profitability in real-time.

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![React](https://img.shields.io/badge/React-18.3-61dafb)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e)

---

## Key Features

### Project Management
- Multi-project tracking with status workflows (Estimating → Quoted → Approved → In Progress → Complete)
- Interactive Gantt chart scheduling with task dependencies
- Change order management and approval workflows
- Project financial reconciliation and variance analysis

### Financial Operations
- Estimate creation with hierarchical line items (phases, categories, items)
- Quote generation and comparison tools
- Expense tracking with receipt capture (mobile camera support)
- Real-time profit margin calculations and reporting
- Budget vs. actual cost analysis

### Time & Labor
- Mobile-friendly timesheet entry
- Weekly timesheet grid views
- Time entry approval workflows
- Labor cost allocation to projects

### Field Operations
- GPS-enabled photo/video capture
- Media gallery with comments and annotations
- Receipt scanning and categorization
- Offline support with background sync

### Analytics & Reporting
- Financial dashboards with real-time metrics
- Profit analysis by project and phase
- Estimate accuracy tracking
- Activity feed with audit trails
- **Custom report builder** with field selection, filtering, and sorting
- **Report templates** for common analysis scenarios (profitability, revenue reconciliation, billing progress)
- **Revenue variance analysis** comparing estimated vs actual revenue
- PDF export for quotes and reports

---

## Prerequisites

Before you begin, ensure you have:
- **Node.js** v18 or higher ([install via nvm](https://github.com/nvm-sh/nvm))
- **npm** v9+ (comes with Node.js)
- **Supabase account** (for backend services) - [Sign up free](https://supabase.com)
- **Git** for version control

---

## Local Development Setup

### 1. Clone the Repository
```bash
git clone <YOUR_GIT_URL>
cd profitbuild-dash
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

The project is pre-configured with Supabase connection details in `src/integrations/supabase/client.ts`. For production deployments or custom instances, create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**How to get Supabase credentials:**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to Settings → API
4. Copy the Project URL and anon/public key

### 4. Database Setup

**Option A: Using Supabase Dashboard**
1. Run migrations in `supabase/migrations/` via the Supabase SQL Editor
2. Migrations are numbered sequentially (run in order)

**Option B: Using Supabase CLI** (recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref clsjdxwbsjbhjibvlqbz

# Push migrations
supabase db push
```

### 5. Run Development Server
```bash
npm run dev
```

Application will be available at `http://localhost:5173`

### 6. Create Initial User

The application uses Supabase Auth. First user must be created via:
1. Supabase Dashboard → Authentication → Users → Add User
2. Or use the Auth signup page at `/auth`

---

## Architecture Overview

### Frontend (React SPA)
```
src/
├── components/          # Reusable UI components
│   ├── ui/              # shadcn/ui base components
│   ├── dashboard/       # Dashboard-specific components
│   ├── schedule/        # Gantt chart & scheduling
│   └── time-tracker/    # Timesheet components
├── pages/               # Route pages
├── hooks/               # Custom React hooks
├── utils/               # Helper functions & calculations
├── types/               # TypeScript type definitions
└── integrations/        # Supabase client & API types
```

### Backend (Supabase)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth (email/password)
- **Storage**: File uploads for receipts, photos, videos
- **Edge Functions**: Server-side logic for:
  - AI caption enhancement
  - Video thumbnail generation
  - Audio transcription
  - Email notifications
  - PDF generation

### Key Technologies
| Category | Technology | Purpose |
|----------|-----------|---------|
| Frontend | React 18 + TypeScript | UI framework |
| Build Tool | Vite | Fast development & builds |
| Styling | Tailwind CSS + shadcn/ui | Utility-first CSS + component library |
| State Management | TanStack Query | Server state & caching |
| Routing | React Router v6 | Client-side routing |
| Forms | React Hook Form + Zod | Form handling & validation |
| Backend | Supabase | Database, auth, storage, functions |
| Charts | Recharts | Financial analytics |
| Scheduling | gantt-task-react | Gantt chart visualization |
| PDF Export | jspdf + html2pdf.js | Report generation |
| PWA | vite-plugin-pwa + Workbox | Offline support |

---

## Database Schema

### Core Tables
- **projects**: Project master records with financial summaries and category-based filtering (`construction`, `system`, `overhead`)
- **estimates**: Cost estimates with hierarchical line items
- **estimate_line_items**: Individual line items with quantities & rates
- **quotes**: Customer-facing quotes generated from estimates
- **expenses**: All financial transactions (costs, labor, receipts)
- **change_orders**: Contract modifications and additions
- **clients**: Customer/client records
- **payees**: Vendor/subcontractor records
- **project_media**: Photos/videos with GPS metadata
- **work_orders**: Task assignments and tracking
- **saved_reports**: Custom report configurations and templates
- **report_execution_log**: Audit trail for report executions

### Reporting Views
- **reporting.project_financials**: Comprehensive aggregated view with financial metrics, expenses, quotes, change orders, and revenue data. Primary data source for the report builder system.

### Key Relationships
```
projects (1) → (N) estimates
estimates (1) → (N) estimate_line_items
estimates (1) → (N) quotes
projects (1) → (N) expenses
projects (1) → (N) change_orders
projects (1) → (N) project_media
```

### Row Level Security (RLS)
All tables enforce RLS policies based on:
- User authentication status
- Organization/workspace membership
- Role-based permissions (admin, manager, user)

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (http://localhost:5173) |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Development build (with source maps) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint on all TypeScript files |
| `npm run type-check` | Type-check without emitting files |
| `npm run create-test-project` | Generate test data for development |
| `npm run cleanup-test-data` | Remove test data from database |
| `npm run pre-deploy` | Run pre-deployment checks (lint + type-check) |

---

## Code Quality & Standards

### TypeScript
- Strict mode enabled
- All components must be typed (no `any` types)
- Prefer interfaces over types for object shapes

### ESLint Configuration
- React Hooks rules enforced
- No unused variables/imports
- Consistent formatting

### Component Patterns
- Functional components with hooks (no class components)
- Custom hooks in `src/hooks/` for reusable logic
- UI components in `src/components/ui/` (shadcn base components)
- Feature-specific components in `src/components/`

### File Naming
- Components: PascalCase (e.g., `ProjectForm.tsx`)
- Utilities: camelCase (e.g., `projectFinancials.ts`)
- Types: PascalCase interfaces (e.g., `Project`, `Estimate`)

---

## Deployment

### Via Lovable Platform (Recommended)
1. Open [Lovable Project Dashboard](https://lovable.dev/projects/8ad59cd4-cdfa-472d-b4a1-52ac194e00f2)
2. Click **Share → Publish**
3. Click **Update** to deploy latest changes
4. Frontend deploys to Lovable CDN
5. Backend (Supabase) is automatically synced

**Note:** Backend changes (edge functions, migrations) deploy immediately. Frontend changes require clicking "Update" in the publish dialog.

### Manual Deployment (Self-Hosted)
```bash
# Build for production
npm run build

# Deploy dist/ folder to your hosting provider
# (Netlify, Vercel, AWS S3 + CloudFront, etc.)
```

**Environment Variables for Production:**
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in your hosting platform
- Configure CORS in Supabase Dashboard for your production domain

### Custom Domain
1. Navigate to Project → Settings → Domains in Lovable
2. Click **Connect Domain**
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning (~15 minutes)

**Note:** Custom domains require a paid Lovable plan

---

## Testing

### Manual Testing Workflow
1. Use `npm run create-test-project` to generate sample data
2. Test critical user flows:
   - Create project → Create estimate → Generate quote
   - Add expenses → Match to line items
   - Create timesheet entries → Approve workflow
   - Upload receipts with mobile camera
   - View financial dashboards
3. Use `npm run cleanup-test-data` when done

### Browser Testing
- **Primary**: Chrome/Edge (Chromium-based)
- **Secondary**: Firefox, Safari
- **Mobile**: iOS Safari, Chrome Android
- Test PWA installation and offline mode

---

## Troubleshooting

### Common Issues

**"Module not found" errors**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Supabase connection errors**
- Verify Supabase project is active (not paused)
- Check credentials in `src/integrations/supabase/client.ts`
- Verify API keys match your project in Supabase Dashboard

**Build fails with TypeScript errors**
```bash
npm run type-check  # See detailed errors
```

**Performance issues / timeouts**
- Upgrade Supabase instance size: Settings → Cloud → Advanced settings
- May take up to 10 minutes to apply

**PWA not updating**
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Clear browser cache
- Unregister service worker in DevTools → Application → Service Workers

---

## Contributing

### Development Workflow
1. Create feature branch from `main`
2. Make changes with descriptive commits
3. Run `npm run pre-deploy` before pushing
4. Push to GitHub (auto-syncs to Lovable)
5. Test in Lovable preview environment
6. Merge to `main` when ready

### Git Workflow
```bash
git checkout -b feature/your-feature-name
# Make changes
git add .
git commit -m "feat: descriptive commit message"
npm run pre-deploy  # Run checks
git push origin feature/your-feature-name
```

### Commit Message Format
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## Support

- **Documentation**: [Lovable Docs](https://docs.lovable.dev/)
- **Lovable Project**: [ProfitBuild Dashboard](https://lovable.dev/projects/8ad59cd4-cdfa-472d-b4a1-52ac194e00f2)
- **Community**: [Lovable Discord](https://discord.gg/lovable)

---

## License

[Specify your license here - MIT, Apache 2.0, Proprietary, etc.]
