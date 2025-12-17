import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Shield, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react@0.487.0';
import { useNavigate } from 'react-router-dom';

interface AdminQuickStartProps {
  adminCount: number;
  onRefresh?: () => void;
}

export function AdminQuickStart({ adminCount, onRefresh }: AdminQuickStartProps) {
  const navigate = useNavigate();

  if (adminCount > 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <CardTitle className="text-green-900">Sistem Hazır!</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            {adminCount} admin hesabı bulundu. Admin paneline giriş yapabilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={() => navigate('/admin/giris')}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Admin Girişi Yap
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <CardTitle className="text-orange-900">Admin Hesabı Gerekli</CardTitle>
        </div>
        <CardDescription className="text-orange-700">
          Henüz admin hesabı oluşturulmamış. Admin paneline erişmek için önce bir admin hesabı oluşturmalısınız.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-white border border-orange-200 rounded-lg p-4">
          <h4 className="font-semibold text-sm text-orange-900 mb-2">🚀 Hızlı Başlangıç:</h4>
          <ol className="space-y-2 text-sm text-orange-800">
            <li className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>Aşağıdaki "Admin Hesabı Oluştur" butonuna tıklayın</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>Email, isim ve şifre bilgilerinizi girin</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>O email ve şifre ile admin paneline giriş yapın</span>
            </li>
          </ol>
        </div>

        <Button
          onClick={() => navigate('/admin/setup')}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          <Shield className="w-4 h-4 mr-2" />
          Admin Hesabı Oluştur
        </Button>

        {onRefresh && (
          <Button
            onClick={onRefresh}
            variant="outline"
            className="w-full"
          >
            Yenile
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
