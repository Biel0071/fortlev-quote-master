import { Navigate, Route, Routes } from "react-router-dom";
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
  AdminQuotationTokens,
  AdminBulkImageSearch,
  AdminStoreSelector,
  AdminQuotationModels,
  AdminProductsImport,
  AdminProductScraper,
  AdminReviews,
  AdminPriceIntelligence,
  AdminImageReview,
  AdminRecommendations,
  AdminShipping,
  AdminIntelligenceUnified,
  AdminConversionFunnel,
  AdminClickMap,
  AdminAppMetrics,
  AdminAiInsights,
  AdminPaymentsGateways,
  AdminPaymentsGatewayAdd,
  AdminPaymentsCheckouts,
  AdminPaymentsMethods,
  AdminPaymentsAntifraud,
  AdminPaymentsSubscriptions,
  AdminPaymentsWebhooks,
  AdminPaymentsApi,
  AdminMasterDashboard,
} from "@/modules/admin";
import FortlevOverview from "@/pages/dashboard/FortlevOverview";
import ConstructionOverview from "@/pages/dashboard/ConstructionOverview";
import AdminIssuingCompanies from "@/pages/dashboard/AdminIssuingCompanies";
import AdminCrmLeads from "@/pages/dashboard/AdminCrmLeads";

export default function AdminApp() {
  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
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
        <Route path="relatorios-ia" element={<Navigate to="/admin/inteligencia-ia" replace />} />
        <Route path="analise-ia" element={<Navigate to="/admin/inteligencia-ia" replace />} />
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

        <Route path="cupons" element={<Navigate to="/admin/configuracoes/cupons" replace />} />
        <Route path="frete" element={<Navigate to="/admin/configuracoes/frete" replace />} />
        <Route path="payments/*" element={<Navigate to="/admin/configuracoes/pagamentos" replace />} />
        <Route path="ofertas" element={<div className="p-6 text-muted-foreground">Em breve: ofertas</div>} />
      </Route>
    </Routes>
  );
}