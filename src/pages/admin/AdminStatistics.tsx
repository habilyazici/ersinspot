import { useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Package, 
  Banknote,
  ShoppingCart,
  Wrench,
  Truck,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  FileText,
  Download,
  Eye,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react@0.487.0';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AdminLayout } from '../../components/admin/AdminLayout';

export default function AdminStatistics() {
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  // Ana İstatistik Kartları
  const mainStats = [
    {
      title: 'Toplam Gelir',
      value: '₺148,250',
      change: '+12.5%',
      trend: 'up',
      icon: Banknote,
      color: 'from-green-600 to-green-500',
      bgLight: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'Toplam Satış',
      value: '156',
      change: '+8.2%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'from-blue-600 to-blue-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Teknik Servis',
      value: '89',
      change: '+15.3%',
      trend: 'up',
      icon: Wrench,
      color: 'from-orange-600 to-orange-500',
      bgLight: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      title: 'Nakliye İşlemi',
      value: '34',
      change: '-2.4%',
      trend: 'down',
      icon: Truck,
      color: 'from-purple-600 to-purple-500',
      bgLight: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
  ];

  // Aylık Gelir Trendi
  const revenueData = [
    { month: 'Haz', gelir: 95000, hedef: 100000 },
    { month: 'Tem', gelir: 112000, hedef: 110000 },
    { month: 'Ağu', gelir: 128000, hedef: 120000 },
    { month: 'Eyl', gelir: 135000, hedef: 130000 },
    { month: 'Eki', gelir: 142000, hedef: 140000 },
    { month: 'Kas', gelir: 148250, hedef: 145000 },
  ];

  // Hizmet Dağılımı
  const serviceDistribution = [
    { name: 'Ürün Satışı', value: 45, color: '#1e3a8a' },
    { name: 'Teknik Servis', value: 32, color: '#f97316' },
    { name: 'Nakliye', value: 15, color: '#8B6F47' },
    { name: 'Ürün Alımı', value: 8, color: '#7FA99B' },
  ];

  // Haftalık İşlem Sayıları
  const weeklyOperations = [
    { day: 'Pzt', satis: 12, servis: 8, nakliye: 3 },
    { day: 'Sal', satis: 15, servis: 10, nakliye: 5 },
    { day: 'Çar', satis: 18, servis: 12, nakliye: 4 },
    { day: 'Per', satis: 14, servis: 9, nakliye: 6 },
    { day: 'Cum', satis: 20, servis: 15, nakliye: 7 },
    { day: 'Cmt', satis: 25, servis: 18, nakliye: 9 },
    { day: 'Paz', satis: 10, servis: 6, nakliye: 2 },
  ];

  // Kategori Bazlı Satışlar
  const categorySales = [
    { category: 'Beyaz Eşya', satis: 68, gelir: 89500 },
    { category: 'Elektronik', satis: 45, gelir: 52300 },
    { category: 'Mobilya', satis: 23, gelir: 34200 },
    { category: 'Diğer', satis: 20, gelir: 12250 },
  ];

  // En Çok Satan Ürünler
  const topProducts = [
    { name: 'Samsung Buzdolabı', sales: 24, revenue: '₺42,600' },
    { name: 'LG Çamaşır Makinesi', sales: 18, revenue: '₺28,800' },
    { name: 'Bosch Bulaşık Makinesi', sales: 15, revenue: '₺22,500' },
    { name: 'Sony Smart TV', sales: 12, revenue: '₺31,200' },
    { name: 'Arçelik Fırın', sales: 10, revenue: '₺15,000' },
  ];

  // Müşteri Memnuniyeti
  const customerSatisfaction = [
    { score: 5, count: 142, percentage: 68 },
    { score: 4, count: 48, percentage: 23 },
    { score: 3, count: 12, percentage: 6 },
    { score: 2, count: 4, percentage: 2 },
    { score: 1, count: 2, percentage: 1 },
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 mb-2">Dashboard - Genel İstatistikler</h1>
            <p className="text-gray-600">Detaylı analiz ve raporlar</p>
          </div>
          
          {/* Periyod Seçici */}
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedPeriod === 'week'
                  ? 'bg-[#1e3a8a] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Haftalık
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedPeriod === 'month'
                  ? 'bg-[#1e3a8a] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Aylık
            </button>
            <button
              onClick={() => setSelectedPeriod('year')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedPeriod === 'year'
                  ? 'bg-[#1e3a8a] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Yıllık
            </button>
          </div>
        </div>
      </div>

      {/* Ana İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {mainStats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          
          return (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden">
              <CardContent className="p-0">
                <div className={`bg-gradient-to-br ${stat.color} p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-8 h-8 text-white" />
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                      stat.trend === 'up' ? 'bg-white/20' : 'bg-black/20'
                    }`}>
                      <TrendIcon className="w-4 h-4 text-white" />
                      <span className="text-xs text-white font-medium">{stat.change}</span>
                    </div>
                  </div>
                  <p className="text-white/80 text-sm mb-1">{stat.title}</p>
                  <p className="text-white text-3xl">{stat.value}</p>
                </div>
                <div className={`${stat.bgLight} p-3 text-center`}>
                  <p className={`text-xs ${stat.textColor} font-medium`}>
                    Son 30 Gün
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Grafikler - 1. Satır */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Gelir Trendi */}
        <Card className="lg:col-span-2 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Aylık Gelir Trendi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="gelir" 
                  stroke="#1e3a8a" 
                  fillOpacity={1} 
                  fill="url(#colorGelir)"
                  name="Gelir (₺)"
                />
                <Line 
                  type="monotone" 
                  dataKey="hedef" 
                  stroke="#f97316" 
                  strokeDasharray="5 5"
                  name="Hedef (₺)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hizmet Dağılımı */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Hizmet Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {serviceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Grafikler - 2. Satır */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Haftalık İşlemler */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Haftalık İşlem Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyOperations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="satis" fill="#1e3a8a" name="Satış" />
                <Bar dataKey="servis" fill="#f97316" name="Servis" />
                <Bar dataKey="nakliye" fill="#8B6F47" name="Nakliye" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Kategori Bazlı Satışlar */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              Kategori Bazlı Satışlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categorySales.map((category, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{category.category}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">{category.satis} Satış</span>
                      <span className="text-xs text-gray-500 ml-2">₺{category.gelir.toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] h-2 rounded-full transition-all"
                      style={{ width: `${(category.satis / 156) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alt Bölüm - Tablolar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* En Çok Satan Ürünler */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              En Çok Satan Ürünler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1e3a8a] text-white font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.sales} Adet</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">{product.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Müşteri Memnuniyeti */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Müşteri Memnuniyeti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Ortalama Skor */}
              <div className="text-center p-4 bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] rounded-lg text-white">
                <p className="text-sm mb-1">Ortalama Puan</p>
                <p className="text-4xl">4.6 / 5</p>
                <p className="text-xs mt-1 opacity-80">208 Değerlendirme</p>
              </div>

              {/* Puan Dağılımı */}
              <div className="space-y-2">
                {customerSatisfaction.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-sm font-medium text-gray-700">{item.score}</span>
                      <span className="text-yellow-400">★</span>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-12 text-right">
                      <span className="text-xs text-gray-500">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Raporlar Bölümü */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#1e3a8a] to-[#1e3a8a]/80 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Son Raporlar</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Tamamlanan işlemlerin detaylı raporları</p>
                </div>
              </div>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Tümünü İndir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Rapor No</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Tip</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Başlık</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Müşteri</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Tarih</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-700">Durum</th>
                    <th className="text-right p-4 text-sm font-semibold text-gray-700">Tutar</th>
                    <th className="text-center p-4 text-sm font-semibold text-gray-700">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    {
                      id: 'RPT-2025-001',
                      tip: 'siparis',
                      baslik: 'Samsung Buzdolabı 528 LT Satış',
                      musteri: 'Ahmet Yılmaz',
                      tarih: '2025-11-21 14:30',
                      durum: 'tamamlandi',
                      tutar: 25000
                    },
                    {
                      id: 'RPT-2025-002',
                      tip: 'servis',
                      baslik: 'Çamaşır Makinesi Tamiri',
                      musteri: 'Ayşe Demir',
                      tarih: '2025-11-20 10:15',
                      durum: 'tamamlandi',
                      tutar: 1500
                    },
                    {
                      id: 'RPT-2025-003',
                      tip: 'nakliye',
                      baslik: '3+1 Daire Taşıma - Buca',
                      musteri: 'Mehmet Kaya',
                      tarih: '2025-11-19 09:00',
                      durum: 'tamamlandi',
                      tutar: 5500
                    },
                    {
                      id: 'RPT-2025-004',
                      tip: 'siparis',
                      baslik: 'LG Smart TV 55" OLED',
                      musteri: 'Fatma Öz',
                      tarih: '2025-11-18 16:45',
                      durum: 'tamamlandi',
                      tutar: 18000
                    },
                    {
                      id: 'RPT-2025-005',
                      tip: 'servis',
                      baslik: 'Bulaşık Makinesi Arıza',
                      musteri: 'Ali Veli',
                      tarih: '2025-11-17 11:30',
                      durum: 'tamamlandi',
                      tutar: 2200
                    }
                  ].map((rapor) => (
                    <tr key={rapor.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <span className="text-sm font-medium text-gray-900">{rapor.id}</span>
                      </td>
                      <td className="p-4">
                        <Badge 
                          className={`
                            ${rapor.tip === 'siparis' ? 'bg-blue-100 text-blue-700 border-blue-200' : ''}
                            ${rapor.tip === 'servis' ? 'bg-orange-100 text-orange-700 border-orange-200' : ''}
                            ${rapor.tip === 'nakliye' ? 'bg-purple-100 text-purple-700 border-purple-200' : ''}
                          `}
                        >
                          {rapor.tip === 'siparis' ? '🛒 Sipariş' : rapor.tip === 'servis' ? '🔧 Servis' : '🚚 Nakliye'}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-700">{rapor.baslik}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-700">{rapor.musteri}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-500">{rapor.tarih}</span>
                      </td>
                      <td className="p-4">
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Tamamlandı
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-semibold text-gray-900">{rapor.tutar.toLocaleString('tr-TR')} ₺</span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-700 hover:bg-gray-100">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
