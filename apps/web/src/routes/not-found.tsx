import { Link } from 'react-router-dom';
import { Home, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { EmptyState } from '@/components/ui/empty-state.tsx';

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState
        icon={SearchX}
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
    </div>
  );
}
