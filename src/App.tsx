import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ThemeBoot } from "@/components/theme/ThemeBoot";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import StoreHome from "./pages/store/StoreHome";
import StoreCatalog from "./pages/store/StoreCatalog";
import OffersPage from "./pages/store/OffersPage";
import ProductPage from "./pages/store/ProductPage";
import CartPage from "./pages/store/CartPage";
import CheckoutPage from "./pages/store/CheckoutPage";
import PaymentPendingPage from "./pages/store/PaymentPendingPage";
import StorePage from "./pages/store/StorePage";
import AccountPage from "./pages/account/AccountPage";
import OrdersPage from "./pages/account/OrdersPage";
import TrackingPage from "./pages/account/TrackingPage";

import {
  AdminLayout,
  AdminDashboardShell,
  AdminDashboardOverview,
  AdminHome,
  AdminProductsList,
  AdminProductForm,
  AdminCategoriesList,
  AdminCategoryForm,
  AdminOrders,
  AdminPages,
  AdminCustomers,
  AdminCoupons,
  AdminBanners,
  AdminSettings,
  AdminSettingsLayout,
  AdminUsersAccess,
  AdminSettingsIdentidade,
  AdminSettingsIntegracoes,
  AdminTheme,
  AdminDashboardTracking,
  AdminIntelligence,
  AdminDashboardQuotations,
  AdminQuotations,
  AdminQuotationsOverview,
  AdminBulkImageSearch,
  AdminStoreSelector,
  AdminProductsImport,
  AdminProductScraper,
  AdminReviews,
  AdminPriceIntelligence,
  AdminImageReview,
  AdminBatchOps,
  AdminRecommendations,
  AdminShipping,
  AdminIntelligenceUnified,
  // New modules
  AdminConversionFunnel,
  AdminClickMap,
  AdminAppMetrics,
  AdminAiInsights,
  // Payments
  AdminPaymentsLayout,
  AdminPaymentsOverview,
  AdminPaymentsGateways,
  AdminPaymentsGatewayAdd,
  AdminPaymentsCheckouts,
  AdminPaymentsMethods,
  AdminPaymentsAntifraud,
  AdminPaymentsSubscriptions,
  AdminPaymentsWebhooks,
  AdminPaymentsApi,
} from "@/modules/admin";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";

import QuotationsIndex from "@/modules/checkout/pages/QuotationsIndex";
import Construction from "@/modules/checkout/pages/Construction";

import FortlevOverview from "./pages/dashboard/FortlevOverview";
import ConstructionOverview from "./pages/dashboard/ConstructionOverview";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function InstitutionalRedirect() {
  const { slug = "" } = useParams();
  return <Navigate to={`/p/${encodeURIComponent(slug)}`} replace />;
}

function CatalogRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/loja${search}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeBoot>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CookieConsentBanner />
          <Routes>
            {/* Loja Materiais (HOME/vitrine) */}
            <Route path="/" element={<StoreHome />} />
            <Route path="/materiais" element={<Navigate to="/" replace />} />

            {/* E-commerce */}
            <Route path="/loja" element={<StoreCatalog />} />
            <Route path="/catalogo" element={<CatalogRedirect />} />
            <Route path="/catálogo" element={<CatalogRedirect />} />
            <Route path="/ofertas" element={<OffersPage />} />
            <Route path="/produto/:slug" element={<ProductPage />} />
            <Route path="/carrinho" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/pagamento" element={<PaymentPendingPage />} />
            <Route path="/p/:slug" element={<StorePage />} />
            <Route path="/institucional/:slug" element={<InstitutionalRedirect />} />

            {/* Área do cliente */}
            <Route path="/conta" element={<AccountPage />} />
            <Route path="/pedidos" element={<OrdersPage />} />
            <Route path="/rastreio/:id" element={<TrackingPage />} />

            {/* Admin (protegido) */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminStoreSelector />} />
              <Route path="dashboard" element={<AdminDashboardShell />}>
                <Route index element={<AdminDashboardOverview />} />
                <Route path="orcamentos" element={<AdminDashboardQuotations />} />
                <Route path="tracking" element={<AdminDashboardTracking />} />
                <Route path="inteligencia" element={<AdminIntelligence />} />
              </Route>
              <Route path="home" element={<AdminHome />} />

              <Route path="orcamentos" element={<AdminQuotations />}>
                <Route index element={<AdminQuotationsOverview />} />
                <Route path="fortlev" element={<FortlevOverview />} />
                <Route path="construcao" element={<ConstructionOverview />} />
              </Route>

              <Route path="produtos" element={<AdminProductsList />} />
              <Route path="produtos/novo" element={<AdminProductForm />} />
              <Route path="produtos/editar/:id" element={<AdminProductForm />} />
              <Route path="produtos/imagens" element={<AdminBulkImageSearch />} />
              <Route path="produtos/importar" element={<AdminProductsImport />} />
              <Route path="produtos/scraper" element={<AdminProductScraper />} />
              <Route path="produtos/inteligencia-preco" element={<AdminPriceIntelligence />} />
              <Route path="imagens/revisao" element={<AdminImageReview />} />
              <Route path="inteligencia-ia" element={<AdminIntelligenceUnified />} />
              <Route path="relatorios-ia" element={<Navigate to="/admin/inteligencia-ia" replace />} />
              <Route path="analise-ia" element={<Navigate to="/admin/inteligencia-ia" replace />} />
              <Route path="produtos/recomendacoes" element={<AdminRecommendations />} />
              <Route path="funil" element={<AdminConversionFunnel />} />
              <Route path="mapa-cliques" element={<AdminClickMap />} />
              <Route path="app-metricas" element={<AdminAppMetrics />} />
              <Route path="insights-ia" element={<AdminAiInsights />} />
              <Route path="categorias/nova" element={<AdminCategoryForm />} />
              <Route path="categorias/editar/:id" element={<AdminCategoryForm />} />

              <Route path="pedidos" element={<AdminOrders />} />
              <Route path="paginas" element={<AdminPages />} />
              <Route path="clientes" element={<AdminCustomers />} />
              <Route path="banners" element={<AdminBanners />} />
              <Route path="avaliacoes" element={<AdminReviews />} />
              <Route path="tema" element={<AdminTheme />} />
              <Route path="configuracoes" element={<AdminSettingsLayout />}>
                <Route index element={<AdminSettings />} />
                <Route path="usuarios" element={<AdminUsersAccess />} />
                <Route path="identidade" element={<AdminSettingsIdentidade />} />
                <Route path="integracoes" element={<AdminSettingsIntegracoes />} />
                <Route path="frete" element={<AdminShipping />} />
                <Route path="cupons" element={<AdminCoupons />} />
                <Route path="pagamentos/gateways" element={<AdminPaymentsGateways />} />
                <Route path="pagamentos/gateways/add" element={<AdminPaymentsGatewayAdd />} />
                <Route path="pagamentos/checkouts" element={<AdminPaymentsCheckouts />} />
                <Route path="pagamentos/methods" element={<AdminPaymentsMethods />} />
                <Route path="pagamentos/methods/pix" element={<AdminPaymentsMethods />} />
                <Route path="pagamentos/methods/card" element={<AdminPaymentsMethods />} />
                <Route path="pagamentos/methods/boleto" element={<AdminPaymentsMethods />} />
                <Route path="pagamentos/methods/split" element={<AdminPaymentsMethods />} />
                <Route path="pagamentos/antifraud" element={<AdminPaymentsAntifraud />} />
                <Route path="pagamentos/antifraud/rules" element={<AdminPaymentsAntifraud />} />
                <Route path="pagamentos/subscriptions" element={<AdminPaymentsSubscriptions />} />
                <Route path="pagamentos/subscriptions/plans" element={<AdminPaymentsSubscriptions />} />
                <Route path="pagamentos/webhooks" element={<AdminPaymentsWebhooks />} />
                <Route path="pagamentos/webhooks/events" element={<AdminPaymentsWebhooks />} />
                <Route path="pagamentos/api" element={<AdminPaymentsApi />} />
                <Route path="pagamentos/api/keys" element={<AdminPaymentsApi />} />
                <Route path="pagamentos/api/docs" element={<AdminPaymentsApi />} />
                <Route path="pagamentos/api/sandbox" element={<AdminPaymentsApi />} />
              </Route>

              {/* Legacy redirects */}
              <Route path="cupons" element={<Navigate to="/admin/configuracoes/cupons" replace />} />
              <Route path="frete" element={<Navigate to="/admin/configuracoes/frete" replace />} />
              <Route path="payments/*" element={<Navigate to="/admin/configuracoes/pagamentos" replace />} />




              {/* rotas reservadas */}
              <Route path="ofertas" element={<div className="p-6 text-muted-foreground">Em breve: ofertas</div>} />
            </Route>

            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/signup" element={<SignupPage />} />

            {/* Sistemas de Orçamento */}
            <Route path="/construcao" element={<Construction />} />
            <Route path="/orcamentos" element={<QuotationsIndex />} />

            <Route path="/dashboard" element={<Navigate to="/admin/orcamentos" replace />} />
            <Route path="/dashboard/*" element={<Navigate to="/admin/orcamentos" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ThemeBoot>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
