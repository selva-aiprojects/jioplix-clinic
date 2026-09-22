import { SpellMatch } from './types.js';
export declare class SpellChecker {
    private dictionary;
    private vocabularyArray;
    constructor(terms: Set<string>);
    /**
     * Checks if a single word is recognized. Case-insensitive.
     * Numbers, single letters, URLs, and hyphenated compound terms are tolerated.
     */
    checkWord(word: string): boolean;
    /**
     * Returns top phonetic/Levenshtein suggestions for a misspelled word.
     */
    getSuggestions(word: string, maxSuggestions?: number): string[];
    /**
     * Scans a narrative text block and returns all misspelled tokens with character offsets.
     * Execution completes in <50ms for typical clinical consultation narratives.
     */
    checkText(text: string): SpellMatch[];
}
