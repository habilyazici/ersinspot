import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { toast } from 'sonner@2.0.3';
import { RefreshCw, CheckCircle2, AlertCircle, Database, Copy, ExternalLink } from 'lucide-react@0.487.0';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export default function QuickFixPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showSqlInstructions, setShowSqlInstructions] = useState(false);

  const runQuickFix = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/fix-all-products`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('✅ Tüm ürün sorunları düzeltildi!', { duration: 5000 });
        setResult(data);
      } else {
        toast.error('❌ Hata: ' + (data.error || 'Bilinmeyen hata'));
        setResult({ error: data.error });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('❌ Bağlantı hatası');
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const copySQL = () => {
    const sql = `-- Constraint'leri sil
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_condition_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;

-- Verileri düzelt
UPDATE products SET condition = 'good' WHERE condition NOT IN ('good', 'lightly_used') OR condition IS NULL;
UPDATE products SET status = 'for_sale' WHERE status NOT IN ('for_sale', 'in_storage', 'sold') OR status IS NULL;

-- Yeni constraint'leri ekle
ALTER TABLE products ADD CONSTRAINT products_condition_check CHECK (condition IN ('good', 'lightly_used'));
ALTER TABLE products ADD CONSTRAINT products_status_check CHECK (status IN ('for_sale', 'in_storage', 'sold'));`;
    
    navigator.clipboard.writeText(sql);
    toast.success('✅ SQL kopyalandı! Supabase Dashboard\'a yapıştır.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1e3a8a] mb-2">
              🔧 Hızlı Düzeltme
            </h1>
            <p className="text-gray-600">
              Ürün durumlarını ve formatlarını otomatik düzelt
            </p>
          </div>

          {/* KIRMIZI UYARI: Constraint Sorunları */}
          <div className="bg-red-50 border-4 border-red-400 rounded-xl p-6 mb-6 shadow-lg">
            <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2 text-xl">
              <AlertCircle className="w-7 h-7 animate-pulse" />
              ⚠️ ÖNEMLİ: Constraint Hatası Alıyorsan!
            </h3>
            <p className="text-sm text-red-800 mb-4 leading-relaxed">
              Eğer ürünleri güncellerken <strong>"constraint violation"</strong> hatası alıyorsan,
              veritabanı constraint'leri eski değerleri bekliyor. <strong>Önce SQL'i çalıştırmalısın!</strong>
            </p>
            
            <div className="bg-white rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Database className="w-5 h-5 text-red-600" />
                Adımlar:
              </h4>
              <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                <li>Aşağıdaki "SQL Talimatlarını Göster" butonuna tıkla</li>
                <li>SQL'i kopyala</li>
                <li>Supabase Dashboard → SQL Editor'a git</li>
                <li>SQL'i yapıştır ve çalıştır</li>
                <li>Sonra "Tüm Sorunları Düzelt" butonunu kullan</li>
              </ol>
            </div>

            <Button
              onClick={() => setShowSqlInstructions(!showSqlInstructions)}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4"
            >
              <Database className="w-5 h-5 mr-2" />
              {showSqlInstructions ? '❌ Talimatları Gizle' : '📋 SQL Talimatlarını Göster (Zorunlu!)'}
            </Button>
          </div>

          {/* SQL TALİMATLARI */}
          {showSqlInstructions && (
            <div className="bg-gray-900 rounded-xl p-6 mb-6 shadow-2xl border-4 border-green-500">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-bold text-lg">📋 SQL Komutları</h4>
                  <a
                    href={`https://supabase.com/dashboard/project/${projectId}/sql/new`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    SQL Editor Aç
                  </a>
                </div>
                <Button
                  onClick={copySQL}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Kopyala
                </Button>
              </div>
              
              <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-green-400 font-mono text-xs leading-relaxed">
{`-- 🔧 ERSIN SPOT - CONSTRAINT DÜzeltmesi
-- Bu SQL'i Supabase Dashboard'da çalıştır!

-- 1️⃣ Eski constraint'leri sil
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_condition_check;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;

-- 2️⃣ Verileri temizle
UPDATE products 
SET condition = 'good' 
WHERE condition NOT IN ('good', 'lightly_used') 
   OR condition IS NULL;

UPDATE products 
SET status = 'for_sale' 
WHERE status NOT IN ('for_sale', 'in_storage', 'sold') 
   OR status IS NULL;

-- 3️⃣ Yeni constraint'leri ekle
ALTER TABLE products 
ADD CONSTRAINT products_condition_check 
CHECK (condition IN ('good', 'lightly_used'));

ALTER TABLE products 
ADD CONSTRAINT products_status_check 
CHECK (status IN ('for_sale', 'in_storage', 'sold'));

-- ✅ TAMAM! Artık backend düzeltmesi çalışacak.`}
              </pre>

              <div className="mt-4 bg-yellow-900/40 border-2 border-yellow-500 rounded-lg p-4">
                <p className="text-yellow-300 text-sm leading-relaxed">
                  <strong>💡 Nasıl Çalıştırılır?</strong><br/><br/>
                  <strong>1.</strong> "Kopyala" butonuna tıkla<br/>
                  <strong>2.</strong> <a href={`https://supabase.com/dashboard/project/${projectId}/sql/new`} target="_blank" rel="noopener noreferrer" className="underline text-blue-300">Supabase SQL Editor</a>'a git<br/>
                  <strong>3.</strong> SQL'i yapıştır (Ctrl+V / Cmd+V)<br/>
                  <strong>4.</strong> "Run" (Çalıştır) butonuna tıkla<br/>
                  <strong>5.</strong> Başarılı olunca aşağıdaki düzeltme butonunu kullan
                </p>
              </div>
            </div>
          )}

          {/* MAVİ BİLGİ: Backend Ne Yapar */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-5 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Backend Düzeltmesi Ne Yapar?
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                Türkçe değerleri İngilizce'ye çevirir: <code className="bg-blue-100 px-1 rounded">iyi → good</code>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                Format hatalarını düzeltir: <code className="bg-blue-100 px-1 rounded">like-new → good</code>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                Eski status'leri günceller: <code className="bg-blue-100 px-1 rounded">reserved → for_sale</code>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                "Sıfır Gibi" durumunu kaldırır
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                Verileri temizler (constraint'ler düzgünse çalışır)
              </li>
            </ul>
          </div>

          {/* DÜZELTME BUTONU */}
          <Button
            onClick={runQuickFix}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#f97316] to-[#ea580c] hover:from-[#ea580c] hover:to-[#c2410c] text-white py-8 text-xl font-bold shadow-xl"
          >
            {loading ? (
              <>
                <RefreshCw className="w-6 h-6 mr-3 animate-spin" />
                Düzeltiliyor...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6 mr-3" />
                Tüm Sorunları Düzelt (Backend)
              </>
            )}
          </Button>

          {/* SONUÇ KARTI */}
          {result && (
            <div className={`mt-6 border-4 rounded-xl p-6 shadow-lg ${
              result.error 
                ? 'bg-red-50 border-red-400' 
                : 'bg-green-50 border-green-400'
            }`}>
              <h3 className={`font-bold text-xl mb-4 flex items-center gap-2 ${
                result.error ? 'text-red-900' : 'text-green-900'
              }`}>
                {result.error ? (
                  <>
                    <AlertCircle className="w-6 h-6" />
                    ❌ Hata Oluştu
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    ✅ Başarılı!
                  </>
                )}
              </h3>
              
              {result.error ? (
                <div className="space-y-3">
                  <p className="text-sm text-red-800 bg-red-100 p-3 rounded font-mono">
                    {result.error}
                  </p>
                  <p className="text-sm text-red-900">
                    <strong>Çözüm:</strong> Yukarıdaki SQL talimatlarını takip et ve önce constraint'leri düzelt!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-green-900 text-2xl font-bold">
                    ✅ {result.fixed || 0} ürün düzeltildi!
                  </p>
                  
                  {result.summary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Status Özeti */}
                      {result.summary.status && (
                        <div className="bg-white p-4 rounded-lg border-2 border-green-300 shadow">
                          <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            📊 Satış Durumları
                          </p>
                          <div className="space-y-2">
                            {Object.entries(result.summary.status).map(([status, count]: [string, any]) => (
                              <div key={status} className="flex justify-between items-center">
                                <span className="text-gray-700 capitalize">{status}:</span>
                                <strong className="text-green-700 text-lg">{count}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Condition Özeti */}
                      {result.summary.condition && (
                        <div className="bg-white p-4 rounded-lg border-2 border-green-300 shadow">
                          <p className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                            🎨 Ürün Durumları
                          </p>
                          <div className="space-y-2">
                            {Object.entries(result.summary.condition).map(([condition, count]: [string, any]) => (
                              <div key={condition} className="flex justify-between items-center">
                                <span className="text-gray-700 capitalize">{condition}:</span>
                                <strong className="text-green-700 text-lg">{count}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SONRAKİ ADIMLAR */}
          <div className="mt-8 p-5 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
            <h4 className="font-bold text-purple-900 mb-3 text-lg">🎉 Sonraki Adımlar:</h4>
            <ol className="text-sm text-purple-800 space-y-2 list-decimal list-inside">
              <li>Admin paneline git</li>
              <li>Ürün durumlarını istediğin gibi düzenle</li>
              <li>Artık hiçbir constraint hatası almayacaksın! 🎉</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}
