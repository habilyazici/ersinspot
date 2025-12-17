import { AlertCircle, UserPlus, LogIn, CheckCircle2 } from 'lucide-react@0.487.0';
import { Card, CardContent } from './ui/card';

interface AuthDebugInfoProps {
  type: 'login-error' | 'register-success' | 'info';
  message?: string;
}

export default function AuthDebugInfo({ type, message }: AuthDebugInfoProps) {
  if (type === 'login-error') {
    return (
      <Card className="border-orange-200 bg-orange-50 mt-4">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-orange-900 mb-1">
                Giriş Yapamadınız mı?
              </h4>
              <p className="text-sm text-orange-800 mb-3">
                {message || 'E-posta veya şifreniz hatalı olabilir. Henüz hesabınız yoksa lütfen kayıt olun.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <UserPlus className="w-4 h-4" />
                  <span><strong>Kayıt Ol</strong> sekmesine geçin</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-orange-700">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Bilgilerinizi doldurun</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === 'register-success') {
    return (
      <Card className="border-green-200 bg-green-50 mt-4">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">
                Kayıt Başarılı! 🎉
              </h4>
              <p className="text-sm text-green-800">
                {message || 'Hesabınız oluşturuldu ve otomatik giriş yaptınız. Yönlendiriliyorsunuz...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50 mt-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1">
              💡 Bilgi
            </h4>
            <p className="text-sm text-blue-800">
              {message || 'İlk kez mi ziyaret ediyorsunuz? Kayıt olarak tüm özelliklerden yararlanabilirsiniz!'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
