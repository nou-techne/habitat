/**
 * Tax Reporting Exports
 * 
 * Export endpoints for year-end tax reporting:
 * - Schedule K-1 (Form 1065)
 * - Member allocation statements
 * - Capital account statements
 * - CSV bulk exports
 */

export * from './k1-export.js'
export * from './allocation-statement.js'
export * from './capital-account-statement.js'

/**
 * Export format types
 */
export type ExportFormat = 'csv' | 'json' | 'pdf' | 'html'

/**
 * Export request
 */
export interface ExportRequest {
  format: ExportFormat
  taxYear: number
  members?: string[] // Optional: specific members, or all if omitted
}

/**
 * Export response
 */
export interface ExportResponse {
  format: ExportFormat
  filename: string
  contentType: string
  data: string | Buffer
}

/**
 * Content type mapping
 */
export const CONTENT_TYPES: Record<ExportFormat, string> = {
  csv: 'text/csv',
  json: 'application/json',
  pdf: 'application/pdf',
  html: 'text/html',
}

/**
 * Generate filename for export
 */
export function generateFilename(
  type: 'k1' | 'allocation' | 'capital-account',
  format: ExportFormat,
  taxYear: number,
  memberId?: string
): string {
  const timestamp = new Date().toISOString().split('T')[0]
  const memberSuffix = memberId ? `-${memberId}` : '-all'
  
  return `${type}-${taxYear}${memberSuffix}-${timestamp}.${format}`
}
