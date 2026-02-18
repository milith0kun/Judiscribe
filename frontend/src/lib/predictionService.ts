/**
 * Servicio de predicción de texto para autocompletado judicial.
 *
 * Conecta con el backend para obtener:
 * - Sugerencias de autocompletado (ghost text)
 * - Corrección de nombres (mayúsculas)
 * - Detección de códigos de expediente
 * - Análisis de estructura de párrafos
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface PredictionResult {
    suggestion: string | null
    corrected_text: string | null
    names: NameDetection[]
    expedientes: ExpedienteDetection[]
    structure: StructureInfo
}

export interface NameDetection {
    word: string
    start: number
    end: number
    type: 'nombre' | 'apellido' | 'nombre_titulo'
    suggestion: string
}

export interface ExpedienteDetection {
    match: string
    start: number
    end: number
    formatted: string
    especialidad?: string
}

export interface StructureInfo {
    needs_new_paragraph: boolean
    reason: string | null
    indent_level: number
}

/**
 * Obtiene sugerencia de autocompletado para el texto actual.
 */
export async function fetchSuggestion(
    text: string,
    speakerId?: string
): Promise<string | null> {
    try {
        const response = await fetch(`${API_BASE}/api/prediction/suggest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                speaker_id: speakerId,
                max_tokens: 50,
            }),
        })

        if (!response.ok) {
            console.warn('Prediction API error:', response.status)
            return null
        }

        const data: PredictionResult = await response.json()
        return data.suggestion
    } catch (error) {
        console.warn('Error fetching suggestion:', error)
        return null
    }
}

/**
 * Obtiene análisis completo del texto (nombres, expedientes, estructura).
 */
export async function analyzeText(
    text: string,
    speakerId?: string
): Promise<PredictionResult | null> {
    try {
        const response = await fetch(`${API_BASE}/api/prediction/suggest`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                speaker_id: speakerId,
            }),
        })

        if (!response.ok) {
            return null
        }

        return await response.json()
    } catch (error) {
        console.warn('Error analyzing text:', error)
        return null
    }
}

/**
 * Capitaliza nombres propios en el texto.
 */
export async function capitalizeNames(text: string): Promise<{
    original: string
    corrected: string
    changes: NameDetection[]
} | null> {
    try {
        const response = await fetch(`${API_BASE}/api/prediction/capitalize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        })

        if (!response.ok) {
            return null
        }

        return await response.json()
    } catch (error) {
        console.warn('Error capitalizing names:', error)
        return null
    }
}

/**
 * Detecta códigos de expediente judicial en el texto.
 */
export async function detectExpedientes(text: string): Promise<{
    expedientes: ExpedienteDetection[]
    count: number
} | null> {
    try {
        const response = await fetch(`${API_BASE}/api/prediction/detect-expediente`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        })

        if (!response.ok) {
            return null
        }

        return await response.json()
    } catch (error) {
        console.warn('Error detecting expedientes:', error)
        return null
    }
}

/**
 * Cache local para sugerencias frecuentes.
 */
class SuggestionCache {
    private cache: Map<string, { suggestion: string; timestamp: number }> = new Map()
    private maxSize = 50
    private ttlMs = 60000 // 1 minuto

    get(key: string): string | null {
        const entry = this.cache.get(key)
        if (!entry) return null

        // Verificar TTL
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key)
            return null
        }

        return entry.suggestion
    }

    set(key: string, suggestion: string): void {
        // Limpiar cache si está lleno
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value
            if (oldestKey) {
                this.cache.delete(oldestKey)
            }
        }

        this.cache.set(key, {
            suggestion,
            timestamp: Date.now(),
        })
    }

    clear(): void {
        this.cache.clear()
    }
}

export const suggestionCache = new SuggestionCache()

/**
 * Obtiene sugerencia con cache.
 */
export async function fetchSuggestionCached(
    text: string,
    speakerId?: string
): Promise<string | null> {
    // Usar últimas 100 caracteres como key
    const cacheKey = text.slice(-100)

    // Verificar cache
    const cached = suggestionCache.get(cacheKey)
    if (cached) {
        return cached
    }

    // Obtener de API
    const suggestion = await fetchSuggestion(text, speakerId)

    // Guardar en cache si hay sugerencia
    if (suggestion) {
        suggestionCache.set(cacheKey, suggestion)
    }

    return suggestion
}
