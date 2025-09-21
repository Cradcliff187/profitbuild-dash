import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background mobile-container">
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/*" element={
                <ProtectedRoute>
                  <Navigation />
                  <main className="w-full mobile-safe-padding py-4 sm:py-6 md:py-8">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/dashboard" element={<Navigate to="/" replace />} />
                      <Route path="/work-orders" element={<WorkOrders />} />
                      <Route path="/projects" element={<Projects />} />
                      <Route path="/estimates" element={<Estimates />} />
                      <Route path="/quotes" element={<Quotes />} />
                      <Route path="/expenses" element={<Expenses />} />
                      <Route path="/payees" element={<Payees />} />
                      <Route path="/clients" element={<Clients />} />
                      <Route path="/profit-analysis" element={<ProfitAnalysis />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
