import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "@/modules/admin/pages/AdminLayout";
import { useStore } from "@/contexts/StoreContext";

const AdminDashboardShell = lazy(() => import("@/modules/admin/pages/AdminDashboardShell"));
const AdminDashboardOverview = lazy(() => import("@/modules/admin/pages/AdminDashboardOverview"));
const AdminHome = lazy(() => import("@/modules/admin/pages/AdminHome"));
const AdminProductsList = lazy(() => import("@/modules/admin/pages/AdminProductsList"));
const AdminProductForm = lazy(() => import("@/modules/admin/pages/AdminProductForm"));
const AdminCategoriesList = lazy(() => import("@/modules/admin/pages/AdminCategoriesList"));
const AdminCategoryForm = lazy(() => import("@/modules/admin/pages/AdminCategoryForm"));
const AdminOrders = lazy(() => import("@/modules/admin/pages/AdminOrders"));
const AdminPages = lazy(() => import("@/modules/admin/pages/AdminPages"));
const AdminCustomers = lazy(() => import("@/modules/admin/pages/AdminCustomers"));
const AdminCoupons = lazy(() => import("@/modules/admin/pages/AdminCoupons"));
const AdminBanners = lazy(() => import("@/modules/admin/pages/AdminBanners"));
const AdminSettings = lazy(() => import("@/modules/admin/pages/AdminSettings"));
const AdminSettingsLayout = lazy(() => import("@/modules/admin/pages/AdminSettingsLayout"));
const AdminUsersAccess = lazy(() => import("@/modules/admin/pages/AdminUsersAccess"));
const AdminSettingsIdentidade = lazy(() => import("@/modules/admin/pages/AdminSettingsPlaceholder").then((m) => ({ default: m.AdminSettingsIdentidade })));
const AdminSettingsIntegracoes = lazy(() => import("@/modules/admin/pages/AdminSettingsPlaceholder").then((m) => ({ default: m.AdminSettingsIntegracoes })));
const AdminTheme = lazy(() => import("@/modules/admin/pages/AdminTheme"));
const AdminDashboardTracking = lazy(() => import("@/modules/admin/pages/AdminDashboardTracking"));
const AdminIntelligence = lazy(() => import("@/modules/admin/pages/AdminIntelligence"));
const AdminDashboardQuotations = lazy(() => import("@/modules/admin/pages/AdminDashboardQuotations"));
const AdminQuotations = lazy(() => import("@/modules/admin/pages/AdminQuotations"));
const AdminQuotationsOverview = lazy(() => import("@/modules/admin/pages/AdminQuotationsOverview"));
const AdminQuotationTokens = lazy(() => import("@/modules/admin/pages/AdminQuotationTokens"));
const AdminBulkImageSearch = lazy(() => import("@/modules/admin/pages/AdminBulkImageSearch"));
const AdminStoreSelector = lazy(() => import("@/modules/admin/pages/AdminStoreSelector"));
const AdminQuotationModels = lazy(() => import("@/modules/admin/pages/AdminQuotationModels"));
const AdminProductsImport = lazy(() => import("@/modules/admin/pages/AdminProductsImport"));
const AdminProductsMediaImport = lazy(() => import("@/modules/admin/pages/AdminProductsMediaImport"));
const AdminProductScraper = lazy(() => import("@/modules/admin/pages/AdminProductScraper"));
const AdminReviews = lazy(() => import("@/modules/admin/pages/AdminReviews"));
const AdminPriceIntelligence = lazy(() => import("@/modules/admin/pages/AdminPriceIntelligence"));
const AdminImageReview = lazy(() => import("@/modules/admin/pages/AdminImageReview"));
const AdminRecommendations = lazy(() => import("@/modules/admin/pages/AdminRecommendations"));
const AdminShipping = lazy(() => import("@/modules/admin/pages/AdminShipping"));
const AdminIntelligenceUnified = lazy(() => import("@/modules/admin/pages/AdminIntelligenceUnified"));
const AdminConversionFunnel = lazy(() => import("@/modules/admin/pages/AdminConversionFunnel"));
const AdminClickMap = lazy(() => import("@/modules/admin/pages/AdminClickMap"));
const AdminAppMetrics = lazy(() => import("@/modules/admin/pages/AdminAppMetrics"));
const AdminAiInsights = lazy(() => import("@/modules/admin/pages/AdminAiInsights"));
const AdminPaymentsGateways = lazy(() => import("@/modules/admin/pages/payments/AdminPaymentsGateways"));
const AdminPaymentsGatewayAdd = lazy(() => import("@/modules/admin/pages/payments/AdminPaymentsGatewayAdd"));
const AdminPaymentsCheckouts = lazy(() => import("@/modules/admin/pages/payments/AdminPaymentsCheckouts"));
const AdminPaymentsMethods = lazy(() => import("@/modules/admin/pages/payments/AdminPaymentsMethods"));
const AdminPaymentsAntifraud = lazy(() => import("@/modules/admin/pages/payments/AdminPaymentsAntifraud"));
const AdminPaymentsSubscriptions = lazy(() => import("@/modules/admin/pages/payments/AdminPaymentsSubscriptions"));
const AdminPaymentsWebhooks = lazy(() => import("@/modules/admin/pages/payments/AdminPaymentsWebhooks"));
const AdminPaymentsApi = lazy(() => import("@/modules/admin/pages/payments/AdminPaymentsApi"));
const AdminMasterDashboard = lazy(() => import("@/modules/admin/pages/AdminMasterDashboard"));
const FortlevOverview = lazy(() => import("@/pages/dashboard/FortlevOverview"));
const ConstructionOverview = lazy(() => import("@/pages/dashboard/ConstructionOverview"));
const AdminIssuingCompanies = lazy(() => import("@/pages/dashboard/AdminIssuingCompanies"));
const AdminCrmLeads = lazy(() => import("@/pages/dashboard/AdminCrmLeads"));

function AdminPageFallback() {
  return <div className="p-6 text-sm text-muted-foreground">Carregando painel...</div>;
}

export default function AdminApp() {
  const { routes } = useStore();

  return (
    <Suspense fallback={<AdminPageFallback />}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminStoreSelector />} />
          <Route path="master" element={<AdminMasterDashboard />} />
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
            <Route path="empresas" element={<AdminIssuingCompanies />} />
            <Route path="leads" element={<AdminCrmLeads />} />
            <Route path="tokens" element={<AdminQuotationTokens />} />
            <Route path="modelos" element={<AdminQuotationModels />} />
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
          <Route path="relatorios-ia" element={<Navigate to={routes.adminPath("/inteligencia-ia")} replace />} />
          <Route path="analise-ia" element={<Navigate to={routes.adminPath("/inteligencia-ia")} replace />} />
          <Route path="produtos/recomendacoes" element={<AdminRecommendations />} />
          <Route path="funil" element={<AdminConversionFunnel />} />
          <Route path="mapa-cliques" element={<AdminClickMap />} />
          <Route path="app-metricas" element={<AdminAppMetrics />} />
          <Route path="insights-ia" element={<AdminAiInsights />} />
          <Route path="categorias" element={<AdminCategoriesList />} />
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

          <Route path="cupons" element={<Navigate to={routes.adminPath("/configuracoes/cupons")} replace />} />
          <Route path="frete" element={<Navigate to={routes.adminPath("/configuracoes/frete")} replace />} />
          <Route path="payments/*" element={<Navigate to={routes.adminPath("/configuracoes/pagamentos/gateways")} replace />} />
          <Route path="ofertas" element={<div className="p-6 text-muted-foreground">Em breve: ofertas</div>} />
          <Route path="*" element={<Navigate to={routes.adminPath("/dashboard")} replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}