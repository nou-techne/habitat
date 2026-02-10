/**
 * Formatting utilities for display
 */

/**
 * Format number as USD currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format ISO date string as human-readable date
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

/**
 * Format ISO date string as relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffDays > 7) {
    return formatDate(dateString)
  } else if (diffDays > 0) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
  } else if (diffHours > 0) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  } else if (diffMins > 0) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
  } else {
    return 'just now'
  }
}

/**
 * Format number with abbreviation (e.g., 1.2K, 3.4M)
 */
export function formatNumber(num: number, decimals: number = 1): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(decimals) + 'M'
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(decimals) + 'K'
  } else {
    return num.toString()
  }
}

/**
 * Format hours as human-readable duration
 */
export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`
  } else if (hours < 8) {
    return `${hours.toFixed(1)}h`
  } else {
    const days = Math.floor(hours / 8)
    const remainingHours = hours % 8
    if (remainingHours === 0) {
      return `${days}d`
    } else {
      return `${days}d ${remainingHours.toFixed(1)}h`
    }
  }
}
