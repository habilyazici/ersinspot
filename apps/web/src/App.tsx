/**
 * Uygulama kabuğu.
 *
 * Sağlayıcılar, yönlendirme ve hata sınırı burada kurulur. Sayfalar `React.lazy`
 * ile bölünür: eski derleme 2,2 MB'lık tek parça üretiyordu ve anasayfayı açan
 * kullanıcı yönetim panelinin tamamını da indiriyordu.
 */

import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient, setUnauthenticatedHandler } from '@/lib/api';
import { AppErrorBoundary } from '@/components/layout/error-boundary.tsx';
import { ScrollToTop } from '@/components/layout/scroll-to-top.tsx';
import { SiteLayout } from '@/components/layout/site-layout.tsx';
import { PageSpinner } from '@/components/ui/spinner.tsx';
import { RequireAuth, RequireStaff, authKeys } from '@/features/auth';

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
import { AdminLayout } from '@/components/layout/admin-layout.tsx';

const AccountPage = lazy(() => import('./routes/account.tsx'));
const AdminDashboardPage = lazy(() => import('./routes/admin/dashboard.tsx'));
const AdminOrdersPage = lazy(() => import('./routes/admin/orders.tsx'));
const AdminOrderDetailPage = lazy(() => import('./routes/admin/order-detail.tsx'));
const AdminRequestsPage = lazy(() => import('./routes/admin/requests.tsx'));
const AdminRequestDetailPage = lazy(() => import('./routes/admin/request-detail.tsx'));
const AdminMessagesPage = lazy(() => import('./routes/admin/messages.tsx'));
const AdminFaqsPage = lazy(() => import('./routes/admin/faqs.tsx'));
const AdminSettingsPage = lazy(() => import('./routes/admin/settings.tsx'));
const AdminProductsPage = lazy(() => import('./routes/admin/products.tsx'));
const AdminProductFormPage = lazy(() => import('./routes/admin/product-form.tsx'));
const AdminBlogPage = lazy(() => import('./routes/admin/blog.tsx'));
const BlogPage = lazy(() => import('./routes/blog.tsx'));
const BlogDetailPage = lazy(() => import('./routes/blog-detail.tsx'));
const CartPage = lazy(() => import('./routes/cart.tsx'));
const FavoritesPage = lazy(() => import('./routes/favorites.tsx'));
const FaqPage = lazy(() => import('./routes/faq.tsx'));
const ForgotPasswordPage = lazy(() => import('./routes/forgot-password.tsx'));
const ResetPasswordPage = lazy(() => import('./routes/reset-password.tsx'));
const TermsPage = lazy(() => import('./routes/terms.tsx'));
const VerifyEmailPage = lazy(() => import('./routes/verify-email.tsx'));
const CheckoutPage = lazy(() => import('./routes/checkout.tsx'));
const MovingPage = lazy(() => import('./routes/moving.tsx'));
const SellPage = lazy(() => import('./routes/sell.tsx'));
const TechnicalServicePage = lazy(() => import('./routes/technical-service.tsx'));
const MyRequestsPage = lazy(() => import('./routes/my-requests.tsx'));
const RequestDetailPage = lazy(() => import('./routes/request-detail.tsx'));
const MyOrdersPage = lazy(() => import('./routes/my-orders.tsx'));
const OrderDetailPage = lazy(() => import('./routes/order-detail.tsx'));

/**
 * Sunucu 401 döndüğünde oturum önbelleğini misafir durumuna çeker.
 *
 * YÖNLENDİRME YAPMAZ. Korumalı sayfada `RequireAuth` zaten oturumsuz
 * kullanıcıyı girişe gönderir; herkese açık sayfada ise yönlendirme
 * istenmez — misafir ziyaretçide de 401 dönen uçlar var (başlıktaki sepet
 * sayacı, oturum sorgusu) ve bunlar anasayfayı açan herkesi girişe atardı.
 */
function SessionWatcher() {
  useEffect(() => {
    setUnauthenticatedHandler(() => {
      queryClient.setQueryData(authKeys.currentUser, null);
    });
  }, []);

  return null;
}

export function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <SessionWatcher />
          <ScrollToTop />

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
                {/*
                  E-postayla gönderilen bağlantıların indiği sayfalar. Adresleri
                  sunucu üretir (`${WEB_ORIGIN}/sifre-sifirla?token=...`); ikisi
                  de oturum GEREKTİRMEZ — şifresini unutan kullanıcı giriş
                  yapamaz, doğrulama bağlantısı da başka bir cihazda açılabilir.
                */}
                <Route path="/sifre-sifirla" element={<ResetPasswordPage />} />
                <Route path="/eposta-dogrula" element={<VerifyEmailPage />} />
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
                  path="/hesabim"
                  element={
                    <RequireAuth>
                      <AccountPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="/hesabim/favorilerim"
                  element={
                    <RequireAuth>
                      <FavoritesPage />
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

                {/*
                  Yönetim paneli.

                  Yetki TEK YERDE kesilir: `RequireStaff` dış rotada durur, alt
                  sayfalarda tekrar kontrol edilmez. İki yerde kontrol etmek,
                  birinin unutulması hâlinde diğerine güvenmeye yol açar.
                */}
                <Route
                  path="/yonetim"
                  element={
                    <RequireStaff>
                      <AdminLayout />
                    </RequireStaff>
                  }
                >
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="siparisler" element={<AdminOrdersPage />} />
                  <Route path="siparisler/:orderId" element={<AdminOrderDetailPage />} />
                  <Route path="talepler" element={<AdminRequestsPage />} />
                  <Route path="talepler/:requestId" element={<AdminRequestDetailPage />} />
                  <Route path="urunler" element={<AdminProductsPage />} />
                  {/*
                    "yeni" ve bir ürün kimliği aynı rotaya düşer; form hangi
                    işi yapacağını adresten anlar. Ayrı iki rota, aynı formun
                    iki kez bağlanması demek olurdu.
                  */}
                  <Route path="urunler/:productId" element={<AdminProductFormPage />} />
                  <Route path="mesajlar" element={<AdminMessagesPage />} />
                  <Route path="blog" element={<AdminBlogPage />} />
                  <Route path="sss" element={<AdminFaqsPage />} />
                  <Route path="ayarlar" element={<AdminSettingsPage />} />
                </Route>

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
