'use client'

/**
 * SuggestionPopover — Popover para sugerencias del diccionario jurídico.
 * 
 * Muestra correcciones detectadas automáticamente por el motor fuzzy matching.
 * Tab = aceptar, Esc = rechazar.
 */

import { useEffect, useRef, useCallback } from 'react'

export interface DictionarySuggestion {
    id: string
    segmentOrder: number
    originalWord: string
    suggestedWord: string
    confidence: number
    category: string
    context: string
    position: { start: number; end: number }
    status: 'pending' | 'accepted' | 'rejected'
}

interface SuggestionPopoverProps {
    suggestion: DictionarySuggestion
    position: { x: number; y: number }
    onAccept: (suggestion: DictionarySuggestion) => void
    onReject: (suggestion: DictionarySuggestion) => void
    onClose: () => void
    isOpen: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
    procesal: 'Procesal',
    penal: 'Penal',
    medida_cautelar: 'Medida Cautelar',
    sujetos: 'Sujetos Procesales',
    principio: 'Principio',
    normativo: 'Normativo',
    institucional: 'Institucional',
    impugnacion: 'Impugnación',
    probatorio: 'Probatorio',
    penitenciario: 'Penitenciario',
    general: 'General',
}

export default function SuggestionPopover({
    suggestion,
    position,
    onAccept,
    onReject,
    onClose,
    isOpen,
}: SuggestionPopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null)

    // Keyboard handler
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!isOpen) return
        if (e.key === 'Tab') {
            e.preventDefault()
            onAccept(suggestion)
        } else if (e.key === 'Escape') {
            e.preventDefault()
            onReject(suggestion)
        }
    }, [isOpen, suggestion, onAccept, onReject])

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const confidencePercent = Math.round(suggestion.confidence * 100)
    const categoryLabel = CATEGORY_LABELS[suggestion.category] || suggestion.category

    return (
        <div
            ref={popoverRef}
            className="suggestion-popover"
            style={{
                position: 'fixed',
                top: `${position.y}px`,
                left: `${position.x}px`,
                zIndex: 50,
            }}
        >
            {/* Header */}
            <div className="suggestion-popover__header">
                <span className="suggestion-popover__badge">{categoryLabel}</span>
                <span className="suggestion-popover__confidence">{confidencePercent}%</span>
            </div>

            {/* Body */}
            <div className="suggestion-popover__body">
                <div className="suggestion-popover__correction">
                    <span className="suggestion-popover__original">{suggestion.originalWord}</span>
                    <span className="suggestion-popover__arrow">→</span>
                    <span className="suggestion-popover__suggested">{suggestion.suggestedWord}</span>
                </div>
                {suggestion.context && (
                    <p className="suggestion-popover__context">{suggestion.context}</p>
                )}
            </div>

            {/* Actions */}
            <div className="suggestion-popover__actions">
                <button
                    onClick={() => onAccept(suggestion)}
                    className="suggestion-popover__btn suggestion-popover__btn--accept"
                >
                    Aceptar <kbd>Tab</kbd>
                </button>
                <button
                    onClick={() => onReject(suggestion)}
                    className="suggestion-popover__btn suggestion-popover__btn--reject"
                >
                    Rechazar <kbd>Esc</kbd>
                </button>
            </div>
        </div>
    )
}
