import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Tag, ArrowLeft, ArrowRight, Share2, Facebook, Twitter, Linkedin } from 'lucide-react@0.487.0';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { blogPosts, blogCategories } from '../data/blogDataNew';
import { AutoCarousel } from '../components/AutoCarousel';
import { BlogHoverCard } from '../components/BlogHoverCard';

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const post = blogPosts.find(p => p.slug === slug);
  const relatedPosts = post ? blogPosts.filter(p => p.category === post.category && p.id !== post.id) : [];

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="mb-4">Blog yazısı bulunamadı</h2>
          <Link to="/blog">
            <Button variant="outline">
              <ArrowLeft className="mr-2 w-4 h-4" />
              Blog'a Dön
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getPostCategoryColor = (categoryId: string) => {
    const category = blogCategories.find(cat => cat.id === categoryId);
    const colorMap: Record<string, string> = {
      blue: 'bg-[var(--brand-navy-600)]',
      orange: 'bg-[var(--brand-orange-600)]',
      bronze: 'bg-[var(--brand-bronze-600)]',
      teal: 'bg-[var(--brand-teal-600)]',
      green: 'bg-green-600',
    };
    return colorMap[category?.color || 'blue'];
  };

  const shareUrl = window.location.href;
  const shareText = post.title;

  return (
    <div className="bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--brand-coral-500)] rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Back Button */}
          <Button
            onClick={() => navigate('/blog')}
            variant="ghost"
            className="mb-8 text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 w-4 h-4" />
            Blog'a Dön
          </Button>

          <div className="max-w-4xl mx-auto text-center">
            {/* Category Badge */}
            <Badge className={`${getPostCategoryColor(post.category)} text-white mb-4 text-sm px-4 py-1.5`}>
              {blogCategories.find(cat => cat.id === post.category)?.label}
            </Badge>

            {/* Title */}
            <h1 className="mb-6 drop-shadow-lg text-white text-4xl md:text-5xl">{post.title}</h1>

            {/* Decorative Line */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-1 w-16 bg-[var(--brand-coral-500)] rounded-full"></div>
              <div className="h-1 w-24 bg-white rounded-full"></div>
              <div className="h-1 w-16 bg-[var(--brand-coral-500)] rounded-full"></div>
            </div>

            {/* Meta Info */}
            <div className="flex items-center justify-center gap-6 text-sm mb-8">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>
                  {new Date(post.publishedDate).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{post.readTime}</span>
              </div>
            </div>

            {/* Excerpt */}
            <p className="text-xl text-white drop-shadow-md max-w-3xl mx-auto">
              {post.excerpt}
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar */}
              <div className="lg:col-span-1 order-2 lg:order-1">
                <div className="sticky top-24 space-y-6">
                  {/* Share Card */}
                  <Card className="bg-gradient-to-br from-[var(--brand-coral-50)] to-white border-[var(--brand-coral-200)]">
                    <CardContent className="p-6">
                      <h3 className="mb-4 text-lg flex items-center gap-2">
                        <Share2 className="w-5 h-5" />
                        Paylaş
                      </h3>
                      <div className="space-y-2">
                        <a
                          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-lg bg-[#1877F2] text-white hover:bg-[#166FE5] transition-colors"
                        >
                          <Facebook className="w-5 h-5" />
                          <span>Facebook</span>
                        </a>
                        <a
                          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-lg bg-[#1DA1F2] text-white hover:bg-[#1A94DA] transition-colors"
                        >
                          <Twitter className="w-5 h-5" />
                          <span>Twitter</span>
                        </a>
                        <a
                          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-lg bg-[#0A66C2] text-white hover:bg-[#004182] transition-colors"
                        >
                          <Linkedin className="w-5 h-5" />
                          <span>LinkedIn</span>
                        </a>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tags Card */}
                  <Card className="bg-gradient-to-br from-[var(--brand-cream-100)] to-white border-[var(--brand-bronze-200)]">
                    <CardContent className="p-6">
                      <h3 className="mb-4 text-lg flex items-center gap-2">
                        <Tag className="w-5 h-5" />
                        Etiketler
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="border-[var(--brand-teal-400)] text-[var(--brand-teal-700)] hover:bg-[var(--brand-teal-50)] cursor-pointer"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Article Content */}
              <div className="lg:col-span-3 order-1 lg:order-2">
                <Card className="shadow-xl border-0">
                  <CardContent className="p-8 md:p-12">
                    {/* Featured Image */}
                    <div className="mb-8 rounded-xl overflow-hidden shadow-lg">
                      <ImageWithFallback
                        src={post.image}
                        alt={post.title}
                        className="w-full h-auto"
                      />
                    </div>

                    {/* Content */}
                    <div className="prose prose-lg max-w-none">
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: post.content
                            .replace(/^# (.+)$/gm, '<h1 class="text-3xl md:text-4xl mb-6 mt-8 bg-gradient-to-r from-[var(--brand-navy-700)] to-[var(--brand-orange-600)] bg-clip-text text-transparent">$1</h1>')
                            .replace(/^## (.+)$/gm, '<h2 class="text-2xl md:text-3xl mb-4 mt-8 text-[var(--brand-navy-700)]">$1</h2>')
                            .replace(/^### (.+)$/gm, '<h3 class="text-xl md:text-2xl mb-3 mt-6 text-[var(--brand-teal-700)]">$3</h3>')
                            .replace(/^\*\*(.+)\*\*$/gm, '<p class="mb-4"><strong class="text-[var(--brand-navy-700)]">$1</strong></p>')
                            .replace(/^- (.+)$/gm, '<li class="mb-2 text-gray-700">$1</li>')
                            .replace(/✅ \*\*(.+?)\*\*/g, '<span class="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-lg mb-2"><span class="text-lg">✅</span><strong>$1</strong></span>')
                            .replace(/❌ \*\*(.+?)\*\*/g, '<span class="inline-flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1 rounded-lg mb-2"><span class="text-lg">❌</span><strong>$1</strong></span>')
                            .replace(/⚠️ \*\*(.+?)\*\*/g, '<span class="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-lg mb-2"><span class="text-lg">⚠️</span><strong>$1</strong></span>')
                            .replace(/🔧 \*\*(.+?)\*\*/g, '<span class="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-lg mb-2"><span class="text-lg">🔧</span><strong>$1</strong></span>')
                            .replace(/\n\n/g, '</p><p class="mb-4 text-gray-700 leading-relaxed">')
                            .replace(/\|(.+)\|/g, (match) => {
                              const cells = match.split('|').filter(cell => cell.trim());
                              return `<tr>${cells.map(cell => `<td class="border border-gray-300 px-4 py-2">${cell.trim()}</td>`).join('')}</tr>`;
                            })
                        }} 
                      />
                    </div>

                    {/* CTA at the end */}
                    <div className="mt-12 p-8 bg-gradient-to-r from-[var(--brand-teal-50)] to-[var(--brand-cream-100)] rounded-xl border-2 border-[var(--brand-teal-200)]">
                      <h3 className="mb-4 text-[var(--brand-navy-700)]">Yardıma İhtiyacınız Var mı?</h3>
                      <p className="text-gray-700 mb-6">
                        Ersin Spot olarak size her konuda yardımcı olmaya hazırız. 
                        Teknik servis, nakliye veya ikinci el ürün alımı için bize ulaşın.
                      </p>
                      <div className="flex flex-wrap gap-4">
                        <Link to="/iletisim">
                          <Button variant="teal" size="lg">
                            Bize Ulaşın
                            <ArrowRight className="ml-2 w-5 h-5" />
                          </Button>
                        </Link>
                        <Link to="/teknik-servis">
                          <Button variant="outline" size="lg" className="border-[var(--brand-teal-600)] text-[var(--brand-teal-700)] hover:bg-[var(--brand-teal-50)]">
                            Teknik Servis
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="py-16 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <Badge className="bg-[var(--brand-coral-500)] text-white mb-4 text-sm px-4 py-1.5">
                  İLGİLİ İÇERİKLER
                </Badge>
                <h2 className="mb-4">İlginizi Çekebilecek Diğer Yazılar</h2>
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="h-1 w-16 bg-[var(--brand-coral-500)] rounded-full"></div>
                  <div className="h-1 w-24 bg-[var(--brand-navy-600)] rounded-full"></div>
                  <div className="h-1 w-16 bg-[var(--brand-coral-500)] rounded-full"></div>
                </div>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  Bu konuyla ilgili daha fazla ipucu ve bilgi için diğer blog yazılarımıza göz atın.
                </p>
              </div>

              {/* Desktop Carousel - 3 kart */}
              <div className="hidden lg:block">
                <AutoCarousel interval={3500} itemsPerView={3}>
                  {relatedPosts.map((relatedPost) => (
                    <BlogHoverCard 
                      key={relatedPost.id} 
                      post={relatedPost}
                      categoryLabel={blogCategories.find(cat => cat.id === relatedPost.category)?.label || ''}
                      categoryColor={getPostCategoryColor(relatedPost.category)}
                    />
                  ))}
                </AutoCarousel>
              </div>

              {/* Tablet Carousel - 2 kart */}
              <div className="hidden md:block lg:hidden">
                <AutoCarousel interval={3500} itemsPerView={2}>
                  {relatedPosts.map((relatedPost) => (
                    <BlogHoverCard 
                      key={relatedPost.id} 
                      post={relatedPost}
                      categoryLabel={blogCategories.find(cat => cat.id === relatedPost.category)?.label || ''}
                      categoryColor={getPostCategoryColor(relatedPost.category)}
                    />
                  ))}
                </AutoCarousel>
              </div>

              {/* Mobile Carousel - 1 kart */}
              <div className="block md:hidden">
                <AutoCarousel interval={3500} itemsPerView={1}>
                  {relatedPosts.map((relatedPost) => (
                    <BlogHoverCard 
                      key={relatedPost.id} 
                      post={relatedPost}
                      categoryLabel={blogCategories.find(cat => cat.id === relatedPost.category)?.label || ''}
                      categoryColor={getPostCategoryColor(relatedPost.category)}
                    />
                  ))}
                </AutoCarousel>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}