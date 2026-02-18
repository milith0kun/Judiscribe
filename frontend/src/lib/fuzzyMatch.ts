/**
 * Simple Levenshtein distance based fuzzy matching for legal terms.
 */

export function levenshteinDistance(a: string, b: string): number {
    const matrix = Array.from({ length: a.length + 1 }, () =>
        Array.from({ length: b.length + 1 }, (_, i) => i)
    )

    for (let i = 0; i <= a.length; i++) matrix[i][0] = i
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            )
        }
    }

    return matrix[a.length][b.length]
}

export function getSuggestions(word: string, corpus: string[], limit = 3): { word: string, confidence: number }[] {
    if (!word || word.length < 3) return []

    const matches = corpus.map(term => {
        const dist = levenshteinDistance(word, term)
        // Simple heuristic for confidence based on distance and length
        const maxLen = Math.max(word.length, term.length)
        const confidence = 1 - (dist / maxLen)
        return { word: term, confidence }
    })

    return matches
        .filter(m => m.confidence > 0.6) // Only decent matches
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit)
}
