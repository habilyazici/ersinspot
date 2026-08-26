/**
 * Görüntüleme biçimlendirmesi.
 *
 * Eski kod tabanında `toLocaleString('tr-TR')` 99 yerde, `toLocaleDateString`
 * 62 yerde ve elle yazılmış "₺" 120 yerde tekrarlanıyordu. Biçim değiştirmek
 * bu yerlerin hepsine dokunmayı gerektiriyordu.
 */

import { money } from '@ersinspot/shared';
import type { Kurus } from '@ersinspot/shared';

/** Kuruş cinsinden tutarı para biçiminde yazar: "24.500,00 ₺". */
export function formatPrice(kurus: number, options?: { compact?: boolean }): string {
  return money.format(money.fromKurus(kurus), {
    hideDecimalsWhenWhole: options?.compact ?? true,
  });
}

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const shortDateFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** "15 Eylül 2026" */
export function formatDate(value: string | Date): string {
  return dateFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

/** "15 Eylül 2026 14:30" */
export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

/** "15.09.2026" — tablolarda yer kazanmak için. */
export function formatShortDate(value: string | Date): string {
  return shortDateFormatter.format(typeof value === 'string' ? new Date(value) : value);
}

/** Saat aralığını yazar: "09:00 - 11:00". */
export function formatTimeSlot(slot: { startTime: string; endTime: string } | null): string {
  return slot === null ? '—' : `${slot.startTime} - ${slot.endTime}`;
}

/**
 * Göreli zaman: "3 gün önce", "az önce".
 *
 * Sipariş ve talep listelerinde tam tarihten daha okunabilir.
 */
const relativeFormatter = new Intl.RelativeTimeFormat('tr-TR', { numeric: 'auto' });

export function formatRelativeTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);

  if (Math.abs(diffMinutes) < 1) return 'az önce';
  if (Math.abs(diffMinutes) < 60) return relativeFormatter.format(diffMinutes, 'minute');

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return relativeFormatter.format(diffHours, 'hour');

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) return relativeFormatter.format(diffDays, 'day');

  return formatDate(date);
}

/** Adresi tek satırda yazar. */
export function formatAddress(address: {
  neighborhood: string;
  street: string;
  buildingNo: string;
  apartmentNo?: string | undefined;
  district: string;
}): string {
  const parts = [
    address.neighborhood,
    address.street,
    `No: ${address.buildingNo}`,
    address.apartmentNo === undefined ? null : `Daire: ${address.apartmentNo}`,
    `${address.district} / İzmir`,
  ];

  return parts.filter((part): part is string => part !== null).join(', ');
}

export type { Kurus };
