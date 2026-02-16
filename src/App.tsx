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
import StorePage from "./pages/store/StorePage";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminHome from "./pages/admin/AdminHome";
import AdminProductsList from "./pages/admin/AdminProductsList";
import AdminProductForm from "./pages/admin/AdminProductForm";
import AdminCategoriesList from "./pages/admin/AdminCategoriesList";
import AdminCategoryForm from "./pages/admin/AdminCategoryForm";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminPages from "./pages/admin/AdminPages";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminSettings from "./pages/admin/AdminSettings";
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
          <Route path="/p/:slug" element={<StorePage />} />

          {/* Admin (protegido) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="home" element={<AdminHome />} />

            <Route path="produtos" element={<AdminProductsList />} />
            <Route path="produtos/novo" element={<AdminProductForm />} />
            <Route path="produtos/editar/:id" element={<AdminProductForm />} />

            <Route path="categorias" element={<AdminCategoriesList />} />
            <Route path="categorias/nova" element={<AdminCategoryForm />} />
            <Route path="categorias/editar/:id" element={<AdminCategoryForm />} />

            <Route path="pedidos" element={<AdminOrders />} />
            <Route path="paginas" element={<AdminPages />} />
            <Route path="clientes" element={<AdminCustomers />} />
            <Route path="cupons" element={<AdminCoupons />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="configuracoes" element={<AdminSettings />} />

            {/* rotas reservadas */}
            <Route path="ofertas" element={<div className="p-6 text-muted-foreground">Em breve: ofertas</div>} />
          </Route>

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
