import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import StoreHome from "./pages/store/StoreHome";
import StoreCatalog from "./pages/store/StoreCatalog";
import ProductPage from "./pages/store/ProductPage";
import CartPage from "./pages/store/CartPage";
import CheckoutPage from "./pages/store/CheckoutPage";
import AdminProducts from "./pages/admin/AdminProducts";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";

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
          {/* E-commerce */}
          <Route path="/" element={<StoreHome />} />
          <Route path="/loja" element={<StoreCatalog />} />
          <Route path="/produto/:id" element={<ProductPage />} />
          <Route path="/carrinho" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminProducts />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/signup" element={<SignupPage />} />

          {/* Sistemas existentes */}
          <Route path="/construcao" element={<Construction />} />
          <Route path="/orcamentos" element={<Index />} />

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
