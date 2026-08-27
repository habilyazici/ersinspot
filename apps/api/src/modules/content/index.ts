/**
 * content modülü — genel sözleşme.
 *
 * Sahip olduğu tablolar:
 *   blog_posts, tags, blog_post_tags, faqs, contact_messages, site_settings
 *
 * Bağımlılıkları: identity (yazar, personel), files (kapak görseli)
 */

export { contentRoutes } from './api/routes.ts';

/** Site ayarını okur. Diğer modüller yapılandırılabilir değerlere buradan erişir. */
export { getSetting } from './application/settings-service.ts';
