import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Search, Filter, Tag, HelpCircle, ArrowRight, ArrowUp } from 'lucide-react@0.487.0';
import { BlogHoverCard } from '../components/BlogHoverCard';
import { AutoCarousel } from '../components/AutoCarousel';
import { blogPosts, blogCategories } from '../data/blogDataNew';
import { motion, useInView } from 'motion/react';

// Helper function to get posts by category
function getPostsByCategory(categoryId: string) {
  if (categoryId === 'all') {
    return blogPosts;
  }
  return blogPosts.filter(post => post.category === categoryId);
}

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(9); // İlk 9 blog göster

  // Filter posts based on category and search
  const filteredPosts = getPostsByCategory(selectedCategory).filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Görünür bloglar
  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPosts.length;

  const loadMore = () => {
    setVisibleCount(prev => prev + 9); // Her tıklamada +9 blog ekle
  };

  const showLess = () => {
    setVisibleCount(9); // İlk 9 blog'a geri dön
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Sayfa başına dön
  };

  // Kategori veya arama değişince reset
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setVisibleCount(9); // Reset
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setVisibleCount(9); // Reset
  };

  const getCategoryColor = (categoryId: string) => {
    const category = blogCategories.find(cat => cat.id === categoryId);
    const colorMap: Record<string, string> = {
      blue: 'bg-[var(--brand-navy-600)] hover:bg-[var(--brand-navy-700)]',
      orange: 'bg-[var(--brand-orange-600)] hover:bg-[var(--brand-orange-700)]',
      bronze: 'bg-[var(--brand-bronze-600)] hover:bg-[var(--brand-bronze-700)]',
      teal: 'bg-[var(--brand-teal-600)] hover:bg-[var(--brand-teal-700)]',
      green: 'bg-green-600 hover:bg-green-700',
      gray: 'bg-gray-600 hover:bg-gray-700',
    };
    return colorMap[category?.color || 'gray'];
  };

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

  return (
    <div className="bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Hero Section */}
      <section className="relative py-20 text-white overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1573011490897-e4cfd579a907?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjBkZXNrJTIwYmxvZyUyMHdyaXRpbmd8ZW58MXx8fHwxNzYzOTAxODkzfDA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Blog Background"
            className="w-full h-full object-cover"
          />
          {/* Gradient Overlay - Okunabilirlik için */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/85 via-[#1e293b]/80 to-[#0f172a]/85"></div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden opacity-5">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--brand-coral-500)] rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="bg-[var(--brand-coral-500)] text-white mb-4 text-sm px-4 py-1.5">
              <Tag className="w-3 h-3 mr-1 inline" />
              BLOG & HABERLER
            </Badge>
            <h1 className="mb-6 drop-shadow-lg text-white">Haberler & İpuçları</h1>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="h-1 w-16 bg-[var(--brand-coral-500)] rounded-full"></div>
              <div className="h-1 w-24 bg-white rounded-full"></div>
              <div className="h-1 w-16 bg-[var(--brand-coral-500)] rounded-full"></div>
            </div>
            <p className="text-xl text-white mb-8 max-w-2xl mx-auto drop-shadow-md">
              Beyaz eşya bakımı, taşınma ipuçları, enerji tasarrufu ve daha fazlası hakkında 
              uzman yazıları keşfedin.
            </p>

            {/* Search Bar */}
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Blog yazılarında ara..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-12 pr-4 py-6 text-base bg-white/95 backdrop-blur-sm border-0 shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="sticky top-20 z-40 bg-white/95 backdrop-blur-md shadow-md border-b">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between gap-4">
            {/* Sol: Kategori Butonları */}
            <div className="flex items-center gap-3 flex-wrap flex-1">
              <Filter className="w-5 h-5 text-gray-600 flex-shrink-0" />
              {blogCategories.map((category) => {
                const isActive = selectedCategory === category.id;
                return (
                  <Button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    variant={isActive ? 'default' : 'outline'}
                    size="default"
                    className={`whitespace-nowrap transition-all duration-300 ${
                      isActive
                        ? 'bg-[#f97316] text-white hover:bg-[#ea580c] border-0 shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    {category.label}
                  </Button>
                );
              })}
            </div>

            {/* Sağ: SSS Butonu (Lacivert) */}
            <Link to="/sss">
              <Button
                size="default"
                className="whitespace-nowrap bg-[#1e3a8a] text-white hover:bg-[#1e40af] border-0 shadow-lg hover:shadow-xl transition-all duration-300 flex-shrink-0"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                <span className="font-medium">SSS</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-gray-600 mb-2">Sonuç bulunamadı</h3>
              <p className="text-gray-500">
                Arama kriterlerinize uygun blog yazısı bulunamadı.
              </p>
            </div>
          ) : (
            <>
              {/* Blog Grid - 3 Kolon */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {visiblePosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    className="h-full"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0, y: 50, scale: 0.95 },
                      visible: { 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                        transition: { 
                          duration: 0.5, 
                          delay: index * 0.1,
                          ease: 'easeOut'
                        } 
                      }
                    }}
                    whileHover={{ 
                      y: -10, 
                      scale: 1.03,
                      transition: { duration: 0.3 } 
                    }}
                  >
                    <BlogHoverCard 
                      post={post}
                      categoryLabel={blogCategories.find(cat => cat.id === post.category)?.label || ''}
                      categoryColor={getPostCategoryColor(post.category)}
                    />
                  </motion.div>
                ))}
              </div>

              {/* Daha Fazla Yükle Butonu */}
              {hasMore && (
                <div className="text-center mt-12">
                  <Button
                    size="lg"
                    onClick={loadMore}
                    className="bg-[#f97316] hover:bg-[#ea580c] text-white shadow-lg px-8 py-6"
                  >
                    Daha Fazla Yükle
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* Tümü Yüklendi - Daha Az Göster Butonu ve Mesaj */}
              {!hasMore && filteredPosts.length > 9 && (
                <div className="text-center mt-12 space-y-6">
                  <Button
                    size="lg"
                    onClick={showLess}
                    variant="outline"
                    className="bg-white hover:bg-gray-50 text-[#1e3a8a] border-2 border-[#1e3a8a] hover:border-[#2563eb] shadow-lg px-8 py-6"
                  >
                    <ArrowUp className="mr-2 w-5 h-5" />
                    Daha Az Göster
                  </Button>
                  <p className="text-gray-500 text-lg">
                    Tüm blog yazıları gösteriliyor ({filteredPosts.length} yazı)
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-gray-100 to-white relative overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-10 left-10 w-80 h-80 bg-[#f97316]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.3, 1],
              x: [0, 50, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-10 right-10 w-96 h-96 bg-[#1e3a8a]/10 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              x: [0, -40, 0],
              y: [0, 40, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="max-w-4xl mx-auto bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] text-white border-0 shadow-2xl overflow-hidden relative">
              <CardContent className="p-12 text-center relative">
                {/* Animated Glow Effect */}
                <motion.div 
                  className="absolute inset-0 overflow-hidden opacity-10"
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <motion.div 
                    className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"
                    animate={{
                      x: [0, -50, 0],
                      y: [0, 50, 0],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <motion.div 
                    className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"
                    animate={{
                      x: [0, 50, 0],
                      y: [0, -50, 0],
                    }}
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
                
                <div className="relative z-10">
                  <motion.h2 
                    className="mb-4 text-white drop-shadow-sm"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    Daha Fazla İpucu İster Misiniz?
                  </motion.h2>
                  <motion.p 
                    className="text-xl text-white/95 mb-8 max-w-2xl mx-auto"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    Beyaz eşya bakımı, taşınma ve enerji tasarrufu hakkında daha fazla bilgi almak için 
                    bizi takip edin veya bize ulaşın.
                  </motion.p>
                  <motion.div 
                    className="flex flex-wrap gap-4 justify-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <Link to="/iletisim">
                      <motion.div
                        whileHover={{ scale: 1.05, y: -3 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button size="lg" className="bg-[#f97316] text-white hover:bg-[#ea580c] shadow-xl border-0">
                          Bize Ulaşın
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                      </motion.div>
                    </Link>
                    <Link to="/urunler">
                      <motion.div
                        whileHover={{ scale: 1.05, y: -3 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button size="lg" variant="outline" className="bg-white text-[#1e3a8a] border-white hover:bg-[#1e3a8a] hover:text-white shadow-xl">
                          Ürünleri İnceleyin
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </Button>
                      </motion.div>
                    </Link>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}