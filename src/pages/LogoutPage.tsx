import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';

export default function LogoutPage() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const hasLoggedOut = useRef(false);

  useEffect(() => {
    // Prevent double execution in React StrictMode
    if (hasLoggedOut.current) return;
    hasLoggedOut.current = true;

    const handleLogout = async () => {
      await signOut();
      
      // Show single success toast with proper styling
      toast.success('Çıkış Başarılı', {
        description: 'Güvenli bir şekilde çıkış yaptınız.',
        duration: 2000,
      });
      
      // Redirect to home page immediately
      navigate('/', { replace: true });
    };

    handleLogout();
  }, [navigate, signOut]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#1e3a8a] via-[#1e3a8a] to-[#f97316]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white">Çıkış yapılıyor...</p>
      </div>
    </div>
  );
}