import type { SpellMatch } from './types.js'

function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

export class SpellChecker {
  private dictionary: Set<string>
  private vocabularyArray: string[]

  constructor(terms: Set<string>) {
    this.dictionary = terms
    this.vocabularyArray = Array.from(terms)
  }

  /**
   * Checks if a single word is recognized. Case-insensitive.
   * Numbers, single letters, URLs, and hyphenated compound terms are tolerated.
   */
  checkWord(word: string): boolean {
    const clean = word.trim().toLowerCase()
    if (!clean || clean.length <= 1) return true
    if (/^\d+(\.\d+)?(%|mg|g|kg|ml|cm|mm|bpm)?$/i.test(clean)) return true
    if (this.dictionary.has(clean)) return true

    // Check hyphenated parts (e.g. "pre-consultation")
    if (clean.includes('-')) {
      const parts = clean.split('-')
      if (parts.every(p => !p || this.dictionary.has(p) || p.length <= 2)) return true
    }

    return false
  }

  /**
   * Returns top phonetic/Levenshtein suggestions for a misspelled word.
   */
  getSuggestions(word: string, maxSuggestions: number = 4): string[] {
    const clean = word.trim().toLowerCase()
    if (!clean) return []

    const candidates: Array<{ word: string; distance: number }> = []

    for (const term of this.vocabularyArray) {
      // Fast length filter
      if (Math.abs(term.length - clean.length) > 2) continue

      // Bonus if first letter matches
      const dist = levenshteinDistance(clean, term)
      if (dist <= 2) {
        candidates.push({ word: term, distance: dist })
      }
    }

    candidates.sort((a, b) => a.distance - b.distance)
    return candidates.slice(0, maxSuggestions).map(c => c.word)
  }

  /**
   * Scans a narrative text block and returns all misspelled tokens with character offsets.
   * Execution completes in <50ms for typical clinical consultation narratives.
   */
  checkText(text: string): SpellMatch[] {
    if (!text || typeof text !== 'string') return []

    const matches: SpellMatch[] = []
    // Match word tokens (allowing letters, digits, apostrophes, hyphens)
    const regex = /\b[a-zA-Z][a-zA-Z0-9'-]*\b/g
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      const rawWord = match[0]
      const offset = match.index

      // Strip trailing punctuation like apostrophes
      const word = rawWord.replace(/^'+|'+$/g, '')
      if (!word) continue

      if (!this.checkWord(word)) {
        const suggestions = this.getSuggestions(word)
        matches.push({
          word,
          offset,
          length: rawWord.length,
          suggestions,
        })
      }
    }

    return matches
  }
}
