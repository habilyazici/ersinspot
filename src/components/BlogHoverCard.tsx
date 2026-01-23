import { Link } from 'react-router-dom';
import { Calendar, Clock, ArrowRight } from 'lucide-react@0.487.0';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  publishedDate: string;
  readTime: string;
  tags: string[];
  featured?: boolean;
}

interface BlogHoverCardProps {
  post: BlogPost;
  categoryLabel: string;
  categoryColor: string;
}

export function BlogHoverCard({ post, categoryLabel, categoryColor }: BlogHoverCardProps) {
  return (
    <div className="relative h-full group/card">
      {/* Blog Kartı - Link Kaldırıldı */}
      <Card className="h-full overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 duration-300 border-0 bg-white">
        {/* Image */}
        <div className="relative h-56 overflow-hidden">
          <ImageWithFallback
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>
          
          {/* Category Badge */}
          <div className="absolute top-4 left-4">
            <Badge className={`${categoryColor} text-white rounded-lg shadow-lg`}>
              {categoryLabel}
            </Badge>
          </div>

          {/* Featured Badge */}
          {post.featured && (
            <div className="absolute top-4 right-4">
              <Badge className="bg-[var(--brand-coral-500)] text-white rounded-lg shadow-lg">
                ⭐ Öne Çıkan
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-6 flex flex-col h-full">
          {/* Meta Info */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(post.publishedDate).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{post.readTime}</span>
            </div>
          </div>

          {/* Title - Hover'da Tooltip (Kaybolmaz) */}
          <div className="relative mb-2 group/title">
            <h3 className="line-clamp-1 cursor-help text-gray-900 hover:text-[var(--brand-orange-600)] transition-colors">
              {post.title}
            </h3>
            {/* Tooltip - Kaybolmaz, üzerine gelebilirsin */}
            <div className="invisible group-hover/title:visible absolute left-0 top-full bg-gray-900 text-white px-3 py-2 text-sm rounded-lg mt-1 z-[60] shadow-2xl whitespace-normal max-w-xs pointer-events-auto">
              {post.title}
              <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          </div>

          {/* Excerpt - 2 Satır Sınırı */}
          <p className="text-gray-600 mb-3 line-clamp-2 text-sm flex-1">
            {post.excerpt}
          </p>

          {/* Tags + Buton - MT-AUTO ile en alta sabitlenir */}
          <div className="mt-auto space-y-3">
            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {post.tags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs border-[var(--brand-teal-400)] text-[var(--brand-teal-700)] hover:bg-[var(--brand-teal-50)]"
                >
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Devamını Oku Butonu - Sadece Buton Tıklanabilir */}
            <Link to={`/blog/${post.slug}`}>
              <Button
                variant="ghost"
                className="text-[var(--brand-coral-500)] hover:text-[var(--brand-coral-600)] p-0 hover:translate-x-2 transition-transform"
              >
                Devamını Oku
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}