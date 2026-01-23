import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485`;

export default function AdminRepair() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'checking' | 'found' | 'not-found' | 'creating' | 'success' | 'error'>('checking');
  const [admins, setAdmins] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkAdmins();
  }, []);

  const checkAdmins = async () => {
    try {
      // Check current session
      const storedSession = localStorage.getItem('auth_session');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        setCurrentUser(session.user);
      }

      // Fetch all admins
      const response = await fetch(`${API_URL}/auth/list-admins`);
      const data = await response.json();

      if (data.success && data.admins && data.admins.length > 0) {
        setAdmins(data.admins);
        setStep('found');
      } else {
        setStep('not-found');
      }
    } catch (err: any) {
      console.error('Error checking admins:', err);
      setStep('not-found');
    }
  };

  const clearAndRedirect = (path: string) => {
    localStorage.clear();
    navigate(path);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔧</span>
          </div>
          <h1 className="text-3xl text-gray-900 mb-2">Admin Onarım Merkezi</h1>
          <p className="text-gray-600">Admin erişim sorunlarını çözüyoruz</p>
        </div>

        {/* Checking */}
        {step === 'checking' && (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-700">Sistem kontrol ediliyor...</p>
          </div>
        )}

        {/* Admins Found */}
        {step === 'found' && (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl text-gray-900 mb-4 flex items-center gap-2">
                ✅ Sistemde {admins.length} admin hesabı bulundu
              </h2>
              <div className="space-y-3">
                {admins.map((admin, idx) => (
                  <div key={idx} className="bg-white p-4 rounded border border-green-300">
                    <p className="text-gray-900">
                      <span className="font-semibold">Email:</span> {admin.email}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">İsim:</span> {admin.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg text-gray-900 mb-3">🎯 Şimdi Ne Yapmalısınız?</h3>
              
              {currentUser ? (
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Şu anda <span className="font-semibold text-orange-600">{currentUser.email}</span> ile giriş yaptınız.
                  </p>
                  
                  {admins.some(a => a.email === currentUser.email) ? (
                    <div className="bg-green-100 p-4 rounded">
                      <p className="text-green-800 font-semibold mb-2">
                        ✅ Bu hesap admin! Sistem yenileniyor...
                      </p>
                      <button
                        onClick={() => {
                          localStorage.clear();
                          navigate('/admin/giris');
                          window.location.reload();
                        }}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Tekrar Giriş Yap ve Düzelt
                      </button>
                    </div>
                  ) : (
                    <div className="bg-orange-100 p-4 rounded">
                      <p className="text-orange-800 font-semibold mb-3">
                        ⚠️ Bu hesap admin değil!
                      </p>
                      <p className="text-gray-700 mb-3">
                        Yukarıdaki admin emaillerinden biriyle giriş yapmalısınız.
                      </p>
                      <button
                        onClick={() => clearAndRedirect('/admin/giris')}
                        className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 w-full"
                      >
                        Çıkış Yap ve Admin ile Giriş Yap
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 mb-4">Giriş yapmamışsınız. Yukarıdaki admin hesaplarından biriyle giriş yapın.</p>
                  <button
                    onClick={() => navigate('/admin/giris')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full"
                  >
                    Admin Giriş Sayfasına Git
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Admins Found */}
        {step === 'not-found' && (
          <div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <h2 className="text-xl text-gray-900 mb-3 flex items-center gap-2">
                ❌ Sistemde hiç admin hesabı yok!
              </h2>
              <p className="text-gray-700">
                İlk admin hesabını oluşturmanız gerekiyor.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => clearAndRedirect('/admin/setup')}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 w-full text-lg"
              >
                🚀 İlk Admin Hesabını Oluştur
              </button>
              
              <button
                onClick={checkAdmins}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 w-full"
              >
                🔄 Tekrar Kontrol Et
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {step === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl text-red-800 mb-3">❌ Hata Oluştu</h2>
            <p className="text-gray-700 mb-4">{error}</p>
            <button
              onClick={checkAdmins}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            🏠 Ana Sayfa
          </button>
        </div>
      </div>
    </div>
  );
}
