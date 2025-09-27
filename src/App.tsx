import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ui/error-boundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedLayout from "@/components/ProtectedLayout";
import Dashboard from "./pages/Dashboard";
import WorkOrders from "./pages/WorkOrders";
import Estimates from "./pages/Estimates";
import Quotes from "./pages/Quotes";
import Expenses from "./pages/Expenses";
import Payees from "./pages/Payees";
import Clients from "./pages/Clients";
import Projects from "./pages/Projects";
import ProfitAnalysis from "./pages/ProfitAnalysis";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectEdit from "./pages/ProjectEdit";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
            <div className="min-h-screen bg-background mobile-container">
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/" element={<ProtectedLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Navigate to="/" replace />} />
                  <Route path="work-orders" element={<WorkOrders />} />
                  <Route path="projects" element={<Projects />} />
                  <Route path="projects/:id" element={<ProjectDetail />} />
                  <Route path="projects/:id/edit" element={<ProjectEdit />} />
                  <Route path="estimates" element={<Estimates />} />
                  <Route path="quotes" element={<Quotes />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="payees" element={<Payees />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="profit-analysis" element={<ProfitAnalysis />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
