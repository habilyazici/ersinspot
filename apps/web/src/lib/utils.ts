import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Sınıf adlarını birleştirir ve çakışanları çözer.
 *
 * `twMerge`, sonra gelen Tailwind sınıfının öncekini geçersiz kılmasını sağlar:
 * `cn('p-2', 'p-4')` → `'p-4'`. Koşullu stillerde bu olmadan iki sınıf birden
 * kalır ve hangisinin uygulanacağı CSS sırasına bağlı olur.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
