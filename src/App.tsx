import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Construction from "./pages/Construction";
import StoresDashboardLayout from "./pages/StoresDashboardLayout";
import FortlevOverview from "./pages/dashboard/FortlevOverview";
import ConstructionOverview from "./pages/dashboard/ConstructionOverview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/construcao" element={<Construction />} />

          <Route path="/dashboard" element={<StoresDashboardLayout />}>
            <Route index element={<Navigate to="fortlev" replace />} />

            <Route path="fortlev" element={<FortlevOverview />} />
            <Route path="fortlev/orcamentos" element={<Index />} />

            <Route path="construcao" element={<ConstructionOverview />} />
            <Route path="construcao/orcamentos" element={<Construction />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
