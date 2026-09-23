export interface GrammarMatch {
  phrase: string
  offset: number
  length: number
  message: string
  suggestions: string[]
  type: 'grammar' | 'style' | 'punctuation'
}

interface GrammarRule {
  pattern: RegExp
  message: string
  suggest: (match: RegExpExecArray) => string[]
  type: GrammarMatch['type']
}

/**
 * Rule-based grammar and language style checker.
 * Designed for clinical/professional text. Runs fully in-browser — no network call needed.
 * All checks are advisory and fail-open (never throws).
 */
const GRAMMAR_RULES: GrammarRule[] = [
  // Double word repetition
  {
    pattern: /\b(\w+)\s+\1\b/gi,
    message: 'Repeated word detected.',
    suggest: m => [m[1]],
    type: 'grammar',
  },

  // Missing space after comma
  {
    pattern: /,(?=[^\s\d])/g,
    message: 'Missing space after comma.',
    suggest: m => [m[0].replace(',', ', ')],
    type: 'punctuation',
  },

  // Multiple spaces
  {
    pattern: /  +/g,
    message: 'Multiple consecutive spaces.',
    suggest: () => [' '],
    type: 'punctuation',
  },

  // Common a/an article errors
  {
    pattern: /\ba ([aeiou][a-z]*)\b/gi,
    message: 'Use "an" before words starting with a vowel sound.',
    suggest: m => [`an ${m[1]}`],
    type: 'grammar',
  },
  {
    pattern: /\ban ([^aeiou\s][a-z]*)\b/gi,
    message: 'Use "a" before words starting with a consonant sound.',
    suggest: m => [`a ${m[1]}`],
    type: 'grammar',
  },

  // Passive tense helpers commonly confused
  {
    pattern: /\b(should of|would of|could of|must of)\b/gi,
    message: 'Likely means "have" not "of".',
    suggest: m => [m[0].replace(' of', ' have')],
    type: 'grammar',
  },

  // Loose punctuation before sentence end
  {
    pattern: /\s+[.!?]/g,
    message: 'Space before punctuation.',
    suggest: m => [m[0].trim()],
    type: 'punctuation',
  },

  // Common clinical writing style: lower-case sentence start
  {
    pattern: /(?:^|[.!?]\s+)([a-z])/gm,
    message: 'Sentence should start with a capital letter.',
    suggest: m => [m[1].toUpperCase()],
    type: 'style',
  },

  // Common short-word typos not caught by spell check
  {
    pattern: /\bteh\b/gi,
    message: '"teh" is likely "the".',
    suggest: () => ['the'],
    type: 'grammar',
  },
  {
    pattern: /\bhte\b/gi,
    message: '"hte" is likely "the".',
    suggest: () => ['the'],
    type: 'grammar',
  },
  {
    pattern: /\bwith out\b/gi,
    message: '"with out" should be "without".',
    suggest: () => ['without'],
    type: 'grammar',
  },
  {
    pattern: /\bsome times\b/gi,
    message: '"some times" should be "sometimes".',
    suggest: () => ['sometimes'],
    type: 'grammar',
  },
]

export class GrammarChecker {
  /**
   * Scans the given text and returns all grammar/style issues found.
   * Each match includes offset, length, human-readable message and suggestions.
   * Runs synchronously in <10ms for typical clinical notes.
   */
  checkText(text: string): GrammarMatch[] {
    if (!text || typeof text !== 'string') return []

    const results: GrammarMatch[] = []
    const seen = new Set<number>() // deduplicate overlapping matches by offset

    for (const rule of GRAMMAR_RULES) {
      // Reset stateful regex between runs
      rule.pattern.lastIndex = 0

      let m: RegExpExecArray | null
      while ((m = rule.pattern.exec(text)) !== null) {
        const offset = m.index
        if (seen.has(offset)) continue
        seen.add(offset)

        results.push({
          phrase: m[0],
          offset,
          length: m[0].length,
          message: rule.message,
          suggestions: rule.suggest(m),
          type: rule.type,
        })
      }
    }

    // Sort by position in text
    results.sort((a, b) => a.offset - b.offset)
    return results
  }
}
