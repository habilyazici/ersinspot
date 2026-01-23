import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Shield, AlertTriangle, CheckCircle2, Loader2, RefreshCw, Users } from 'lucide-react@0.487.0';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485`;

export default function AdminSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [showAdmins, setShowAdmins] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: 'Admin'
  });

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      console.log('[ADMIN-SETUP] Testing backend connectivity...');
      console.log('[ADMIN-SETUP] API URL:', API_URL);
      
      // Test ping first
      try {
        const pingResponse = await fetch(`${API_URL}/auth/ping`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        });
        const pingData = await pingResponse.json();
        console.log('[ADMIN-SETUP] ✅ Backend ping successful:', pingData);
      } catch (pingError) {
        console.error('[ADMIN-SETUP] ❌ Backend ping failed:', pingError);
        throw new Error('Backend sunucusuna erişilemiyor');
      }
      
      console.log('[ADMIN-SETUP] Fetching existing admins...');
      const response = await fetch(`${API_URL}/auth/list-admins`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ADMIN-SETUP] HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log('[ADMIN-SETUP] Admin list response:', data);
      
      if (data.success) {
        setAdmins(data.admins || []);
        toast.success(`${data.count || 0} admin hesabı bulundu`);
      } else {
        console.error('[ADMIN-SETUP] Failed to fetch admins:', data.error);
        toast.error('Admin listesi alınamadı', {
          description: data.error
        });
      }
    } catch (error: any) {
      console.error('[ADMIN-SETUP] Error fetching admins:', error);
      toast.error('Admin listesi alınamadı', {
        description: error.message
      });
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    console.log('[ADMIN-SETUP] Component mounted');
    console.log('[ADMIN-SETUP] Environment check:', {
      projectId: projectId ? '✅' : '❌',
      publicAnonKey: publicAnonKey ? '✅' : '❌',
      apiUrl: API_URL
    });
    // Sayfa yüklendiğinde admin listesini getir
    fetchAdmins();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('[ADMIN-SETUP] Sending admin creation request...', {
        email: formData.email,
        name: formData.name,
        endpoint: `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/auth/make-admin`
      });
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/auth/make-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name
          }),
        }
      );
      
      // Response'u önce text olarak oku, sonra parse et
      const responseText = await response.text();
      console.log('[ADMIN-SETUP] Raw response:', { 
        status: response.status, 
        statusText: response.statusText,
        text: responseText.substring(0, 200) // İlk 200 karakter
      });
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[ADMIN-SETUP] JSON parse error:', parseError);
        console.error('[ADMIN-SETUP] Full response text:', responseText);
        throw new Error(`Sunucu yanıtı JSON formatında değil: ${responseText.substring(0, 100)}`);
      }
      
      console.log('[ADMIN-SETUP] Parsed data:', data);
      
      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Admin oluşturulamadı';
        const details = data.details ? `\n\nDetaylar: ${data.details}` : '';
        const existingEmail = data.existingEmail ? `\n\nMevcut email: ${data.existingEmail}` : '';
        console.error('[ADMIN-SETUP] Error details:', { status: response.status, error: errorMsg, fullData: data });
        throw new Error(errorMsg + details + existingEmail);
      }
      
      toast.success('Admin hesabı başarıyla oluşturuldu!', {
        description: 'Şimdi giriş yapabilirsiniz.'
      });
      
      // Admin listesini yenile
      await fetchAdmins();
      
      // 2 saniye bekle ve giriş sayfasına yönlendir
      setTimeout(() => {
        navigate('/admin/giris');
      }, 2000);
      
    } catch (error: any) {
      console.error('[ADMIN-SETUP] Error:', error);
      toast.error('Admin Oluşturma Hatası', {
        description: error.message || 'Admin hesabı oluşturulamadı. Console\'u kontrol edin.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#f97316] to-[#fb923c] rounded-2xl flex items-center justify-center shadow-2xl">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Admin Kurulum</CardTitle>
          <CardDescription className="text-center">
            İlk admin hesabınızı oluşturun
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Uyarı */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Güvenlik Uyarısı</p>
                <ul className="space-y-1 text-xs">
                  <li>• Bu sayfa ilk kurulum veya admin hesabı kurtarma için kullanılır</li>
                  <li>• Admin hesabınızı yanlışlıkla sildiyseniz bu sayfadan yeniden oluşturabilirsiniz</li>
                  <li>• Güçlü bir şifre seçin</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Otomatik Kurulum Bildirisi */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Otomatik Kurulum</p>
                <p className="text-xs">
                  Gerekli veritabanı tabloları ve kolonları otomatik olarak oluşturulacak. 
                  Herhangi bir SQL komutu çalıştırmanıza gerek yok.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">İsim</Label>
              <Input
                id="name"
                type="text"
                placeholder="Admin"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ersinspot.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-[#f97316] to-[#fb923c] hover:from-[#ea580c] hover:to-[#f97316]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Admin Hesabı Oluştur
                </>
              )}
            </Button>
          </form>

          {/* Mevcut Admin Hesapları */}
          <div className="mt-6">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowAdmins(!showAdmins);
                if (!showAdmins) fetchAdmins();
              }}
            >
              <Users className="w-4 h-4 mr-2" />
              {showAdmins ? 'Gizle' : 'Mevcut Admin Hesaplarını Göster'}
            </Button>

            {showAdmins && (
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-purple-900">
                    Veritabanındaki Adminler ({admins.length})
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={fetchAdmins}
                    disabled={loadingAdmins}
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingAdmins ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {loadingAdmins ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600" />
                  </div>
                ) : admins.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-purple-700">
                      ❌ Henüz admin hesabı yok. Yukarıdaki formu doldurup ilk admin hesabını oluşturun.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {admins.map((admin, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-purple-200 rounded text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-purple-900">{admin.email}</p>
                            <p className="text-xs text-purple-600">{admin.name}</p>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Oluşturulma: {new Date(admin.created_at).toLocaleString('tr-TR')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bilgilendirme */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Sonraki Adım</p>
                <p className="text-xs">
                  Admin hesabı oluşturduktan sonra <span className="font-semibold">/admin/giris</span> sayfasından giriş yapabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
