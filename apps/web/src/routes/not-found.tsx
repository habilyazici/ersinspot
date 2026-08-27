import { Link } from 'react-router-dom';
import { Home, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';
import { PageContainer } from '@/components/ui/page.tsx';

export default function NotFoundPage() {
  return (
    <PageContainer width="prose">
      <EmptyState
        icon={SearchX}
        // Sayfanın tek içeriği; başlık h1 olmalı.
        headingLevel={1}
        title="Sayfa bulunamadı"
        description="Aradığınız sayfa taşınmış veya kaldırılmış olabilir."
        action={
          <Button asChild>
            <Link to="/">
              <Home aria-hidden="true" />
              Anasayfaya dön
            </Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
