export interface SpellMatch {
  word: string
  offset: number
  length: number
  suggestions: string[]
}

export interface EffectiveTermsOptions {
  domain?: string
  tenantId?: string
}

export type SupportedDomain =
  | 'healthcare'
  | 'hrms'
  | 'lims'
  | 'finance'
  | 'hospitality'
  | 'realestate'
  | 'trading'
  | 'pharma'
  | 'ecommerce'
  | 'supplychain'
