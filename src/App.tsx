import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ui/error-boundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import AppLayout from "@/components/AppLayout";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { BrandedLoader } from "@/components/ui/branded-loader";
import { isFeatureEnabled } from "@/lib/featureFlags";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ChangePassword from "./pages/ChangePassword";
import Projects from "./pages/Projects";
import NotFound from "./pages/NotFound";

// Lazy load heavy pages
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const WorkOrders = lazy(() => import("./pages/WorkOrders"));
const TimeTracker = lazy(() => import("./pages/TimeTracker"));
const TimeEntries = lazy(() => import("./pages/TimeEntries"));
const Estimates = lazy(() => import("./pages/Estimates"));
const Quotes = lazy(() => import("./pages/Quotes"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Payees = lazy(() => import("./pages/Payees"));
const KPIGuide = lazy(() => import("./pages/KPIGuide"));
const Clients = lazy(() => import("./pages/Clients"));
const ProfitAnalysis = lazy(() => import("./pages/ProfitAnalysis"));
const Settings = lazy(() => import("./pages/Settings"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const FieldPhotoCapture = lazy(() => import("./pages/FieldPhotoCapture"));
const FieldVideoCapture = lazy(() => import("./pages/FieldVideoCapture"));
const BidPhotoCapture = lazy(() => import("./pages/BidPhotoCapture"));
const BidVideoCapture = lazy(() => import("./pages/BidVideoCapture"));
const RoleManagement = lazy(() => import("./pages/RoleManagement"));
const FieldMedia = lazy(() => import("./pages/FieldMedia"));
const FieldSchedule = lazy(() => import("./pages/FieldSchedule"));
const BranchBids = lazy(() => import("./pages/BranchBids"));
const BranchBidDetail = lazy(() => import("./pages/BranchBidDetail"));
const Reports = lazy(() => import("./pages/Reports"));
const AllExpensesLineItemsReport = lazy(() => import("./pages/AllExpensesLineItemsReport"));
const AllRevenuesLineItemsReport = lazy(() => import("./pages/AllRevenuesLineItemsReport"));
const SMSAdmin = lazy(() => import("./pages/SMSAdmin"));
const Training = lazy(() => import("./pages/Training"));
const TrainingAdmin = lazy(() => import("./pages/TrainingAdmin"));
const TrainingViewer = lazy(() => import("./pages/TrainingViewer"));
const DevMobileCards = lazy(() => import("./pages/DevMobileCards"));

// Project route components
const ProjectOverviewRoute = lazy(() => import("./components/project-routes/ProjectOverviewRoute").then(m => ({ default: m.ProjectOverviewRoute })));
const ProjectEstimatesRoute = lazy(() => import("./components/project-routes/ProjectEstimatesRoute").then(m => ({ default: m.ProjectEstimatesRoute })));
const ProjectExpensesRoute = lazy(() => import("./components/project-routes/ProjectExpensesRoute").then(m => ({ default: m.ProjectExpensesRoute })));
const ProjectControlRoute = lazy(() => import("./components/project-routes/ProjectControlRoute").then(m => ({ default: m.ProjectControlRoute })));
const ProjectChangesRoute = lazy(() => import("./components/project-routes/ProjectChangesRoute").then(m => ({ default: m.ProjectChangesRoute })));
const ProjectDocumentsRoute = lazy(() => import("./components/project-routes/ProjectDocumentsRoute").then(m => ({ default: m.ProjectDocumentsRoute })));
const ProjectScheduleRoute = lazy(() => import("./components/project-routes/ProjectScheduleRoute").then(m => ({ default: m.ProjectScheduleRoute })));
const ProjectEditRoute = lazy(() => import("./components/project-routes/ProjectEditRoute").then(m => ({ default: m.ProjectEditRoute })));
const EstimateEditRoute = lazy(() => import("./components/project-routes/EstimateEditRoute").then(m => ({ default: m.EstimateEditRoute })));
const EstimateNewRoute = lazy(() => import("./components/project-routes/EstimateNewRoute").then(m => ({ default: m.EstimateNewRoute })));
const QuoteViewRoute = lazy(() => import("./components/project-routes/QuoteViewRoute").then(m => ({ default: m.QuoteViewRoute })));
const QuoteEditRoute = lazy(() => import("./components/project-routes/QuoteEditRoute").then(m => ({ default: m.QuoteEditRoute })));
const QuoteNewRoute = lazy(() => import("./components/project-routes/QuoteNewRoute").then(m => ({ default: m.QuoteNewRoute })));
const queryClient = new QueryClient();

const LazyRoute = ({ component: Component }: { component: React.ComponentType }) => (
  <Suspense fallback={<BrandedLoader message="Loading..." />}>
    <Component />
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RoleProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ErrorBoundary>
            <div className="min-h-screen bg-background w-full overflow-x-hidden">
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="/reset-password" element={<LazyRoute component={ResetPassword} />} />
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Navigate to="/" replace />} />
                  <Route path="work-orders" element={<LazyRoute component={WorkOrders} />} />
                  <Route path="time-tracker" element={<LazyRoute component={TimeTracker} />} />
                  <Route path="time-entries" element={<LazyRoute component={TimeEntries} />} />
                  <Route path="field-schedule/:projectId" element={<LazyRoute component={FieldSchedule} />} />
                  {/* Admin/Manager Project Routes - use :id parameter for consistency with existing routes */}
                  <Route path="projects" element={<Projects />} />
                  <Route path="projects/:id" element={<LazyRoute component={ProjectDetail} />}>
                    <Route index element={<LazyRoute component={ProjectOverviewRoute} />} />
                    <Route path="estimates" element={<LazyRoute component={ProjectEstimatesRoute} />} />
                    <Route path="estimates/:estimateId/edit" element={<LazyRoute component={EstimateEditRoute} />} />
                    <Route path="estimates/new" element={<LazyRoute component={EstimateNewRoute} />} />
                    <Route path="estimates/quotes/:quoteId" element={<LazyRoute component={QuoteViewRoute} />} />
                    <Route path="estimates/quotes/:quoteId/edit" element={<LazyRoute component={QuoteEditRoute} />} />
                    <Route path="estimates/quotes/new" element={<LazyRoute component={QuoteNewRoute} />} />
                    <Route path="expenses" element={<LazyRoute component={ProjectExpensesRoute} />} />
                    <Route path="control" element={<LazyRoute component={ProjectControlRoute} />} />
                    <Route path="changes" element={<LazyRoute component={ProjectChangesRoute} />} />
                    <Route path="documents" element={<LazyRoute component={ProjectDocumentsRoute} />} />
                    <Route path="schedule" element={<LazyRoute component={ProjectScheduleRoute} />} />
                    <Route path="edit" element={<LazyRoute component={ProjectEditRoute} />} />
                  </Route>
                  <Route path="projects/:id/capture" element={<LazyRoute component={FieldPhotoCapture} />} />
                  <Route path="projects/:id/capture-video" element={<LazyRoute component={FieldVideoCapture} />} />
                  
                  {/* Field Worker Media Routes - use :id parameter (same as admin routes for consistency) */}
                  <Route path="field-media" element={<LazyRoute component={FieldMedia} />} />
                  <Route path="field-media/:id" element={<LazyRoute component={FieldMedia} />} />
                  <Route path="field-media/:id/capture" element={<LazyRoute component={FieldPhotoCapture} />} />
                  <Route path="field-media/:id/capture-video" element={<LazyRoute component={FieldVideoCapture} />} />
                  
                  {/* Bids Routes */}
                  <Route path="branch-bids" element={<LazyRoute component={BranchBids} />} />
                  <Route path="branch-bids/:id" element={<LazyRoute component={BranchBidDetail} />} />
                  <Route path="branch-bids/:id/capture" element={<LazyRoute component={BidPhotoCapture} />} />
                  <Route path="branch-bids/:id/capture-video" element={<LazyRoute component={BidVideoCapture} />} />
                  
                  <Route path="estimates" element={<LazyRoute component={Estimates} />} />
                  <Route path="quotes" element={<LazyRoute component={Quotes} />} />
                  <Route path="reports" element={<LazyRoute component={Reports} />} />
                  <Route path="reports/all-expenses-line-items" element={<LazyRoute component={AllExpensesLineItemsReport} />} />
                  <Route path="reports/all-revenues-line-items" element={<LazyRoute component={AllRevenuesLineItemsReport} />} />
                  <Route path="expenses" element={<LazyRoute component={Expenses} />} />
                  <Route path="payees" element={<LazyRoute component={Payees} />} />
                  <Route path="clients" element={<LazyRoute component={Clients} />} />
                  <Route path="profit-analysis" element={<LazyRoute component={ProfitAnalysis} />} />
                  <Route path="settings" element={<LazyRoute component={Settings} />} />
                  <Route path="role-management" element={<LazyRoute component={RoleManagement} />} />
                  <Route path="sms" element={<LazyRoute component={SMSAdmin} />} />
                  <Route path="kpi-guide" element={<LazyRoute component={KPIGuide} />} />
                  <Route path="training" element={<LazyRoute component={Training} />} />
                  <Route path="training/admin" element={<LazyRoute component={TrainingAdmin} />} />
                  <Route path="training/:id" element={<LazyRoute component={TrainingViewer} />} />
                  <Route path="dev/mobile-cards" element={<LazyRoute component={DevMobileCards} />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
      </RoleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
