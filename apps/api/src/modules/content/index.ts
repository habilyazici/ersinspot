/**
 * content modülü — genel sözleşme.
 *
 * Sahip olduğu tablolar:
 *   blog_posts, tags, blog_post_tags, faqs, contact_messages, site_settings
 *
 * Bağımlılıkları: identity (yazar, personel), files (kapak görseli)
 */

/*
  Sözleşme yalnızca yönlendiriciden ibarettir.

  Burada bir de `getSetting` duruyordu ama hiçbir modül çağırmıyordu: site
  ayarları yalnızca `GET /api/settings` üzerinden tarayıcıya gidiyor. Modüller
  arası bir yüzey açık tutmak, onu kullanan bir çağıran doğduğunda kolaydır;
  kullanılmayan yüzey ise her okuyanı "bunu kim çağırıyor" diye aratır.
*/
export { contentRoutes } from './api/routes.ts';
