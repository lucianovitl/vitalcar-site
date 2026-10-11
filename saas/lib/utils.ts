import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number, locale = 'pt-BR', currency = 'BRL') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
}

export function formatDate(date: Date | string, locale = 'pt-BR') {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(date))
}

export function formatRelativeTime(date: Date | string, locale = 'pt-BR') {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const diff = new Date(date).getTime() - Date.now()
  const seconds = Math.round(diff / 1000)
  const minutes = Math.round(seconds / 60)
  const hours = Math.round(minutes / 60)
  const days = Math.round(hours / 24)

  if (days !== 0) return rtf.format(days, 'day')
  if (hours !== 0) return rtf.format(hours, 'hour')
  if (minutes !== 0) return rtf.format(minutes, 'minute')
  return rtf.format(seconds, 'second')
}

export function generateId(prefix = '') {
  return `${prefix}${Math.random().toString(36).substring(2, 10)}`
}

export function truncate(str: string, length: number) {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}