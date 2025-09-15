import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Estimates from "./pages/Estimates";
import Quotes from "./pages/Quotes";
import Expenses from "./pages/Expenses";
import Vendors from "./pages/Vendors";
import ProfitAnalysis from "./pages/ProfitAnalysis";
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navigation />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/estimates" element={<Estimates />} />
              <Route path="/quotes" element={<Quotes />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/vendors" element={<Vendors />} />
              <Route path="/profit-analysis" element={<ProfitAnalysis />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
