'use client'

/**
 * AtajosFrases — Componente para atajos de teclado Ctrl+[0-9].
 * 
 * Inserta frases estándar predefinidas en el Canvas.
 * Las frases con {FECHA} y {HORA} se reemplazan dinámicamente.
 */
import { useEffect, useState, useCallback } from 'react'
import api from '@/lib/api'

interface Frase {
    id: string
    numero_atajo: number
    codigo: string
    texto: string
    categoria: string
}

interface AtajosFrasesProps {
    /** Callback para insertar texto en el Canvas */
    onInsertarFrase: (texto: string) => void
    /** Si true, los atajos están habilitados */
    habilitado?: boolean
    /** Modo demo: sin API */
    modoDemo?: boolean
    /** Frases iniciales para demo */
    frasesIniciales?: Frase[]
}

export default function AtajosFrases({
    onInsertarFrase,
    habilitado = true,
    modoDemo = false,
    frasesIniciales = [],
}: AtajosFrasesProps) {
    const [frases, setFrases] = useState<Frase[]>(frasesIniciales)
    const [mostrarPanel, setMostrarPanel] = useState(false)
    const [ultimaInsertada, setUltimaInsertada] = useState<string | null>(null)

    useEffect(() => {
        if (!modoDemo) {
            cargarFrases()
        } else if (frasesIniciales.length > 0) {
            setFrases(frasesIniciales)
        }
    }, [modoDemo, frasesIniciales])

    // Registrar atajos de teclado Ctrl+[0-9]
    useEffect(() => {
        if (!habilitado) return

        const manejarTecla = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key >= '0' && e.key <= '9') {
                // ... lógica existente ...
                e.preventDefault()
                const numero = parseInt(e.key, 10)
                const frase = frases.find((f) => f.numero_atajo === numero)
                if (frase) {
                    insertarFrase(frase) // Declared below, safer to move logic or assume hoisting works (it does with var/function, but here it depends on closure scope)
                    // Better to just call the insertion logic directly or ensure safe reference
                    handleInsertion(frase)
                }
            }
        }

        window.addEventListener('keydown', manejarTecla)
        return () => window.removeEventListener('keydown', manejarTecla)
    }, [habilitado, frases])

    const cargarFrases = async () => {
        try {
            const { data } = await api.get('/api/frases')
            const insertarFrase = useCallback(
                (frase: Frase) => {
                    // Reemplazar placeholders dinámicos
                    const ahora = new Date()
                    const textoFinal = frase.texto
                        .replace('{FECHA}', ahora.toLocaleDateString('es-PE', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                        }).toUpperCase())
                        .replace('{HORA}', ahora.toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit',
                        }))

                    onInsertarFrase(textoFinal)
                    setUltimaInsertada(frase.codigo)

                    // Feedback visual temporal
                    setTimeout(() => setUltimaInsertada(null), 2000)
                },
                [onInsertarFrase]
            )

            return (
                <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3
                            className="text-xs font-semibold uppercase tracking-wider"
                            style={{ color: 'var(--accent-gold)' }}
                        >
                            ⌨️ Frases rápidas
                        </h3>
                        <button
                            onClick={() => setMostrarPanel(!mostrarPanel)}
                            className="text-[10px] px-2 py-0.5 rounded"
                            style={{
                                background: 'var(--bg-surface)',
                                color: 'var(--text-muted)',
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            {mostrarPanel ? 'Ocultar' : 'Mostrar'}
                        </button>
                    </div>

                    {mostrarPanel && (
                        <div className="space-y-1">
                            {frases.map((frase) => (
                                <button
                                    key={frase.id}
                                    onClick={() => insertarFrase(frase)}
                                    className="w-full text-left px-3 py-2 rounded-lg transition-all hover:brightness-110 group"
                                    style={{
                                        background:
                                            ultimaInsertada === frase.codigo
                                                ? 'rgba(34, 197, 94, 0.1)'
                                                : 'var(--bg-surface)',
                                        border: `1px solid ${ultimaInsertada === frase.codigo
                                            ? 'rgba(34, 197, 94, 0.3)'
                                            : 'transparent'
                                            }`,
                                    }}
                                >
                                    <div className="flex items-center gap-2">
                                        <kbd
                                            className="px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0"
                                            style={{
                                                background: 'var(--bg-primary)',
                                                color: 'var(--text-secondary)',
                                            }}
                                        >
                                            Ctrl+{frase.numero_atajo}
                                        </kbd>
                                        <span
                                            className="text-[10px] font-medium shrink-0"
                                            style={{ color: 'var(--accent-gold)' }}
                                        >
                                            {frase.codigo}
                                        </span>
                                    </div>
                                    <p
                                        className="text-[10px] mt-1 leading-tight line-clamp-2"
                                        style={{ color: 'var(--text-muted)' }}
                                    >
                                        {frase.texto}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}

                    {!mostrarPanel && (
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            Usa Ctrl+[0-9] para insertar frases rápidas.
                        </p>
                    )}

                    {/* Feedback de inserción */}
                    {ultimaInsertada && (
                        <div
                            className="mt-2 px-3 py-1.5 rounded-lg text-[10px] animate-fade-in"
                            style={{
                                background: 'rgba(34, 197, 94, 0.1)',
                                color: '#4ADE80',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                            }}
                        >
                            ✓ {ultimaInsertada} insertada
                        </div>
                    )}
                </div>
            )
        }
