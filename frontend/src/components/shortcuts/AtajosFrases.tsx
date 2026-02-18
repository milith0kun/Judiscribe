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

    const cargarFrases = useCallback(async () => {
        try {
            const { data } = await api.get('/api/frases')
            setFrases(data)
        } catch (err) {
            console.error('Error cargando frases:', err)
        }
    }, [])

    useEffect(() => {
        if (!modoDemo) {
            cargarFrases()
        } else if (frasesIniciales.length > 0) {
            setFrases(frasesIniciales)
        }
    }, [modoDemo, frasesIniciales, cargarFrases])

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

    // Registrar atajos de teclado Ctrl+[0-9]
    useEffect(() => {
        if (!habilitado) return

        const manejarTecla = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key >= '0' && e.key <= '9') {
                const numero = parseInt(e.key, 10)
                const frase = frases.find((f) => f.numero_atajo === numero)

                if (frase) {
                    e.preventDefault() // Solo prevenir si encontramos una frase asociada
                    insertarFrase(frase)
                }
            }
        }

        window.addEventListener('keydown', manejarTecla)
        return () => window.removeEventListener('keydown', manejarTecla)
    }, [habilitado, frases, insertarFrase])

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
                <h3
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--accent-gold)' }}
                >
                    Cláusulas Rápidas
                </h3>
                <button
                    onClick={() => setMostrarPanel(!mostrarPanel)}
                    className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border border-border-subtle hover:border-accent-gold transition-colors"
                    style={{
                        background: 'var(--bg-surface)',
                        color: 'var(--text-muted)',
                    }}
                >
                    {mostrarPanel ? 'Contraer' : 'Expandir'}
                </button>
            </div>

            {mostrarPanel && (
                <div className="space-y-1">
                    {frases.map((frase) => (
                        <button
                            key={frase.id}
                            onClick={() => insertarFrase(frase)}
                            className="w-full text-left px-3 py-3 rounded-[1px] transition-all group border-b border-border-subtle/20 hover:bg-white"
                            style={{
                                background:
                                    ultimaInsertada === frase.codigo
                                        ? 'rgba(27, 67, 50, 0.05)'
                                        : 'var(--bg-primary)',
                                borderLeft: `2px solid ${ultimaInsertada === frase.codigo
                                    ? 'var(--success)'
                                    : 'transparent'
                                    }`,
                            }}
                        >
                            <div className="flex items-center gap-3 mb-1">
                                <kbd
                                    className="px-1.5 py-0.5 text-[9px] font-bold shrink-0 border border-border-subtle"
                                    style={{
                                        background: 'var(--bg-surface)',
                                        color: 'var(--text-primary)',
                                    }}
                                >
                                    CTRL+{frase.numero_atajo}
                                </kbd>
                                <span
                                    className="text-[10px] font-black uppercase tracking-widest shrink-0"
                                    style={{ color: 'var(--accent-gold)' }}
                                >
                                    {frase.codigo}
                                </span>
                            </div>
                            <p
                                className="text-[11px] font-medium leading-relaxed italic line-clamp-2"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                &ldquo;{frase.texto}&rdquo;
                            </p>
                        </button>
                    ))}
                </div>
            )}

            {!mostrarPanel && (
                <p className="text-[10px] font-medium leading-relaxed opacity-60" style={{ color: 'var(--text-muted)' }}>
                    Utilice la combinación de teclas <span className="font-bold">Ctrl + [0-9]</span> para la inserción automatizada de protocolos judiciales.
                </p>
            )}

            {/* Feedback de inserción */}
            {ultimaInsertada && (
                <div
                    className="mt-4 px-3 py-2 text-[10px] font-bold uppercase tracking-widest animate-fade-in border-l-2 border-success"
                    style={{
                        background: 'rgba(27, 67, 50, 0.05)',
                        color: 'var(--success)',
                    }}
                >
                    Cláusula {ultimaInsertada} Insertada
                </div>
            )}
        </div>
    )
}
