/**
 * Uygulama kabuğu.
 *
 * Sağlayıcılar, yönlendirme ve hata sınırı burada kurulur. Sayfalar `React.lazy`
 * ile bölünür: eski derleme 2,2 MB'lık tek parça üretiyordu ve anasayfayı açan
 * kullanıcı yönetim panelinin tamamını da indiriyordu.
 */

import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient, setSessionExpiredHandler } from '@/lib/api';
import { AppErrorBoundary } from '@/components/layout/error-boundary.tsx';
import { SiteLayout } from '@/components/layout/site-layout.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { RequireAuth } from '@/features/auth';

// Vitrin sayfaları
const HomePage = lazy(() => import('./routes/home.tsx'));
const ProductsPage = lazy(() => import('./routes/products.tsx'));
const ProductDetailPage = lazy(() => import('./routes/product-detail.tsx'));
const OrderTrackingPage = lazy(() => import('./routes/order-tracking.tsx'));
const NotFoundPage = lazy(() => import('./routes/not-found.tsx'));

// Kimlik
const LoginPage = lazy(() => import('./routes/login.tsx'));
const RegisterPage = lazy(() => import('./routes/register.tsx'));

// Hesap
const BlogPage = lazy(() => import('./routes/blog.tsx'));
const BlogDetailPage = lazy(() => import('./routes/blog-detail.tsx'));
const CartPage = lazy(() => import('./routes/cart.tsx'));
const FaqPage = lazy(() => import('./routes/faq.tsx'));
const ForgotPasswordPage = lazy(() => import('./routes/forgot-password.tsx'));
const TermsPage = lazy(() => import('./routes/terms.tsx'));
const CheckoutPage = lazy(() => import('./routes/checkout.tsx'));
const MovingPage = lazy(() => import('./routes/moving.tsx'));
const SellPage = lazy(() => import('./routes/sell.tsx'));
const TechnicalServicePage = lazy(() => import('./routes/technical-service.tsx'));
const MyRequestsPage = lazy(() => import('./routes/my-requests.tsx'));
const RequestDetailPage = lazy(() => import('./routes/request-detail.tsx'));
const MyOrdersPage = lazy(() => import('./routes/my-orders.tsx'));
const OrderDetailPage = lazy(() => import('./routes/order-detail.tsx'));

/**
 * Oturum düştüğünde giriş sayfasına yönlendirir.
 *
 * API istemcisi yönlendirmeyi kendisi yapamaz; yapsaydı React Router'a bağımlı
 * olurdu. Bunun yerine bir geri çağrı kaydeder ve kabuk yönlendirmeyi üstlenir.
 */
function SessionWatcher() {
  const navigate = useNavigate();

  useEffect(() => {
    setSessionExpiredHandler(() => {
      // React Router 7'de `navigate` söz döndürür; sonucu beklemiyoruz.
      void navigate('/giris', { replace: true });
    });
  }, [navigate]);

  return null;
}

export function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SessionWatcher />

          <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route element={<SiteLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/urunler" element={<ProductsPage />} />
                <Route path="/urun/:slug" element={<ProductDetailPage />} />
                <Route path="/siparis-takip" element={<OrderTrackingPage />} />

                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogDetailPage />} />
                <Route path="/sss" element={<FaqPage />} />
                <Route path="/kullanim-kosullari" element={<TermsPage />} />
                <Route path="/sifremi-unuttum" element={<ForgotPasswordPage />} />
                <Route path="/giris" element={<LoginPage />} />
                <Route path="/kayit" element={<RegisterPage />} />

                <Route
                  path="/sepet"
                  element={
                    <RequireAuth>
                      <CartPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/urun-sat"
                  element={
                    <RequireAuth>
                      <SellPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/teknik-servis"
                  element={
                    <RequireAuth>
                      <TechnicalServicePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/nakliye"
                  element={
                    <RequireAuth>
                      <MovingPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/odeme"
                  element={
                    <RequireAuth>
                      <CheckoutPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/hesabim/siparislerim"
                  element={
                    <RequireAuth>
                      <MyOrdersPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/hesabim/taleplerim"
                  element={
                    <RequireAuth>
                      <MyRequestsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/hesabim/taleplerim/:requestId"
                  element={
                    <RequireAuth>
                      <RequestDetailPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/hesabim/siparislerim/:orderId"
                  element={
                    <RequireAuth>
                      <OrderDetailPage />
                    </RequireAuth>
                  }
                />

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>

          <Toaster position="top-center" richColors closeButton toastOptions={{ duration: 4000 }} />
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
