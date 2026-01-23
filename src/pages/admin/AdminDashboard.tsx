import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  DollarSign,
  Package,
  Truck,
  Wrench,
  ShoppingBag,
  Calendar,
  BarChart3,
  PieChart,
  Activity,
  XCircle,
  AlertCircle,
  Download,
  FileText,
  Printer,
  Maximize2,
  Minimize2,
  RefreshCw,
  TrendingDown
} from 'lucide-react@0.487.0';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RechartsPie, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface DashboardData {
  kpis: {
    totalRevenue: number;
    totalRequests: number;
    cancellationRate: number;
    acceptanceRate: number;
    avgResponseTime: number;
    customersCount: number;
    cartAbandonmentRate: number; // YENİ
  };
  charts: {
    monthlyTrend: any[];
    revenueDistribution: any[];
    cancellationAnalysis: any[];
    topSellRequestProducts: any[];
    topProblematicProducts: any[];
    topProblemCategories: any[];
    dailyTrend: any[];
  };
  pendingWork: {
    urgent: any[];
    awaitingResponse: any[];
  };
}

const COLORS = {
  orange: '#f97316',
  navy: '#1e3a8a',
  teal: '#14b8a6',
  purple: '#a855f7',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
  blue: '#3b82f6',
  pink: '#ec4899',
  indigo: '#6366f1',
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function AdminDashboard() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [filter, setFilter] = useState('month');
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [animateCards, setAnimateCards] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDashboardData();
    setAnimateCards(true);
  }, [filter]);

  // Auto refresh logic
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadDashboardData();
      }, 60000); // Her 1 dakikada bir
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/dashboard?filter=${filter}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Dashboard verileri yüklenemedi');
      }

      const dashboardData = await response.json();
      setData(dashboardData);
      console.log('📊 Dashboard data loaded:', dashboardData);

    } catch (error: any) {
      console.error('Dashboard yüklenirken hata:', error);
      toast.error('Dashboard yüklenemedi', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('tr-TR').format(value);
  };

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (!data) return;
    
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      csvContent += '=== ERSINSPOT DASHBOARD RAPORU ===\n\n';
      
      // KPIs
      csvContent += 'ANA METRIKLER\n';
      csvContent += `Toplam Gelir,${formatCurrency(data.kpis.totalRevenue)}\n`;
      csvContent += `Toplam Talepler,${data.kpis.totalRequests}\n`;
      csvContent += `İptal Oranı,%${data.kpis.cancellationRate}\n`;
      csvContent += `Kabul Oranı,%${data.kpis.acceptanceRate}\n`;
      csvContent += `Ort. Yanıt Süresi,${data.kpis.avgResponseTime} saat\n`;
      csvContent += `Müşteri Sayısı,${data.kpis.customersCount}\n`;
      csvContent += `Sepet Terk Oranı,%${data.kpis.cartAbandonmentRate}\n\n`;
      
      // Top selling products
      csvContent += 'EN ÇOK SATAN ÜRÜNLER\n';
      csvContent += 'Ürün,Satış Sayısı\n';
      data.charts.topSellingProducts.forEach((p: any) => {
        csvContent += `${p.name},${p.value}\n`;
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `dashboard_rapor_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Rapor indirildi', {
        description: 'CSV dosyası başarıyla oluşturuldu',
      });
    } catch (error) {
      toast.error('Export hatası', {
        description: 'Rapor oluşturulamadı',
      });
    }
  }, [data]);

  // Print dashboard
  const printDashboard = useCallback(() => {
    window.print();
  }, []);

  // Toggle chart expansion
  const toggleChartExpansion = useCallback((chartId: string) => {
    setExpandedChart(prev => prev === chartId ? null : chartId);
  }, []);

  // Memoized calculations
  const totalActiveRequests = useMemo(() => {
    if (!data?.pendingWork) return 0;
    return (data.pendingWork.urgent?.length || 0) + (data.pendingWork.awaitingResponse?.length || 0);
  }, [data]);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--brand-orange-600)] to-[var(--brand-orange-700)] text-white py-8 shadow-xl">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl mb-2 flex items-center gap-3">
                  <BarChart3 className="w-8 h-8" />
                  Admin Dashboard
                </h1>
                <p className="text-orange-100">
                  Ersinspot - İş Zekası ve Analitik Merkezi
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {/* Auto Refresh Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`text-white hover:bg-white/20 ${autoRefresh ? 'bg-white/20' : ''}`}
                  title="Otomatik Yenileme (1 dk)"
                >
                  <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                </Button>

                {/* Export CSV */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={!data}
                  className="text-white hover:bg-white/20"
                  title="CSV İndir"
                >
                  <Download className="w-4 h-4" />
                </Button>

                {/* Print */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={printDashboard}
                  disabled={!data}
                  className="text-white hover:bg-white/20"
                  title="Yazdır"
                >
                  <Printer className="w-4 h-4" />
                </Button>


              </div>
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Loading Indicator - Küçük ve üstte */}
        {loading && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#f97316]" />
            <p className="text-sm text-orange-700">Dashboard verileri yükleniyor...</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">
          {!data ? (
            // Skeleton Loaders
            <>
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <Card key={i} className="border-gray-200">
                  <CardHeader className="pb-3">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-20 mb-2" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-32" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              {/* Total Revenue */}
              <Card className={`bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:shadow-lg transition-all duration-300 hover:scale-105 ${animateCards ? 'animate-fade-in' : ''}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-green-700 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Toplam Gelir
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900">
                    {formatCurrency(data.kpis.totalRevenue)}
                  </div>
                  <p className="text-xs text-green-600 mt-1">
                    Onaylanan işlemler
                  </p>
                </CardContent>
              </Card>

          {/* Total Requests */}
          <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-700 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Toplam Talepler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {formatNumber(data.kpis.totalRequests)}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Tüm modüller
              </p>
            </CardContent>
          </Card>

          {/* Cancellation Rate */}
          <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-red-700 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                İptal Oranı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">
                %{data.kpis.cancellationRate}
              </div>
              <p className="text-xs text-red-600 mt-1">
                {data.kpis.cancellationRate < 10 ? '✅ Düşük' : data.kpis.cancellationRate < 20 ? '⚠️ Orta' : '🔴 Yüksek'}
              </p>
            </CardContent>
          </Card>

          {/* Acceptance Rate */}
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-purple-700 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Teklif Kabul Oranı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                %{data.kpis.acceptanceRate}
              </div>
              <p className="text-xs text-purple-600 mt-1">
                {data.kpis.acceptanceRate > 70 ? '🎉 Mükemmel' : data.kpis.acceptanceRate > 50 ? '✅ İyi' : '⚠️ Düşük'}
              </p>
            </CardContent>
          </Card>

          {/* Avg Response Time */}
          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-orange-700 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Ort. Yanıt Süresi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">
                {data.kpis.avgResponseTime.toFixed(1)} saat
              </div>
              <p className="text-xs text-orange-600 mt-1">
                {data.kpis.avgResponseTime < 24 ? '⚡ Hızlı' : data.kpis.avgResponseTime < 48 ? '✅ Normal' : '⏰ Yavaş'}
              </p>
            </CardContent>
          </Card>

              {/* Total Customers */}
              <Card className={`bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200 hover:shadow-lg transition-all duration-300 hover:scale-105 ${animateCards ? 'animate-fade-in' : ''}`} style={{ animationDelay: '0.5s' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-teal-700 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Toplam Kayıtlı Müşteri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-teal-900">
                    {formatNumber(data.kpis.customersCount)}
                  </div>
                  <p className="text-xs text-teal-600 mt-1">
                    Kayıtlı kullanıcı
                  </p>
                </CardContent>
              </Card>

              {/* Cart Abandonment Rate */}
              {data.kpis?.cartAbandonmentRate !== undefined && (
                <Card className={`bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200 hover:shadow-lg transition-all duration-300 hover:scale-105 ${animateCards ? 'animate-fade-in' : ''}`} style={{ animationDelay: '0.6s' }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-yellow-700 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      Sepet Terk Oranı
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-900">
                      %{data.kpis.cartAbandonmentRate}
                    </div>
                    <p className="text-xs text-yellow-600 mt-1">
                      {data.kpis.cartAbandonmentRate < 30 ? '✅ İyi' : data.kpis.cartAbandonmentRate < 60 ? '⚠️ Orta' : '🔴 Yüksek'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!data ? (
            // Skeleton Loaders for Charts
            <>
              <Card className="shadow-xl">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-48 mb-2" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-36" />
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
                </CardContent>
              </Card>
              <Card className="shadow-xl">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-48 mb-2" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-36" />
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] bg-gray-100 rounded animate-pulse" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Monthly Trend */}
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border-t-4 border-orange-500 animate-fade-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[var(--brand-orange-600)]" />
                    Modül Bazlı Talep Trendi
                  </CardTitle>
                  <CardDescription>Son 6 aylık talep sayıları</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data.charts.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="sipariş" stroke={COLORS.orange} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} animationDuration={1000} />
                  <Line type="monotone" dataKey="nakliye" stroke={COLORS.navy} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} animationDuration={1000} animationBegin={100} />
                  <Line type="monotone" dataKey="teknik servis" stroke={COLORS.teal} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} animationDuration={1000} animationBegin={200} />
                  <Line type="monotone" dataKey="ürün satış" stroke={COLORS.purple} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} animationDuration={1000} animationBegin={300} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Distribution */}
          <Card className="shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border-t-4 border-blue-500 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-[var(--brand-orange-600)]" />
                Gelir Dağılımı
              </CardTitle>
              <CardDescription>Modüllere göre gelir dağılımı</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RechartsPie>
                  <Pie
                    data={data.charts.revenueDistribution}
                    cx="50%"
                    cy="45%"
                    labelLine={true}
                    label={(entry) => {
                      const percent = ((entry.value / data.charts.revenueDistribution.reduce((sum: number, item: any) => sum + item.value, 0)) * 100).toFixed(1);
                      return `${entry.name}: ${formatCurrency(entry.value)}`;
                    }}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1200}
                  >
                    {data.charts.revenueDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value: string, entry: any) => `${value}: ${formatCurrency(entry.payload.value)}`}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </CardContent>
          </Card>
            </>
          )}
        </div>

        {/* Cancellation Analysis & Problem Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!data ? (
            <>
              <Card className="shadow-xl">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-48 mb-2" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-36" />
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] bg-gray-100 rounded animate-pulse" />
                </CardContent>
              </Card>
              <Card className="shadow-xl">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-48 mb-2" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-36" />
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] bg-gray-100 rounded animate-pulse" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Cancellation Analysis */}
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border-t-4 border-red-500 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    İptal Analizi (%)
                  </CardTitle>
                  <CardDescription>Modüllere göre iptal/red oranları</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.charts.cancellationAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  formatter={(value: number) => `%${value.toFixed(1)}`}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="rate" fill={COLORS.red} radius={[8, 8, 0, 0]} animationDuration={1000} animationBegin={0} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

              {/* Problem Categories */}
              <Card className="shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border-t-4 border-teal-500 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-[var(--brand-orange-600)]" />
                    Teknik Servis Problem Kategorileri
                  </CardTitle>
                  <CardDescription>En sık karşılaşılan sorunlar</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.charts.topProblemCategories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" fill={COLORS.teal} radius={[8, 8, 0, 0]} animationDuration={1000} animationBegin={0} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            </>
          )}
        </div>

        {/* Product Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!data ? (
            <>
              {[1, 2].map((i) => (
                <Card key={i} className="shadow-xl">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-48 mb-2" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-36" />
                  </CardHeader>
                  <CardContent>
                  <div className="h-[280px] bg-gray-100 rounded animate-pulse" />
                </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
          {/* Top Sell Request Products */}
          <Card className="shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border-t-4 border-purple-500 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[var(--brand-purple-600)]" />
                En Çok Satış Talebi Olan Markalar
              </CardTitle>
              <CardDescription>Hangi markaların ürünleri daha çok satılmak isteniyor</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.charts.topSellRequestProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" />
                  <YAxis dataKey="name" type="category" width={100} stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill={COLORS.purple} radius={[0, 8, 8, 0]} animationDuration={1000} animationBegin={0} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Most Problematic Products */}
          <Card className="shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] border-t-4 border-red-500 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <Wrench className="w-5 h-5" />
                En Sorunlu Ürünler
              </CardTitle>
              <CardDescription>En çok teknik servis talebi oluşturulan</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.charts.topProblematicProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" />
                  <YAxis dataKey="name" type="category" width={100} stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill={COLORS.red} radius={[0, 8, 8, 0]} animationDuration={1000} animationBegin={0} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
            </>
          )}
        </div>

      </div>
    </div>
    </AdminLayout>
  );
}
