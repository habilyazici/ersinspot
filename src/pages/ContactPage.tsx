import { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send } from 'lucide-react@0.487.0';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.email || !formData.phone || !formData.subject || !formData.message) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/contact-messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || 'Mesajınız başarıyla gönderildi! ✅');
        setSubmitted(true);
        
        // Form reset
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: '',
        });
        
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Mesaj gönderilemedi');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Mesaj gönderilirken bir hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: Phone,
      title: 'Telefon',
      details: ['0 507 194 05 50'],
      action: 'tel:+905071940550',
      gradient: 'from-[#f97316] to-[#fb923c]', // Turuncu
    },
    {
      icon: Mail,
      title: 'E-posta',
      details: ['ersin1235@gmail.com'],
      action: 'mailto:ersin1235@gmail.com',
      gradient: 'from-[#1e3a8a] to-[#3b82f6]', // Mavi
    },
    {
      icon: MapPin,
      title: 'Adres',
      details: ['Menderes Mah., No:21A', 'Buca/İzmir'],
      action: 'https://www.google.com/maps?q=38.3886,27.1770',
      gradient: 'from-[#7FA99B] to-[#10b981]', // Teal/Yeşil
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F1EDE3] via-white to-[#F1EDE3] pt-20">
      {/* Contact Info Cards */}
      <section className="py-12 container mx-auto px-4 bg-gradient-to-br from-blue-50/40 via-white to-teal-50/40 rounded-3xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {contactInfo.map((info, index) => (
            <div key={index} className="block group">
              <Card className="hover:shadow-2xl transition-all duration-300 border-0 shadow-lg h-full overflow-hidden relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${info.gradient} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                <CardContent className="p-8 text-center relative z-10 flex flex-col items-center h-full">
                  <div className={`w-16 h-16 bg-gradient-to-br ${info.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <info.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="mb-3 text-lg text-gray-800">{info.title}</h3>
                  <div className="flex-1 flex flex-col justify-center">
                    {info.details.map((detail, idx) => (
                      <p 
                        key={idx} 
                        className={`mb-1 font-semibold transition-colors ${
                          info.title === 'Telefon' 
                            ? 'text-[#f97316] text-base tracking-wide' 
                            : info.title === 'E-posta'
                            ? 'text-[#1e3a8a] text-sm break-all'
                            : 'text-gray-700 text-sm'
                        }`}
                      >
                        {detail}
                      </p>
                    ))}
                  </div>
                  {/* BUTON - KARTIN EN ALTINDA, MT-AUTO İLE SABİTLENDİ */}
                  <a 
                    href={info.action}
                    className={`inline-flex items-center gap-2 mt-auto px-5 py-3 rounded-xl font-medium text-sm transition-all transform hover:scale-105 hover:shadow-xl shadow-lg ${
                      info.title === 'Telefon'
                        ? 'bg-gradient-to-r from-[#f97316] to-[#fb923c] text-white hover:from-[#ea580c] hover:to-[#f97316]'
                        : info.title === 'E-posta'
                        ? 'bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white hover:from-[#1e40af] hover:to-[#1e3a8a]'
                        : 'bg-gradient-to-r from-[#7FA99B] to-[#10b981] text-white hover:from-[#6B9088] hover:to-[#7FA99B]'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {info.title === 'Telefon' && (
                      <>
                        <Phone className="w-4 h-4" />
                        Hemen Ara
                      </>
                    )}
                    {info.title === 'E-posta' && (
                      <>
                        <Mail className="w-4 h-4" />
                        Mail Gönder
                      </>
                    )}
                    {info.title === 'Adres' && (
                      <>
                        <MapPin className="w-4 h-4" />
                        Yol Tarifi Al
                      </>
                    )}
                  </a>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Form & Map */}
      <section className="py-16 container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card className="bg-gradient-to-br from-white via-orange-50/30 to-blue-50/40 border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-[#1e3a8a] to-[#f97316] bg-clip-text text-transparent">Bize Mesaj Gönderin</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted && (
                <Alert className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                  <AlertDescription className="text-green-800">
                    Mesajınız başarıyla gönderildi! En kısa sürede size geri dönüş yapacağız.
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="name" className="mb-2 block">Ad Soyad *</Label>
                    <Input
                      id="name"
                      placeholder="Ad Soyad"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="mb-2 block">Telefon *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="05XX XXX XX XX"
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 11) {
                          setFormData({ ...formData, phone: value });
                        }
                      }}
                      pattern="[0-9]{10,11}"
                      title="Geçerli bir telefon numarası giriniz (10-11 hane, sadece rakam)"
                      maxLength={11}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="mb-2 block">E-posta *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                    title="Geçerli bir e-posta adresi giriniz (örn: kullanici@ornek.com)"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="subject" className="mb-2 block">Konu *</Label>
                  <Input
                    id="subject"
                    placeholder="Mesajınızın konusunu yazın"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="message" className="mb-2 block">Mesajınız *</Label>
                  <Textarea
                    id="message"
                    placeholder="Mesajınızı buraya yazın..."
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-[#1e3a8a] to-[#f97316] hover:opacity-90 transition-opacity" size="lg">
                  <Send className="w-5 h-5 mr-2" />
                  {isSubmitting ? 'Gönderiliyor...' : 'Mesaj Gönder'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Map & Additional Info */}
          <div className="space-y-6 flex flex-col h-full">
            {/* Map */}
            <Card className="bg-gradient-to-br from-[#f97316]/10 via-white to-[#7FA99B]/10 border-0 shadow-xl flex-1 overflow-hidden">
              <CardContent className="p-0 h-full">
                <div className="w-full h-[500px] bg-gradient-to-br from-[#1e3a8a]/5 to-[#f97316]/5 rounded-lg overflow-hidden shadow-inner">
                  <iframe
                    title="Ersin Spot Konum - Menderes Mah., No:21A, Buca/İzmir"
                    src="https://maps.google.com/maps?q=38.3886,27.1770&hl=tr&z=17&output=embed&markers=color:red%7Clabel:E%7C38.3886,27.1770"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                {/* Google Maps'te Aç Butonu */}
                <div className="p-4 bg-white">
                  <a
                    href="https://www.google.com/maps?q=38.3886,27.1770"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7FA99B] to-[#10b981] text-white rounded-xl font-medium hover:shadow-lg transition-all transform hover:scale-105"
                  >
                    <MapPin className="w-5 h-5" />
                    Google Maps'te Aç
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Working Hours Section - From About Page */}
      <section className="py-16 container mx-auto px-4">
        <Card className="max-w-2xl mx-auto bg-gradient-to-br from-white via-orange-50/30 to-blue-50/30 border-0 shadow-xl">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-[#1e3a8a] to-[#f97316] rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <h2>Çalışma Saatlerimiz</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-gray-700">Pazartesi - Cuma</span>
                <span className="text-[#1e3a8a]">09:00 - 19:00</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-gray-700">Cumartesi - Pazar</span>
                <span className="text-red-600">Kapalı</span>
              </div>
              <div className="bg-gradient-to-r from-orange-100 to-orange-50 p-4 rounded-lg mt-4">
                <p className="text-sm text-gray-700">
                  <strong>Not:</strong> Acil randevular için ek ücret talep edilir.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
