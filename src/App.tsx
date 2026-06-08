import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ThemeBoot } from "@/components/theme/ThemeBoot";
import { TenantProvider } from "@/providers/TenantProvider";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import ScrollToTop from "@/components/ScrollToTop";
import "@/styles/budget-template.css";
import NotFound from "@/pages/NotFound";

const StoreHome = lazy(() => import("@/pages/store/StoreHome"));
const StoreCatalog = lazy(() => import("@/pages/store/StoreCatalog"));
const OffersPage = lazy(() => import("@/pages/store/OffersPage"));
const ProductPage = lazy(() => import("@/pages/store/ProductPage"));
const CartPage = lazy(() => import("@/pages/store/CartPage"));
const CheckoutPage = lazy(() => import("@/pages/store/CheckoutPage"));
const PaymentPendingPage = lazy(() => import("@/pages/store/PaymentPendingPage"));
const StorePage = lazy(() => import("@/pages/store/StorePage"));
const ShortLinkRedirect = lazy(() => import("@/pages/store/ShortLinkRedirect"));
const ApiApkDownloadRedirect = lazy(() => import("@/pages/store/ApiApkDownloadRedirect"));
const AccountPage = lazy(() => import("@/pages/account/AccountPage"));
const OrdersPage = lazy(() => import("@/pages/account/OrdersPage"));
const TrackingPage = lazy(() => import("@/pages/account/TrackingPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const SignupPage = lazy(() => import("@/pages/auth/SignupPage"));
const PublicQuotationAccess = lazy(() => import("@/pages/store/PublicQuotationAccess"));
const QuotationsIndex = lazy(() => import("@/modules/checkout/pages/QuotationsIndex"));
const Construction = lazy(() => import("@/modules/checkout/pages/Construction"));
const AdminApp = lazy(() => import("@/pages/admin/AdminApp"));
const MasterAdmin = lazy(() => import("@/pages/admin/MasterAdmin"));
const CustomerInvoicePortal = lazy(() => import("@/pages/CustomerInvoicePortal"));
const MasterRouteGuard = lazy(() => import("@/components/admin/MasterRouteGuard").then(m => ({ default: m.MasterRouteGuard })));


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // Increase stale time for better performance
      gcTime: 1000 * 60 * 60, // 1 hour cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function InstitutionalRedirect() {
  const { slug = "" } = useParams();
  return <Navigate to={`/p/${encodeURIComponent(slug)}`} replace />;
}

function CatalogRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/loja${search}`} replace />;
}

function PageSkeleton() {
  return (
    <div className="flex flex-col w-full min-h-screen bg-background p-4 space-y-4">
      <div className="h-16 w-full rounded-2xl bg-muted/20 animate-pulse" />
      <div className="h-48 w-full rounded-2xl bg-muted/30 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-64 rounded-2xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <TenantProvider>
        <ThemeBoot>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <CookieConsentBanner />
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                {/* Rota raiz explicitamente definida */}
                <Route path="/" element={<StoreHome />} />
                
                <Route path="/materiais" element={<Navigate to="/" replace />} />
                <Route path="/loja" element={<StoreCatalog />} />
                <Route path="/catalogo" element={<CatalogRedirect />} />
                <Route path="/catálogo" element={<CatalogRedirect />} />
                <Route path="/ofertas" element={<OffersPage />} />
                <Route path="/produto/:slug" element={<ProductPage />} />
                <Route path="/carrinho" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/checkout/pagamento" element={<PaymentPendingPage />} />
                <Route path="/p/:slug" element={<StorePage />} />
                <Route path="/r/:slug" element={<ShortLinkRedirect />} />
                <Route path="/api/apk/:token" element={<ApiApkDownloadRedirect />} />
                <Route path="/institucional/:slug" element={<InstitutionalRedirect />} />

                <Route path="/conta" element={<AccountPage />} />
                <Route path="/pedidos" element={<OrdersPage />} />
                <Route path="/rastreio/:id" element={<TrackingPage />} />

                <Route path="/admin/master/*" element={<MasterAdmin />} />
                <Route path="/admin/*" element={<AdminApp />} />

                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/signup" element={<SignupPage />} />

                <Route path="/construcao" element={<Construction />} />
                <Route path="/orcamentos" element={<QuotationsIndex />} />
                <Route path="/orcamento/:slug/:token" element={<PublicQuotationAccess />} />
                <Route path="/orcamento-publico" element={<PublicQuotationAccess />} />
                <Route path="/nota/:accessKey" element={<CustomerInvoicePortal />} />


                <Route path="/dashboard" element={<Navigate to="/admin/orcamentos" replace />} />
                <Route path="/dashboard/*" element={<Navigate to="/admin/orcamentos" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ThemeBoot>
      </TenantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;