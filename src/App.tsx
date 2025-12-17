import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import { Footer } from './components/Footer';
import { FloatingContactButtons } from './components/FloatingContactButtons';
import { AdminRoute } from './components/AdminRoute';
import { CustomerRoute } from './components/CustomerRoute';
import LoginPage from './pages/LoginPage';
import LogoutPage from './pages/LogoutPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import CustomerDashboard from './pages/CustomerDashboard';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { Toaster } from './components/ui/sonner';
import ScrollToTop from './components/ScrollToTop';
import { ErrorBoundary } from './ErrorBoundary';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import TechnicalServicePage from './pages/TechnicalServicePage';
import MovingServicePage from './pages/MovingServicePage';
import SellProductPage from './pages/SellProductPage';
import CartPage from './pages/CartPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import MyProfilePage from './pages/MyProfilePage';
import MyOrdersPage from './pages/MyOrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import MyTechnicalServicePage from './pages/MyTechnicalServicePage';
import TechnicalServiceDetailPage from './pages/TechnicalServiceDetailPage';
import MyMovingPage from './pages/MyMovingPage';
import MovingDetailPage from './pages/MovingDetailPage';
import MyFavoritesPage from './pages/MyFavoritesPage';
import MyReportsPage from './pages/MyReportsPage';
import ReportViewPage from './pages/ReportViewPage';
import MovingReportPage from './pages/MovingReportPage';
import MySellRequestsPage from './pages/MySellRequestsPage';
import SellRequestDetailPage from './pages/SellRequestDetailPage';
import SellRequestProcessPage from './pages/SellRequestProcessPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import BlogPage from './pages/BlogPage';
import BlogDetailPage from './pages/BlogDetailPage';
import FAQPage from './pages/FAQPage';
import NotFoundPage from './pages/NotFoundPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminSetup from './pages/admin/AdminSetup';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminBookings from './pages/admin/AdminBookings';
import AdminSellRequests from './pages/admin/AdminSellRequests';
import AdminMovingManagement from './pages/admin/AdminMovingManagement';
import AdminTechnicalServiceManagement from './pages/admin/AdminTechnicalServiceManagement';
import AdminMessages from './pages/admin/AdminMessages';
import AdminQuickAccess from './pages/admin/AdminQuickAccess';
import QuickFixPage from './pages/QuickFixPage';

// Layout wrapper component
function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Admin sayfalarında navbar ve footer gösterme
  if (isAdminRoute) {
    return <>{children}</>;
  }

  // Normal sayfalarda navbar ve footer göster
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <Router>
              <ScrollToTop />
              <div className="min-h-screen flex flex-col bg-gray-50 overflow-x-hidden">
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<><HomePage /><FloatingContactButtons /></>} />
                    <Route path="/urunler" element={<ProductsPage />} />
                    <Route path="/urun/:id" element={<ProductDetailPage />} />
                    <Route path="/urun-sat" element={<SellProductPage />} />
                    <Route path="/teknik-servis" element={<TechnicalServicePage />} />
                    <Route path="/nakliye" element={<MovingServicePage />} />
                    <Route path="/sepet" element={<CartPage />} />
                    <Route path="/siparis-takip" element={<OrderTrackingPage />} />
                    <Route path="/giris" element={<LoginPage />} />
                    <Route path="/giris-yap" element={<LoginPage />} />
                    <Route path="/kayit" element={<LoginPage />} />
                    <Route path="/kayit-ol" element={<LoginPage />} />
                    <Route path="/sifremi-unuttum" element={<ForgotPasswordPage />} />
                    <Route path="/sifre-sifirlama" element={<ResetPasswordPage />} />
                    <Route path="/sifremi-sifirla" element={<ResetPasswordPage />} />
                    <Route path="/cikis" element={<LogoutPage />} />
                    <Route path="/auth/callback" element={<AuthCallbackPage />} />
                    
                    {/* Customer Routes - Admin kullanıcıları erişemez */}
                    <Route path="/hesabim" element={<CustomerRoute><CustomerDashboard /></CustomerRoute>} />
                    <Route path="/hesabim/profil" element={<CustomerRoute><MyProfilePage /></CustomerRoute>} />
                    <Route path="/hesabim/siparislerim" element={<CustomerRoute><MyOrdersPage /></CustomerRoute>} />
                    <Route path="/hesabim/siparislerim/detay/:id" element={<CustomerRoute><OrderDetailPage /></CustomerRoute>} />
                    <Route path="/hesabim/teknik-servis" element={<CustomerRoute><MyTechnicalServicePage /></CustomerRoute>} />
                    <Route path="/hesabim/teknik-servis/detay/:id" element={<CustomerRoute><TechnicalServiceDetailPage /></CustomerRoute>} />
                    <Route path="/hesabim/nakliye" element={<CustomerRoute><MyMovingPage /></CustomerRoute>} />
                    <Route path="/hesabim/nakliye/detay/:id" element={<CustomerRoute><MovingDetailPage /></CustomerRoute>} />
                    <Route path="/hesabim/favorilerim" element={<CustomerRoute><MyFavoritesPage /></CustomerRoute>} />
                    <Route path="/hesabim/raporlarim" element={<CustomerRoute><MyReportsPage /></CustomerRoute>} />
                    <Route path="/hesabim/raporlarim/:type/:id" element={<CustomerRoute><ReportViewPage /></CustomerRoute>} />
                    <Route path="/hesabim/raporlarim/nakliye/:id" element={<CustomerRoute><MovingReportPage /></CustomerRoute>} />
                    <Route path="/hesabim/satis-taleplerim" element={<CustomerRoute><MySellRequestsPage /></CustomerRoute>} />
                    <Route path="/hesabim/satis-taleplerim/detay/:id" element={<CustomerRoute><SellRequestDetailPage /></CustomerRoute>} />
                    <Route path="/hesabim/satis-taleplerim/talep-detay/:id" element={<CustomerRoute><SellRequestDetailPage /></CustomerRoute>} />
                    <Route path="/hesabim/satis-taleplerim/islem-detay/:id" element={<CustomerRoute><SellRequestProcessPage /></CustomerRoute>} />
                    <Route path="/hakkimizda" element={<AboutPage />} />
                    <Route path="/iletisim" element={<ContactPage />} />
                    <Route path="/blog" element={<BlogPage />} />
                    <Route path="/blog/:slug" element={<BlogDetailPage />} />
                    <Route path="/sss" element={<FAQPage />} />
                    <Route path="/404" element={<NotFoundPage />} />
                    
                    {/* Admin Routes - Navbar ve Footer YOK */}
                    <Route path="/admin/setup" element={<AdminSetup />} />
                    <Route path="/admin/giris" element={<AdminLoginPage />} />
                    <Route path="/admin" element={<AdminRoute><Navigate to="/admin/hizli-erisim" replace /></AdminRoute>} />
                    <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    <Route path="/admin/hizli-erisim" element={<AdminRoute><AdminQuickAccess /></AdminRoute>} />
                    <Route path="/admin/urunler" element={<AdminRoute><AdminProducts /></AdminRoute>} />
                    <Route path="/admin/siparisler" element={<AdminRoute><AdminOrders /></AdminRoute>} />
                    <Route path="/admin/satis-talepleri" element={<AdminRoute><AdminSellRequests /></AdminRoute>} />
                    <Route path="/admin/nakliye" element={<AdminRoute><AdminMovingManagement /></AdminRoute>} />
                    <Route path="/admin/teknik-servis" element={<AdminRoute><AdminTechnicalServiceManagement /></AdminRoute>} />
                    <Route path="/admin/randevular" element={<AdminRoute><AdminBookings /></AdminRoute>} />
                    <Route path="/admin/mesajlar" element={<AdminRoute><AdminMessages /></AdminRoute>} />
                    <Route path="/admin/raporlar/:type/:id" element={<AdminRoute><ReportViewPage /></AdminRoute>} />
                    <Route path="/admin/raporlar/nakliye/:id" element={<AdminRoute><MovingReportPage /></AdminRoute>} />
                    
                    <Route path="/quick-fix" element={<QuickFixPage />} />
                    
                    <Route path="*" element={<Navigate to="/404" replace />} />
                  </Routes>
                </AppLayout>
                <Toaster 
                  position="top-center" 
                  offset="80px"
                  richColors
                  closeButton={false}
                  expand={false}
                  visibleToasts={5}
                  pauseWhenPageIsHidden={false}
                  pauseOnHover={false}
                  duration={2000}
                  dismissible={false}
                  interactable={false}
                  toastOptions={{
                    style: {
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      color: '#1f2937',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      zIndex: 99999,
                      pointerEvents: 'none',
                    },
                    className: 'toast-custom',
                    dismissible: false,
                  }}
                />
              </div>
            </Router>
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}