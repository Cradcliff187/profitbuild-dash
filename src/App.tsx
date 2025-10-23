import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ui/error-boundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import ProtectedLayout from "@/components/ProtectedLayout";
import { InstallPrompt } from "@/components/InstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import ChangePassword from "./pages/ChangePassword";
import Projects from "./pages/Projects";
import NotFound from "./pages/NotFound";

// Lazy load heavy pages
const Install = lazy(() => import("./pages/Install"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const WorkOrders = lazy(() => import("./pages/WorkOrders"));
const TimeTracker = lazy(() => import("./pages/TimeTracker"));
const TimeEntries = lazy(() => import("./pages/TimeEntries"));
const Estimates = lazy(() => import("./pages/Estimates"));
const Quotes = lazy(() => import("./pages/Quotes"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Payees = lazy(() => import("./pages/Payees"));
const Clients = lazy(() => import("./pages/Clients"));
const ProfitAnalysis = lazy(() => import("./pages/ProfitAnalysis"));
const Settings = lazy(() => import("./pages/Settings"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const FieldPhotoCapture = lazy(() => import("./pages/FieldPhotoCapture"));
const FieldVideoCapture = lazy(() => import("./pages/FieldVideoCapture"));
const RoleManagement = lazy(() => import("./pages/RoleManagement"));
const FieldMedia = lazy(() => import("./pages/FieldMedia"));

const queryClient = new QueryClient();

const LazyRoute = ({ component: Component }: { component: React.ComponentType }) => (
  <Suspense fallback={<LoadingSpinner variant="page" />}>
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
        <InstallPrompt />
        <OfflineIndicator />
        <BrowserRouter>
          <ErrorBoundary>
            <div className="min-h-screen bg-background mobile-container">
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/change-password" element={<ChangePassword />} />
                <Route path="/reset-password" element={<LazyRoute component={ResetPassword} />} />
                <Route path="/install" element={<LazyRoute component={Install} />} />
                <Route path="/" element={<ProtectedLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Navigate to="/" replace />} />
                  <Route path="work-orders" element={<LazyRoute component={WorkOrders} />} />
                  <Route path="time-tracker" element={<LazyRoute component={TimeTracker} />} />
                  <Route path="time-entries" element={<LazyRoute component={TimeEntries} />} />
                  {/* Admin/Manager Project Routes - use :id parameter for consistency with existing routes */}
                  <Route path="projects" element={<Projects />} />
                  <Route path="projects/:id/*" element={<LazyRoute component={ProjectDetail} />} />
                  <Route path="projects/:id/capture" element={<LazyRoute component={FieldPhotoCapture} />} />
                  <Route path="projects/:id/capture-video" element={<LazyRoute component={FieldVideoCapture} />} />
                  
                  {/* Field Worker Media Routes - use :id parameter (same as admin routes for consistency) */}
                  <Route path="field-media" element={<LazyRoute component={FieldMedia} />} />
                  <Route path="field-media/:id" element={<LazyRoute component={FieldMedia} />} />
                  <Route path="field-media/:id/capture" element={<LazyRoute component={FieldPhotoCapture} />} />
                  <Route path="field-media/:id/capture-video" element={<LazyRoute component={FieldVideoCapture} />} />
                  <Route path="estimates" element={<LazyRoute component={Estimates} />} />
                  <Route path="expenses" element={<LazyRoute component={Expenses} />} />
                  <Route path="payees" element={<LazyRoute component={Payees} />} />
                  <Route path="clients" element={<LazyRoute component={Clients} />} />
                  <Route path="profit-analysis" element={<LazyRoute component={ProfitAnalysis} />} />
                  <Route path="settings" element={<LazyRoute component={Settings} />} />
                  <Route path="role-management" element={<LazyRoute component={RoleManagement} />} />
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
