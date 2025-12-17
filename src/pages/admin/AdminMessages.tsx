import { useState, useEffect } from 'react';
import { Mail, MailOpen, Trash2, Eye, Phone, Calendar, CheckCircle } from 'lucide-react@0.487.0';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  AdminDialog as Dialog,
  AdminDialogContent as DialogContent,
  AdminDialogDescription as DialogDescription,
  AdminDialogHeader as DialogHeader,
  AdminDialogTitle as DialogTitle,
  AdminDialogFooter as DialogFooter,
} from '../../components/ui/admin-dialog';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminMessages() {
  const { accessToken } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<any>(null);

  useEffect(() => {
    if (accessToken) {
      loadMessages();
    }
  }, [accessToken]);

  const loadMessages = async () => {
    if (!accessToken) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/contact-messages`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      } else {
        toast.error('Mesajlar yüklenemedi');
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Mesajlar yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMessage = async (message: any) => {
    setSelectedMessage(message);
    setIsDetailModalOpen(true);

    // Eğer okunmamışsa, okundu olarak işaretle
    if (message.status === 'unread') {
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/contact-messages/${message.id}/read`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          // Local state güncelle
          setMessages(messages.map(m => 
            m.id === message.id ? { ...m, status: 'read', read_at: new Date().toISOString() } : m
          ));
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;

    const toastId = toast.loading('Mesaj siliniyor...');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485/admin/contact-messages/${messageToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      toast.dismiss(toastId);

      if (response.ok) {
        setMessages(messages.filter(m => m.id !== messageToDelete.id));
        toast.success('Mesaj silindi');
        setIsDeleteModalOpen(false);
        setMessageToDelete(null);
      } else {
        toast.error('Mesaj silinemedi');
      }
    } catch (error) {
      toast.dismiss(toastId);
      console.error('Error deleting message:', error);
      toast.error('Mesaj silinirken bir hata oluştu');
    }
  };

  const unreadCount = messages.filter(m => m.status === 'unread').length;

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl mb-2">İletişim Mesajları</h1>
          <p className="text-gray-600">
            Müşterilerden gelen mesajları görüntüleyin ve yönetin
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Card className="bg-gradient-to-br from-[#1e3a8a] to-[#1e3a8a]/80 text-white border-[#1e3a8a]">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Mail className="w-7 h-7 opacity-80 flex-shrink-0" />
                <div>
                  <p className="text-xs text-white/80 uppercase tracking-wide whitespace-nowrap">Toplam Mesaj</p>
                  <p className="text-xl font-bold">{messages.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-white border-orange-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Mail className="w-7 h-7 text-[#f97316] flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Okunmamış</p>
                  <p className="text-xl font-bold text-[#f97316]">{unreadCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-white border-green-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide whitespace-nowrap">Okunmuş</p>
                  <p className="text-xl font-bold text-green-600">{messages.length - unreadCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Messages List */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Yükleniyor...
            </CardContent>
          </Card>
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Henüz mesaj yok
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <Card 
                key={message.id}
                className={`transition-all hover:shadow-lg ${message.status === 'unread' ? 'bg-blue-50/50 border-blue-200' : ''}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${message.status === 'unread' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      {message.status === 'unread' ? (
                        <Mail className="w-6 h-6 text-blue-600" />
                      ) : (
                        <MailOpen className="w-6 h-6 text-gray-600" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{message.name}</h3>
                            {message.status === 'unread' && (
                              <Badge className="bg-blue-100 text-blue-700 border-0">Yeni</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Konu:</strong> {message.subject}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewMessage(message)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Görüntüle
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setMessageToDelete(message);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                        {message.message}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {message.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {message.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(message.created_at).toLocaleString('tr-TR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Mesaj Detayı</DialogTitle>
              <DialogDescription>
                Müşteri mesajının tüm detaylarını görüntüleyin
              </DialogDescription>
            </DialogHeader>
            {selectedMessage && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Gönderen</p>
                  <p className="font-semibold">{selectedMessage.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">E-posta</p>
                    <p className="text-sm">{selectedMessage.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Telefon</p>
                    <p className="text-sm">{selectedMessage.phone}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Konu</p>
                  <p className="font-semibold">{selectedMessage.subject}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Mesaj</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.message}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Gönderilme: {new Date(selectedMessage.created_at).toLocaleString('tr-TR')}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                Kapat
              </Button>
              <a href={`mailto:${selectedMessage?.email}`}>
                <Button className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90">
                  <Mail className="w-4 h-4 mr-2" />
                  E-posta Gönder
                </Button>
              </a>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mesajı Sil</DialogTitle>
              <DialogDescription>
                Bu mesajı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                İptal
              </Button>
              <Button variant="destructive" onClick={handleDeleteMessage}>
                Sil
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
