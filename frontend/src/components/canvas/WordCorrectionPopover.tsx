'use client'

/**
 * WordCorrectionPopover — Popover para corregir palabras usando IA.
 *
 * Analiza el contexto de la frase con Claude y muestra:
 * - La frase completa con la palabra resaltada
 * - Sugerencias inteligentes basadas en contexto judicial
 * - La frase corregida completa
 * - Tipo de segmento (pregunta, afirmación, etc.)
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { analyzeWordInContext, type WordAnalysisResult, type Suggestion } from '@/lib/contextAnalysis'

export interface WordAlternative {
    word: string
    confidence: number
}

interface WordCorrectionPopoverProps {
    originalWord: string
    confidence: number
    alternatives?: WordAlternative[]
    sentenceContext?: string
    segmentType?: 'pregunta' | 'afirmación' | 'respuesta' | 'declaración'
    position: { x: number; y: number }
    onSelect: (newWord: string) => void
    onAccept: () => void
    onClose: () => void
    isOpen: boolean
}

export default function WordCorrectionPopover({
    originalWord,
    confidence,
    alternatives = [],
    sentenceContext = '',
    segmentType,
    position,
    onSelect,
    onAccept,
    onClose,
    isOpen,
}: WordCorrectionPopoverProps) {
    const [customWord, setCustomWord] = useState('')
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [aiResult, setAiResult] = useState<WordAnalysisResult | null>(null)
    const popoverRef = useRef<HTMLDivElement>(null)

    // Llamar a la IA cuando se abre el popover
    useEffect(() => {
        if (isOpen && sentenceContext && originalWord) {
            setIsAnalyzing(true)
            setAiResult(null)

            analyzeWordInContext(originalWord, sentenceContext, confidence)
                .then(result => {
                    setAiResult(result)
                    setIsAnalyzing(false)
                })
                .catch(() => {
                    setIsAnalyzing(false)
                })
        }
    }, [isOpen, originalWord, sentenceContext, confidence])

    // Combinar sugerencias de IA con las de Deepgram
    const allSuggestions = useMemo(() => {
        const combined: Array<{ word: string; confidence: number; reason?: string }> = []

        // Primero las sugerencias de IA (tienen razón contextual)
        if (aiResult?.suggestions) {
            aiResult.suggestions.forEach(s => {
                if (!combined.find(c => c.word.toLowerCase() === s.word.toLowerCase())) {
                    combined.push({ word: s.word, confidence: s.confidence, reason: s.reason })
                }
            })
        }

        // Luego las alternativas de Deepgram
        alternatives.forEach(alt => {
            if (!combined.find(c => c.word.toLowerCase() === alt.word.toLowerCase())) {
                combined.push({ word: alt.word, confidence: alt.confidence })
            }
        })

        return combined.slice(0, 5)
    }, [aiResult, alternatives])

    // Tipo de segmento detectado
    const detectedType = aiResult?.segment_type || segmentType || 'afirmación'

    // Frase corregida
    const correctedSentence = aiResult?.corrected_sentence || sentenceContext

    useEffect(() => {
        if (!isOpen) {
            setCustomWord('')
            setSelectedIndex(null)
            setAiResult(null)
        }
    }, [isOpen])

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])

    // Atajos de teclado
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            if (e.key === 'Escape') {
                onClose()
            } else if (e.key === 'Enter') {
                if (selectedIndex !== null && allSuggestions[selectedIndex]) {
                    onSelect(allSuggestions[selectedIndex].word)
                }
            } else if (e.key >= '1' && e.key <= '5') {
                const index = parseInt(e.key) - 1
                if (index < allSuggestions.length) {
                    onSelect(allSuggestions[index].word)
                }
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown)
            return () => document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, selectedIndex, allSuggestions, onSelect, onClose])

    const handleCustomSubmit = () => {
        if (customWord.trim()) {
            onSelect(customWord.trim())
        }
    }

    // Aplicar frase corregida completa
    const handleApplyCorrectedSentence = useCallback(() => {
        if (correctedSentence && correctedSentence !== sentenceContext) {
            // Aquí podrías emitir un evento especial para reemplazar toda la frase
            // Por ahora solo cerramos el popover
            onClose()
        }
    }, [correctedSentence, sentenceContext, onClose])

    if (!isOpen) return null

    const confidencePercent = Math.round(confidence * 100)
    const confidenceColor = confidence >= 0.85 ? '#059669' : confidence >= 0.7 ? '#D97706' : '#DC2626'

    const typeLabels: Record<string, { label: string; color: string; icon: string }> = {
        pregunta: { label: 'PREGUNTA', color: '#2563EB', icon: '?' },
        afirmación: { label: 'AFIRMACIÓN', color: '#059669', icon: '.' },
        respuesta: { label: 'RESPUESTA', color: '#7C3AED', icon: '→' },
        declaración: { label: 'DECLARACIÓN', color: '#DC2626', icon: '!' },
    }
    const typeInfo = typeLabels[detectedType] || typeLabels.afirmación

    // Resaltar la palabra en el contexto
    const highlightWord = (text: string, word: string) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi')
        return text.replace(regex, `<mark style="background: #FEF3C7; padding: 1px 4px; border-radius: 3px; font-weight: 600;">${word}</mark>`)
    }

    return (
        <div
            ref={popoverRef}
            style={{
                position: 'fixed',
                left: `${Math.min(position.x, window.innerWidth - 440)}px`,
                top: `${Math.min(position.y + 10, window.innerHeight - 500)}px`,
                zIndex: 1000,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '12px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
                padding: '0',
                minWidth: '400px',
                maxWidth: '460px',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-subtle)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: `${typeInfo.color}15`,
                        color: typeInfo.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                    }}>
                        {typeInfo.icon}
                    </div>
                    <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Análisis de Palabra
                        </div>
                        <div style={{ fontSize: '10px', color: typeInfo.color, fontWeight: 600 }}>
                            {typeInfo.label}
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '4px',
                        fontSize: '16px',
                    }}
                >
                    ✕
                </button>
            </div>

            <div style={{ padding: '16px' }}>
                {/* Contexto de la frase */}
                {sentenceContext && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700 }}>
                            FRASE ORIGINAL
                        </div>
                        <div
                            style={{
                                background: 'var(--bg-primary)',
                                padding: '12px 14px',
                                borderRadius: '8px',
                                fontSize: '14px',
                                lineHeight: '1.7',
                                color: 'var(--text-primary)',
                                borderLeft: `3px solid ${confidenceColor}`,
                            }}
                            dangerouslySetInnerHTML={{ __html: highlightWord(sentenceContext, originalWord) }}
                        />
                    </div>
                )}

                {/* Palabra y confianza */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                    padding: '10px 14px',
                    background: `${confidenceColor}08`,
                    borderRadius: '8px',
                    border: `1px solid ${confidenceColor}20`,
                }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        PALABRA:
                    </span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        &quot;{originalWord}&quot;
                    </span>
                    <span style={{
                        fontSize: '12px',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: confidenceColor,
                        color: 'white',
                        fontWeight: 700,
                    }}>
                        {confidencePercent}%
                    </span>
                </div>

                {/* Estado de análisis IA */}
                {isAnalyzing && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 14px',
                        background: 'var(--bg-primary)',
                        borderRadius: '8px',
                        marginBottom: '16px',
                    }}>
                        <div className="skeleton-shimmer" style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                        }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Analizando contexto con IA...
                        </span>
                    </div>
                )}

                {/* Explicación de IA */}
                {aiResult?.explanation && !aiResult.is_correct && (
                    <div style={{
                        padding: '10px 14px',
                        background: '#FEF3C7',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        fontSize: '13px',
                        color: '#92400E',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                    }}>
                        <span style={{ fontSize: '16px' }}>💡</span>
                        <span>{aiResult.explanation}</span>
                    </div>
                )}

                {/* Palabra correcta según IA */}
                {aiResult?.is_correct && (
                    <div style={{
                        padding: '10px 14px',
                        background: '#D1FAE5',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        fontSize: '13px',
                        color: '#065F46',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <span style={{ fontSize: '16px' }}>✓</span>
                        <span>La IA confirma que &quot;{originalWord}&quot; es correcta en este contexto</span>
                    </div>
                )}

                {/* Sugerencias */}
                {allSuggestions.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700 }}>
                            SUGERENCIAS DE CORRECCIÓN
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {allSuggestions.map((sug, index) => (
                                <button
                                    key={index}
                                    onClick={() => onSelect(sug.word)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    onMouseLeave={() => setSelectedIndex(null)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '10px 14px',
                                        background: selectedIndex === index ? 'var(--accent-soft)' : 'var(--bg-primary)',
                                        border: selectedIndex === index ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        textAlign: 'left',
                                        gap: '12px',
                                    }}
                                >
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        background: selectedIndex === index ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                        color: selectedIndex === index ? 'white' : 'var(--text-muted)',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        {index + 1}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {sug.word}
                                        </div>
                                        {sug.reason && (
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {sug.reason}
                                            </div>
                                        )}
                                    </div>
                                    <span style={{
                                        fontSize: '11px',
                                        color: 'var(--text-muted)',
                                        background: 'var(--bg-secondary)',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                    }}>
                                        {Math.round(sug.confidence * 100)}%
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Frase corregida completa */}
                {aiResult && correctedSentence !== sentenceContext && (
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700 }}>
                            FRASE CORREGIDA
                        </div>
                        <div style={{
                            background: '#D1FAE5',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            lineHeight: '1.7',
                            color: '#065F46',
                            borderLeft: '3px solid #059669',
                        }}>
                            {correctedSentence}
                        </div>
                    </div>
                )}

                {/* Input manual */}
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 700 }}>
                        CORRECCIÓN MANUAL
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={customWord}
                            onChange={(e) => setCustomWord(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                            placeholder="Escribir palabra correcta..."
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-default)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                            }}
                        />
                        <button
                            onClick={handleCustomSubmit}
                            disabled={!customWord.trim()}
                            style={{
                                padding: '10px 20px',
                                background: customWord.trim() ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                color: customWord.trim() ? 'white' : 'var(--text-muted)',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: customWord.trim() ? 'pointer' : 'not-allowed',
                            }}
                        >
                            Aplicar
                        </button>
                    </div>
                </div>

                {/* Botón de aceptar */}
                <button
                    onClick={onAccept}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: 'var(--bg-primary)',
                        border: '2px solid var(--success)',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: 'var(--success)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                    }}
                >
                    <span>✓</span>
                    <span>Aceptar &quot;{originalWord}&quot; como correcta</span>
                </button>
            </div>

            {/* Footer con atajos */}
            <div style={{
                padding: '10px 16px',
                background: 'var(--bg-secondary)',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '10px',
                color: 'var(--text-muted)',
                display: 'flex',
                gap: '16px',
            }}>
                <span><b>1-5</b> Seleccionar</span>
                <span><b>Enter</b> Confirmar</span>
                <span><b>Esc</b> Cerrar</span>
            </div>
        </div>
    )
}
