import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, ArrowLeft, Camera, Check, X, Lock, Eye, EyeOff, Shield, Cake, MapPinned, Building2, Upload, Trash2, AlertTriangle } from 'lucide-react@0.487.0';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { projectId } from '../utils/supabase/info';

export default function MyProfilePage() {
  const { user, accessToken } = useAuth();
  const { favorites } = useFavorites();
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDeleteAccountDialogOpen, setIsDeleteAccountDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    neighborhood: '', // Mahalle
    street: '',      // Sokak/Cadde
    buildingNo: '',  // Bina No
    apartmentNo: '', // Daire No
    district: '',    // İlçe
    age: '',
    city: 'İzmir',
    memberSince: '',
    profile_photo_url: null as string | null,
  });

  // Backend'den profil bilgilerini yükle
  useEffect(() => {
    const loadProfile = async () => {
      if (!user || !accessToken) {
        setLoading(false);
        return;
      }

      try {
        // Profil bilgilerini yükle
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/customers/me`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setProfileData({
            name: data.customer.name || '',
            email: data.customer.email || user.email || '',
            phone: data.customer.phone || '',
            neighborhood: data.customer.neighborhood || '',
            street: data.customer.street || '',
            buildingNo: data.customer.building_no || '',  // snake_case → camelCase
            apartmentNo: data.customer.apartment_no || '', // snake_case → camelCase
            district: data.customer.district || '',
            age: data.customer.age ? data.customer.age.toString() : '',
            city: data.customer.city || 'İzmir',
            memberSince: data.customer.created_at 
              ? new Date(data.customer.created_at).toLocaleDateString('tr-TR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })
              : '',
            profile_photo_url: data.customer.profile_photo_url || null,
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Profil bilgileri yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, accessToken]);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editedValue, setEditedValue] = useState('');
  const [originalValue, setOriginalValue] = useState('');

  // Şifre değiştirme state'leri
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Şifre gücü hesaplama
  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 1, label: 'Zayıf', color: 'bg-red-500' };
    if (strength <= 4) return { strength: 2, label: 'Orta', color: 'bg-yellow-500' };
    return { strength: 3, label: 'Güçlü', color: 'bg-green-500' };
  };

  // Şifre değiştirme
  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    // Boş alan kontrolü
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Lütfen tüm alanları doldurun!');
      return;
    }

    // Yeni şifre uzunluk kontrolü
    if (newPassword.length < 8) {
      toast.error('Yeni şifre en az 8 karakter olmalıdır!');
      return;
    }

    // Şifre güçlülük kontrolü
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      toast.error('Şifre en az 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir!');
      return;
    }

    // Şifre eşleşme kontrolü
    if (newPassword !== confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor!');
      return;
    }

    // Eski şifre ile aynı olmamalı
    if (currentPassword === newPassword) {
      toast.error('Yeni şifre eski şifrenizden farklı olmalıdır!');
      return;
    }

    // Backend'e şifre değiştirme isteği gönder
    if (!accessToken) {
      toast.error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    try {
      setIsChangingPassword(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/auth/change-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Şifre değiştirme başarısız oldu!');
        setIsChangingPassword(false);
        return;
      }

      // Başarılı - Şifre değiştirildi
      toast.success('Şifreniz başarıyla değiştirildi!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsChangingPassword(false);
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
      setIsChangingPassword(false);
    }
  };

  const cancelPasswordChange = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setIsChangingPassword(false);
  };

  // Hesap silme fonksiyonu
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleDeleteAccount = async () => {
    // Onay metni kontrolü
    if (deleteConfirmText.toLowerCase() !== 'hesabımı sil') {
      toast.error('Lütfen onay metnini doğru yazın');
      return;
    }

    if (!accessToken) {
      toast.error('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    try {
      setIsDeletingAccount(true);
      console.log('🗑️ Deleting account...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/customers/me`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error deleting account:', errorData);
        throw new Error(errorData.error || 'Hesap silinirken bir hata oluştu');
      }

      const data = await response.json();
      console.log('✅ Account deleted:', data);

      toast.success('Hesabınız ve tüm verileriniz başarıyla silindi');
      
      // Logout ve ana sayfaya yönlendir
      setTimeout(async () => {
        await signOut();
        navigate('/');
      }, 1500);

    } catch (error: any) {
      console.error('Error in delete account:', error);
      toast.error(error.message || 'Hesap silinirken bir hata oluştu');
      setIsDeletingAccount(false);
    }
  };

  const startEditing = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditedValue(currentValue);
    setOriginalValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditedValue('');
    setOriginalValue('');
  };

  const saveEditing = async () => {
    if (!editingField) return;
    
    // Boş değer kontrolü
    if (!editedValue.trim()) {
      toast.error('Bu alan boş bırakılamaz!');
      return;
    }

    // Email validasyonu
    if (editingField === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editedValue)) {
        toast.error('Geçerli bir e-posta adresi girin!');
        return;
      }
    }

    // Telefon validasyonu
    if (editingField === 'phone') {
      const phoneRegex = /^[0-9\s()+-]+$/;
      if (!phoneRegex.test(editedValue)) {
        toast.error('Geçerli bir telefon numarası girin!');
        return;
      }
    }

    // Backend'e güncelleme isteği gönder
    if (!accessToken) {
      toast.error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
      return;
    }

    try {
      // Frontend camelCase → Backend snake_case mapping
      const fieldMapping: { [key: string]: string } = {
        'buildingNo': 'building_no',
        'apartmentNo': 'apartment_no',
      };
      
      const backendField = fieldMapping[editingField] || editingField;
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/customers/me`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            [backendField]: editedValue,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Güncelleme başarısız');
      }

      // Başarılı - Local state'i güncelle
      setProfileData({
        ...profileData,
        [editingField]: editedValue
      });

      const fieldLabels: { [key: string]: string } = {
        name: 'Ad Soyad',
        email: 'E-posta',
        phone: 'Telefon',
        neighborhood: 'Mahalle',
        street: 'Sokak/Cadde',
        buildingNo: 'Bina No',
        apartmentNo: 'Daire No',
        district: 'İlçe',
        age: 'Yaş',
        city: 'Şehir',
      };

      toast.success(`${fieldLabels[editingField]} başarıyla güncellendi!`);
      setEditingField(null);
      setEditedValue('');
      setOriginalValue('');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Güncelleme başarısız oldu. Lütfen tekrar deneyin.');
    }
  };

  // Profil fotoğrafı yükleme
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya tipi kontrolü
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Sadece JPEG, PNG ve WebP formatları destekleniyor!');
      return;
    }

    // Dosya boyutu kontrolü (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Dosya boyutu 2MB\'dan küçük olmalıdır!');
      return;
    }

    if (!accessToken) {
      toast.error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
      return;
    }

    try {
      setUploadingPhoto(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/customers/me/profile-photo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fotoğraf yüklenemedi');
      }

      // State'i güncelle
      setProfileData({
        ...profileData,
        profile_photo_url: data.profile_photo_url,
      });

      toast.success('Profil fotoğrafınız başarıyla güncellendi!');
    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast.error(error.message || 'Fotoğraf yüklenirken bir hata oluştu');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Profil fotoğrafını sil
  const handlePhotoDelete = async () => {
    if (!accessToken) {
      toast.error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
      return;
    }

    try {
      setUploadingPhoto(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/customers/me/profile-photo`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fotoğraf silinemedi');
      }

      // State'i güncelle
      setProfileData({
        ...profileData,
        profile_photo_url: null,
      });

      toast.success('Profil fotoğrafınız başarıyla silindi!');
    } catch (error: any) {
      console.error('Photo delete error:', error);
      toast.error(error.message || 'Fotoğraf silinirken bir hata oluştu');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Editable field component
  const EditableField = ({ 
    field, 
    value, 
    label, 
    icon: Icon, 
    editable = true,
    multiline = false 
  }: { 
    field: string; 
    value: string; 
    label: string; 
    icon: any; 
    editable?: boolean;
    multiline?: boolean;
  }) => {
    const isEditing = editingField === field;

    return (
      <div 
        className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-all ${
          editable 
            ? 'bg-gray-50 hover:bg-gray-100 cursor-pointer hover:ring-2 hover:ring-[var(--brand-orange-300)]' 
            : 'bg-gray-50'
        } ${isEditing ? 'ring-2 ring-[var(--brand-orange-500)] bg-orange-50' : ''}`}
        onDoubleClick={() => editable && startEditing(field, value)}
        title={editable ? 'Düzenlemek için çift tıklayın' : ''}
      >
        <div className="w-8 h-8 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[var(--brand-orange-600)]" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-500 mb-0.5">{label}</p>
          {isEditing ? (
            <div className="space-y-2">
              {multiline ? (
                <textarea
                  value={editedValue}
                  onChange={(e) => setEditedValue(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border-2 border-[var(--brand-orange-400)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange-500)] text-gray-800 font-medium"
                  rows={3}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancelEditing();
                  }}
                />
              ) : (
                <input
                  type={field === 'email' ? 'email' : 'text'}
                  value={editedValue}
                  onChange={(e) => setEditedValue(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border-2 border-[var(--brand-orange-400)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange-500)] text-gray-800 font-medium"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEditing();
                    if (e.key === 'Escape') cancelEditing();
                  }}
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={saveEditing}
                  className="flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  Kaydet
                </button>
                <button
                  onClick={cancelEditing}
                  className="flex items-center gap-1 px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                  İptal
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm font-medium text-gray-800">{value}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-b from-gray-50/40 via-white to-gray-50/40 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-[var(--brand-orange-600)]/30 via-[var(--brand-orange-500)]/30 to-[var(--brand-coral-500)]/30 text-white py-6 pt-24">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Link to="/hesabim">
              <Button variant="ghost" className="text-white hover:bg-white/20 mb-3" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Hesabıma Dön
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="relative group">
                {/* Profil Fotoğrafı */}
                {profileData.profile_photo_url ? (
                  <img 
                    src={profileData.profile_photo_url} 
                    alt="Profil" 
                    className="w-20 h-20 rounded-full object-cover shadow-2xl border-4 border-white"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-white to-gray-100 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                    <User className="w-10 h-10 text-[var(--brand-orange-600)]" />
                  </div>
                )}
                
                {/* Fotoğraf Yükleme Butonu */}
                <label 
                  htmlFor="profile-photo-upload" 
                  className="absolute -bottom-1 -right-1 w-9 h-9 bg-[var(--brand-orange-600)] rounded-full flex items-center justify-center shadow-lg hover:bg-[var(--brand-orange-700)] transition-all cursor-pointer border-3 border-white group-hover:scale-110"
                >
                  {uploadingPhoto ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </label>
                <input
                  id="profile-photo-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
                
                {/* Fotoğraf Silme Butonu */}
                {profileData.profile_photo_url && !uploadingPhoto && (
                  <button
                    onClick={handlePhotoDelete}
                    className="absolute -top-1 -right-1 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:bg-red-700 transition-all border-2 border-white opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
              </div>
              <div>
                <h1 className="text-xl mb-0.5 drop-shadow-lg font-bold">Profilim</h1>
                <p className="text-white/90 text-xs font-medium drop-shadow">
                  Profil fotoğrafınızı ve bilgilerinizi güncelleyin
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-5">
          {loading ? (
            /* Loading State */
            <div className="space-y-5">
              <Card className="shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-[var(--brand-orange-50)] to-white border-b py-4">
                  <CardTitle className="flex items-center gap-2.5 text-[var(--brand-orange-700)] text-lg">
                    <User className="w-5 h-5" />
                    Kişisel Bilgilerim
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-orange-600)] mb-4"></div>
                    <p className="text-gray-600 text-sm">Profiliniz yükleniyor...</p>
                    <p className="text-gray-400 text-xs mt-1">Veritabanından bilgileriniz alınıyor</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {/* Profil Bilgileri Card */}
              <Card className="shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-[var(--brand-orange-50)] to-white border-b py-4">
                  <CardTitle className="flex items-center gap-2.5 text-[var(--brand-orange-700)] text-lg">
                    <User className="w-5 h-5" />
                    Kişisel Bilgilerim
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  {/* 📝 KİŞİSEL BİLGİLER BÖLÜMÜ */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-4 h-4 text-[var(--brand-orange-600)]" />
                      <h3 className="text-sm font-semibold text-gray-700">Kişisel Bilgiler</h3>
                      <div className="flex-1 h-px bg-gradient-to-r from-[var(--brand-orange-200)] to-transparent"></div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <EditableField
                        field="name"
                        value={profileData.name}
                        label="Ad Soyad"
                        icon={User}
                      />

                      <EditableField
                        field="email"
                        value={profileData.email}
                        label="E-posta"
                        icon={Mail}
                      />

                      <EditableField
                        field="phone"
                        value={profileData.phone}
                        label="Telefon"
                        icon={Phone}
                      />

                      <EditableField
                        field="age"
                        value={profileData.age || 'Belirtilmemiş'}
                        label="Yaş"
                        icon={Cake}
                      />

                      <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="w-8 h-8 bg-[var(--brand-orange-100)] rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4 h-4 text-[var(--brand-orange-600)]" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Üyelik Tarihi</p>
                          <p className="text-sm font-medium text-gray-800">{profileData.memberSince}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 📍 ADRES BİLGİLERİ BÖLÜMÜ */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-4 h-4 text-[var(--brand-teal-600)]" />
                      <h3 className="text-sm font-semibold text-gray-700">Adres Bilgileri</h3>
                      <div className="flex-1 h-px bg-gradient-to-r from-[var(--brand-teal-200)] to-transparent"></div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <EditableField
                        field="city"
                        value={profileData.city || 'İzmir'}
                        label="Şehir"
                        icon={Building2}
                      />

                      <EditableField
                        field="district"
                        value={profileData.district || 'Belirtilmemiş'}
                        label="İlçe"
                        icon={MapPinned}
                      />

                      <div className="md:col-span-2">
                        <EditableField
                          field="neighborhood"
                          value={profileData.neighborhood || 'Mahalle giriniz'}
                          label="Mahalle"
                          icon={MapPin}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <EditableField
                          field="street"
                          value={profileData.street || 'Sokak/Cadde giriniz'}
                          label="Sokak/Cadde"
                          icon={MapPin}
                        />
                      </div>

                      <EditableField
                        field="buildingNo"
                        value={profileData.buildingNo || 'Belirtilmemiş'}
                        label="Bina No"
                        icon={Building2}
                      />

                      <EditableField
                        field="apartmentNo"
                        value={profileData.apartmentNo || 'Belirtilmemiş'}
                        label="Daire No"
                        icon={Building2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Güvenlik ve Şifre Card */}
              <Card className="shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-red-50 to-white border-b py-4">
                  <CardTitle className="flex items-center gap-2.5 text-red-700 text-lg">
                    <Lock className="w-5 h-5" />
                    Güvenlik Ayarları
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  {!isChangingPassword ? (
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">Şifre</p>
                          <p className="text-xs text-gray-500">Son değiştirilme: 3 ay önce</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => setIsChangingPassword(true)}
                        className="bg-[var(--brand-orange-600)] hover:bg-[var(--brand-orange-700)] text-sm"
                        size="sm"
                      >
                        Şifre Değiştir
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                          <strong>💡 Güçlü Şifre Önerileri:</strong>
                        </p>
                        <ul className="text-xs text-blue-700 mt-1.5 space-y-0.5 ml-4 list-disc">
                          <li>En az 8 karakter uzunluğunda olmalı</li>
                          <li>Büyük ve küçük harf içermeli</li>
                          <li>En az 1 rakam içermeli</li>
                          <li>Özel karakter kullanılması önerilir (!@#$%)</li>
                        </ul>
                      </div>

                      {/* Mevcut Şifre */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Mevcut Şifre <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.current ? 'text' : 'password'}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange-500)] focus:border-[var(--brand-orange-500)] pr-9"
                            placeholder="Mevcut şifrenizi girin"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Demo için şifre: 123456</p>
                      </div>

                      {/* Yeni Şifre */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Yeni Şifre <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.new ? 'text' : 'password'}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange-500)] focus:border-[var(--brand-orange-500)] pr-9"
                            placeholder="Yeni şifrenizi girin"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        {/* Şifre Gücü Göstergesi */}
                        {passwordData.newPassword && (
                          <div className="mt-1.5">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-gray-600">Şifre Gücü:</span>
                              <span className={`text-[10px] font-medium ${
                                getPasswordStrength(passwordData.newPassword).strength === 1 ? 'text-red-600' :
                                getPasswordStrength(passwordData.newPassword).strength === 2 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {getPasswordStrength(passwordData.newPassword).label}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3].map((level) => (
                                <div
                                  key={level}
                                  className={`h-1.5 flex-1 rounded-full transition-all ${
                                    level <= getPasswordStrength(passwordData.newPassword).strength
                                      ? getPasswordStrength(passwordData.newPassword).color
                                      : 'bg-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Yeni Şifre Tekrar */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Yeni Şifre (Tekrar) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.confirm ? 'text' : 'password'}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-orange-500)] focus:border-[var(--brand-orange-500)] pr-9"
                            placeholder="Yeni şifrenizi tekrar girin"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                          <p className="text-[10px] text-red-600 mt-1 flex items-center gap-0.5">
                            <X className="w-3 h-3" />
                            Şifreler eşleşmiyor
                          </p>
                        )}
                        {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                          <p className="text-[10px] text-green-600 mt-1 flex items-center gap-0.5">
                            <Check className="w-3 h-3" />
                            Şifreler eşleşiyor
                          </p>
                        )}
                      </div>

                      {/* Butonlar */}
                      <div className="flex flex-col gap-2.5 pt-1">
                        <Button
                          onClick={handleChangePassword}
                          className="w-full bg-green-600 hover:bg-green-700"
                          size="default"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Şifreyi Değiştir
                        </Button>
                        <Button
                          onClick={cancelPasswordChange}
                          variant="outline"
                          className="w-full border-red-300 text-red-600 hover:bg-red-50"
                          size="default"
                        >
                          <X className="w-4 h-4 mr-2" />
                          İptal
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hesap Silme Card */}
              <Card className="shadow-xl border-2 border-red-200 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-red-100 to-red-50 border-b border-red-200 py-4">
                  <CardTitle className="flex items-center gap-2.5 text-red-700 text-lg">
                    <Trash2 className="w-5 h-5" />
                    Hesabı Sil
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-800 mb-2">Dikkat: Bu İşlem Geri Alınamaz!</p>
                        <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                          <li>Hesabınız kalıcı olarak silinecektir</li>
                          <li>Tüm siparişleriniz silinecektir</li>
                          <li>Ürün satış talepleriniz silinecektir</li>
                          <li>Teknik servis ve nakliye randevularınız iptal edilecektir</li>
                          <li>Sepet ve favori listeniz silinecektir</li>
                          <li>Bu işlem sonrası hesabınıza erişemezsiniz</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-gray-700">
                      Hizmetlerimizden ayrılmak istediğiniz için üzgünüz. Hesabınızı silmek için aşağıdaki butona tıklayın.
                    </p>
                    
                    <Button
                      onClick={() => setIsDeleteAccountDialogOpen(true)}
                      variant="destructive"
                      className="w-full bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Hesabımı Sil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Hesap Silme Onay Dialog */}
      <Dialog open={isDeleteAccountDialogOpen} onOpenChange={setIsDeleteAccountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              Hesabınızı Silmek İstediğinizden Emin Misiniz?
            </DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz ve tüm verileriniz kalıcı olarak silinecektir.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 space-y-2">
              <p className="font-semibold text-red-800 text-sm">⚠️ Silinecek Veriler:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-red-700 ml-2">
                <li>Profil bilgileriniz</li>
                <li>Tüm siparişleriniz ({favorites.length} ürün favorilerde)</li>
                <li>Ürün satış talepleriniz</li>
                <li>Randevu ve servis kayıtlarınız</li>
                <li>Sepet ve favori listeleriniz</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-medium">
                Devam etmek için lütfen <span className="font-bold text-red-600">"hesabımı sil"</span> yazın:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="hesabımı sil"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                disabled={isDeletingAccount}
              />
              <p className="text-xs text-gray-500">
                * Küçük/büyük harf duyarlı değildir
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteAccountDialogOpen(false);
                setDeleteConfirmText('');
              }}
              disabled={isDeletingAccount}
            >
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount || deleteConfirmText.toLowerCase() !== 'hesabımı sil'}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingAccount ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Siliniyor...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Evet, Hesabımı Sil
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}