'use client'

/**
 * DictionaryPanel — Panel lateral de diccionario jurídico.
 * 
 * Sprint 3: Búsqueda de términos jurídicos + historial de sugerencias.
 */

import { useState, useCallback, useMemo } from 'react'
import type { DictionarySuggestion } from '@/components/canvas/SuggestionPopover'

interface DictionaryPanelProps {
    suggestions: DictionarySuggestion[]
    onAcceptSuggestion: (suggestion: DictionarySuggestion) => void
    onRejectSuggestion: (suggestion: DictionarySuggestion) => void
}

// Subset of the legal corpus for client-side search
const QUICK_TERMS = [
    { termino: 'sobreseimiento', categoria: 'procesal', contexto: 'Archivo definitivo de causa penal' },
    { termino: 'prisión preventiva', categoria: 'medida_cautelar', contexto: 'Medida de coerción personal' },
    { termino: 'terminación anticipada', categoria: 'procesal', contexto: 'Acuerdo entre fiscal e imputado' },
    { termino: 'conclusión anticipada', categoria: 'procesal', contexto: 'Aceptación de cargos en juicio' },
    { termino: 'reparación civil', categoria: 'penal', contexto: 'Indemnización al agraviado' },
    { termino: 'acusación fiscal', categoria: 'procesal', contexto: 'Requerimiento del Ministerio Público' },
    { termino: 'sentencia condenatoria', categoria: 'resolucion', contexto: 'Decisión judicial de culpabilidad' },
    { termino: 'sentencia absolutoria', categoria: 'resolucion', contexto: 'Decisión judicial de inocencia' },
    { termino: 'peligro de fuga', categoria: 'medida_cautelar', contexto: 'Riesgo de evasión procesal' },
    { termino: 'presunción de inocencia', categoria: 'principio', contexto: 'Garantía fundamental del procesado' },
    { termino: 'juicio oral', categoria: 'procesal', contexto: 'Etapa de juzgamiento' },
    { termino: 'recurso de apelación', categoria: 'impugnacion', contexto: 'Impugnación ante instancia superior' },
    { termino: 'debido proceso', categoria: 'principio', contexto: 'Garantía procesal fundamental' },
    { termino: 'comparecencia restringida', categoria: 'medida_cautelar', contexto: 'Medida cautelar alternativa' },
    { termino: 'oralización de pruebas', categoria: 'procesal', contexto: 'Lectura formal de medios probatorios' },
    { termino: 'cadena de custodia', categoria: 'probatorio', contexto: 'Trazabilidad de evidencia' },
    { termino: 'imputación necesaria', categoria: 'penal', contexto: 'Nivel mínimo de detalle en la acusación' },
    { termino: 'videoconferencia', categoria: 'procesal', contexto: 'Audiencia virtual' },
    { termino: 'acta de audiencia', categoria: 'procesal', contexto: 'Registro escrito de la sesión' },
    { termino: 'colaboración eficaz', categoria: 'procesal', contexto: 'Cooperación del imputado a cambio de beneficios' },
]

const CATEGORY_COLORS: Record<string, string> = {
    procesal: '#2563EB',
    penal: '#DC2626',
    medida_cautelar: '#D97706',
    sujetos: '#7C3AED',
    principio: '#059669',
    normativo: '#0891B2',
    institucional: '#4F46E5',
    impugnacion: '#BE185D',
    probatorio: '#16A34A',
    resolucion: '#1D4ED8',
}

export default function DictionaryPanel({
    suggestions,
    onAcceptSuggestion,
    onRejectSuggestion,
}: DictionaryPanelProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState<'search' | 'suggestions'>('suggestions')

    const filteredTerms = useMemo(() => {
        if (!searchQuery.trim()) return QUICK_TERMS.slice(0, 8)
        const q = searchQuery.toLowerCase()
        return QUICK_TERMS.filter(t =>
            t.termino.toLowerCase().includes(q) ||
            t.contexto.toLowerCase().includes(q)
        )
    }, [searchQuery])

    const pendingSuggestions = useMemo(
        () => suggestions.filter(s => s.status === 'pending'),
        [suggestions]
    )

    const handleAccept = useCallback((s: DictionarySuggestion) => {
        onAcceptSuggestion(s)
    }, [onAcceptSuggestion])

    const handleReject = useCallback((s: DictionarySuggestion) => {
        onRejectSuggestion(s)
    }, [onRejectSuggestion])

    return (
        <div className="p-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                    Diccionario Jurídico
                </h3>
                {pendingSuggestions.length > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-sm"
                        style={{ background: 'rgba(230, 126, 34, 0.1)', color: '#E67E22' }}>
                        {pendingSuggestions.length}
                    </span>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-3">
                {[
                    { key: 'suggestions' as const, label: 'Sugerencias' },
                    { key: 'search' as const, label: 'Búsqueda' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                        style={{
                            background: activeTab === tab.key ? 'var(--text-primary)' : 'transparent',
                            color: activeTab === tab.key ? 'var(--bg-primary)' : 'var(--text-muted)',
                            border: `1px solid ${activeTab === tab.key ? 'var(--text-primary)' : 'var(--border-default)'}`,
                            borderRadius: '1px',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Search Tab */}
            {activeTab === 'search' && (
                <div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar término..."
                        className="w-full px-3 py-2 text-xs mb-3"
                        style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-default)',
                            borderRadius: '1px',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-body)',
                            outline: 'none',
                        }}
                    />
                    <div className="space-y-1 max-h-[300px] overflow-y-auto">
                        {filteredTerms.map((term, i) => (
                            <div key={i} className="p-2 transition-colors hover:opacity-80"
                                style={{
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '1px',
                                    borderLeft: `3px solid ${CATEGORY_COLORS[term.categoria] || 'var(--text-muted)'}`,
                                }}>
                                <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {term.termino}
                                </div>
                                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                    {term.contexto}
                                </div>
                            </div>
                        ))}
                        {filteredTerms.length === 0 && (
                            <p className="text-[10px] text-center py-4" style={{ color: 'var(--text-muted)' }}>
                                Sin resultados
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Suggestions Tab */}
            {activeTab === 'suggestions' && (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {suggestions.length === 0 ? (
                        <div className="text-center py-6">
                            <div className="text-lg mb-2 opacity-20">📖</div>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                Las sugerencias del diccionario aparecerán aquí durante la transcripción
                            </p>
                        </div>
                    ) : (
                        suggestions.map(s => (
                            <div key={s.id} className="p-2 transition-all"
                                style={{
                                    background: s.status === 'pending' ? 'rgba(230, 126, 34, 0.04)' : 'var(--bg-surface)',
                                    border: `1px solid ${s.status === 'pending' ? 'rgba(230, 126, 34, 0.2)' : 'var(--border-subtle)'}`,
                                    borderRadius: '1px',
                                    opacity: s.status === 'rejected' ? 0.5 : 1,
                                }}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] line-through" style={{ color: 'var(--danger)' }}>
                                            {s.originalWord}
                                        </span>
                                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>→</span>
                                        <span className="text-[10px] font-bold" style={{ color: 'var(--success)' }}>
                                            {s.suggestedWord}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-bold px-1 py-0.5"
                                        style={{
                                            color: s.status === 'accepted' ? 'var(--success)' :
                                                s.status === 'rejected' ? 'var(--danger)' : '#E67E22',
                                            background: s.status === 'accepted' ? 'rgba(27, 67, 50, 0.08)' :
                                                s.status === 'rejected' ? 'rgba(155, 34, 38, 0.08)' : 'rgba(230, 126, 34, 0.08)',
                                            borderRadius: '1px',
                                        }}>
                                        {s.status === 'accepted' ? '✓' : s.status === 'rejected' ? '✗' : '●'}
                                    </span>
                                </div>

                                {s.status === 'pending' && (
                                    <div className="flex gap-1 mt-1.5">
                                        <button
                                            onClick={() => handleAccept(s)}
                                            className="flex-1 text-[9px] font-bold py-1 uppercase tracking-wider transition-colors"
                                            style={{
                                                background: 'var(--success)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '1px',
                                                cursor: 'pointer',
                                            }}>
                                            Aceptar
                                        </button>
                                        <button
                                            onClick={() => handleReject(s)}
                                            className="flex-1 text-[9px] font-bold py-1 uppercase tracking-wider transition-colors"
                                            style={{
                                                background: 'transparent',
                                                color: 'var(--text-muted)',
                                                border: '1px solid var(--border-default)',
                                                borderRadius: '1px',
                                                cursor: 'pointer',
                                            }}>
                                            Ignorar
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
