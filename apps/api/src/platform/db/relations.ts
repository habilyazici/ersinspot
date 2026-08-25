/**
 * Drizzle ilişki tanımları.
 *
 * Bu tanımlar veritabanı kısıtı üretmez; yalnızca sorgu API'sinin ilişkili kayıtları
 * tipli biçimde çekebilmesini sağlar (`db.query.orders.findFirst({ with: { items: true } })`).
 * Yabancı anahtar kısıtları tablo tanımlarında `references()` ile kurulmuştur.
 */

import { relations } from 'drizzle-orm';
import {
  customerAddresses,
  emailVerificationTokens,
  passwordResetTokens,
  sessions,
  users,
} from '../../modules/identity/infrastructure/schema.ts';
import {
  brands,
  categories,
  productImages,
  productSpecs,
  products,
} from '../../modules/catalog/infrastructure/schema.ts';
import {
  cartItems,
  favorites,
  orderAddresses,
  orderEvents,
  orderItems,
  orders,
  payments,
} from '../../modules/ordering/infrastructure/schema.ts';
import {
  movingRequestDetails,
  movingRequestItems,
  requestAddresses,
  requestAppointments,
  requestEvents,
  requestPhotos,
  requestQuotes,
  sellRequestDetails,
  serviceRequests,
  technicalServiceDetails,
} from '../../modules/servicing/infrastructure/schema.ts';
import {
  blogPostTags,
  blogPosts,
  contactMessages,
  tags,
  uploadedFiles,
} from '../../modules/content/infrastructure/schema.ts';

// ---------------------------------------------------------------------------
// Kimlik
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  passwordResetTokens: many(passwordResetTokens),
  emailVerificationTokens: many(emailVerificationTokens),
  cartItems: many(cartItems),
  favorites: many(favorites),
  orders: many(orders),
  serviceRequests: many(serviceRequests),
  uploadedFiles: many(uploadedFiles),
  blogPosts: many(blogPosts),
  contactMessages: many(contactMessages),
  addresses: many(customerAddresses),
}));

export const customerAddressesRelations = relations(customerAddresses, ({ one }) => ({
  user: one(users, { fields: [customerAddresses.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, { fields: [emailVerificationTokens.userId], references: [users.id] }),
}));

// ---------------------------------------------------------------------------
// Katalog
// ---------------------------------------------------------------------------

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categoryHierarchy',
  }),
  children: many(categories, { relationName: 'categoryHierarchy' }),
  products: many(products),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  images: many(productImages),
  specs: many(productSpecs),
  favorites: many(favorites),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productSpecsRelations = relations(productSpecs, ({ one }) => ({
  product: one(products, { fields: [productSpecs.productId], references: [products.id] }),
}));

// ---------------------------------------------------------------------------
// Sepet, favoriler, siparişler
// ---------------------------------------------------------------------------

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  product: one(products, { fields: [favorites.productId], references: [products.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  events: many(orderEvents),
  deliveryAddress: one(orderAddresses, {
    fields: [orders.id],
    references: [orderAddresses.orderId],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  recordedBy: one(users, { fields: [payments.recordedByUserId], references: [users.id] }),
}));

export const orderAddressesRelations = relations(orderAddresses, ({ one }) => ({
  order: one(orders, { fields: [orderAddresses.orderId], references: [orders.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
  actorUser: one(users, { fields: [orderEvents.actorUserId], references: [users.id] }),
}));

// ---------------------------------------------------------------------------
// Hizmet talepleri
// ---------------------------------------------------------------------------

export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  user: one(users, { fields: [serviceRequests.userId], references: [users.id] }),

  // Türe göre yalnızca biri dolu olur.
  movingDetails: one(movingRequestDetails, {
    fields: [serviceRequests.id],
    references: [movingRequestDetails.requestId],
  }),
  technicalServiceDetails: one(technicalServiceDetails, {
    fields: [serviceRequests.id],
    references: [technicalServiceDetails.requestId],
  }),
  sellRequestDetails: one(sellRequestDetails, {
    fields: [serviceRequests.id],
    references: [sellRequestDetails.requestId],
  }),

  addresses: many(requestAddresses),
  photos: many(requestPhotos),
  quotes: many(requestQuotes),
  appointments: many(requestAppointments),
  events: many(requestEvents),
}));

export const requestAddressesRelations = relations(requestAddresses, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [requestAddresses.requestId],
    references: [serviceRequests.id],
  }),
}));

export const movingRequestDetailsRelations = relations(movingRequestDetails, ({ one, many }) => ({
  request: one(serviceRequests, {
    fields: [movingRequestDetails.requestId],
    references: [serviceRequests.id],
  }),
  items: many(movingRequestItems),
}));

export const movingRequestItemsRelations = relations(movingRequestItems, ({ one }) => ({
  details: one(movingRequestDetails, {
    fields: [movingRequestItems.requestId],
    references: [movingRequestDetails.requestId],
  }),
}));

export const technicalServiceDetailsRelations = relations(technicalServiceDetails, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [technicalServiceDetails.requestId],
    references: [serviceRequests.id],
  }),
}));

export const sellRequestDetailsRelations = relations(sellRequestDetails, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [sellRequestDetails.requestId],
    references: [serviceRequests.id],
  }),
  category: one(categories, {
    fields: [sellRequestDetails.categoryId],
    references: [categories.id],
  }),
  resultingProduct: one(products, {
    fields: [sellRequestDetails.resultingProductId],
    references: [products.id],
  }),
}));

export const requestPhotosRelations = relations(requestPhotos, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [requestPhotos.requestId],
    references: [serviceRequests.id],
  }),
}));

export const requestQuotesRelations = relations(requestQuotes, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [requestQuotes.requestId],
    references: [serviceRequests.id],
  }),
  createdByUser: one(users, { fields: [requestQuotes.createdByUserId], references: [users.id] }),
}));

export const requestAppointmentsRelations = relations(requestAppointments, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [requestAppointments.requestId],
    references: [serviceRequests.id],
  }),
}));

export const requestEventsRelations = relations(requestEvents, ({ one }) => ({
  request: one(serviceRequests, {
    fields: [requestEvents.requestId],
    references: [serviceRequests.id],
  }),
  actorUser: one(users, { fields: [requestEvents.actorUserId], references: [users.id] }),
}));

// ---------------------------------------------------------------------------
// İçerik
// ---------------------------------------------------------------------------

export const contactMessagesRelations = relations(contactMessages, ({ one }) => ({
  user: one(users, { fields: [contactMessages.userId], references: [users.id] }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  author: one(users, { fields: [blogPosts.authorUserId], references: [users.id] }),
  tags: many(blogPostTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  posts: many(blogPostTags),
}));

export const blogPostTagsRelations = relations(blogPostTags, ({ one }) => ({
  post: one(blogPosts, { fields: [blogPostTags.postId], references: [blogPosts.id] }),
  tag: one(tags, { fields: [blogPostTags.tagId], references: [tags.id] }),
}));

export const uploadedFilesRelations = relations(uploadedFiles, ({ one }) => ({
  uploadedBy: one(users, { fields: [uploadedFiles.uploadedByUserId], references: [users.id] }),
}));
