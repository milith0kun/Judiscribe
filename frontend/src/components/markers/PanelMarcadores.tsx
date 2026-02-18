'use client'

/**
 * PanelMarcadores — Panel de marcadores temporales (Ctrl+M).
 *
 * UI Minimalista: indicadores geométricos en lugar de emojis.
 *
 * Los marcadores señalan momentos importantes de la audiencia
 * que el digitador quiere revisar posteriormente.
 */
import React, { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { useCanvasStore } from '@/stores/canvasStore'

interface Marcador {
    id: string
    timestamp: number
    nota: string | null
    tipo: string
    created_at: string
}

interface PanelMarcadoresProps {
    audienciaId: string
    onSeekAudio?: (timestamp: number) => void
}

// Indicadores visuales minimalistas (sin emojis)
const TIPOS_MARCADOR = {
    revision: { forma: 'circle', etiqueta: 'Revisión', color: '#D97706' },
    importante: { forma: 'star', etiqueta: 'Importante', color: '#2563EB' },
    error: { forma: 'triangle', etiqueta: 'Error', color: '#DC2626' },
    pregunta: { forma: 'diamond', etiqueta: 'Pregunta', color: '#7C3AED' },
}

// Componente para renderizar formas geométricas
const MarkerShape = ({ forma, color, size = 12 }: { forma: string; color: string; size?: number }) => {
    const style: React.CSSProperties = {
        display: 'inline-block',
        width: size,
        height: size,
        flexShrink: 0,
    }

    switch (forma) {
        case 'circle':
            return <span style={{ ...style, background: color, borderRadius: '50%' }} />
        case 'star':
            return <span style={{ ...style, background: color, borderRadius: '2px', transform: 'rotate(45deg)' }} />
        case 'triangle':
            return (
                <span style={{
                    ...style,
                    width: 0,
                    height: 0,
                    borderLeft: `${size / 2}px solid transparent`,
                    borderRight: `${size / 2}px solid transparent`,
                    borderBottom: `${size}px solid ${color}`,
                }} />
            )
        case 'diamond':
            return <span style={{ ...style, background: color, transform: 'rotate(45deg)', borderRadius: '2px' }} />
        default:
            return <span style={{ ...style, background: color, borderRadius: '2px' }} />
    }
}

export default function PanelMarcadores({
    audienciaId,
    onSeekAudio,
}: PanelMarcadoresProps) {
    const [marcadores, setMarcadores] = useState<Marcador[]>([])
    const [nuevaNota, setNuevaNota] = useState('')
    const [tipoSeleccionado, setTipoSeleccionado] = useState('revision')
    const [mostrarFormulario, setMostrarFormulario] = useState(false)
    const { elapsedSeconds } = useCanvasStore()

    useEffect(() => {
        cargarMarcadores()
    }, [audienciaId])

    // Atajo de teclado Ctrl+M
    useEffect(() => {
        const manejarTecla = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'm') {
                e.preventDefault()
                crearMarcadorRapido()
            }
        }
        window.addEventListener('keydown', manejarTecla)
        return () => window.removeEventListener('keydown', manejarTecla)
    }, [elapsedSeconds])

    const cargarMarcadores = async () => {
        try {
            const { data } = await api.get(`/api/audiencias/${audienciaId}/marcadores`)
            setMarcadores(data)
        } catch (err) {
            console.error('Error cargando marcadores:', err)
        }
    }

    const crearMarcadorRapido = async () => {
        try {
            const { data } = await api.post(`/api/audiencias/${audienciaId}/marcadores`, {
                timestamp: elapsedSeconds,
                tipo: 'revision',
                nota: null,
            })
            setMarcadores((prev) => [...prev, data])
        } catch (err) {
            console.error('Error creando marcador:', err)
        }
    }

    const crearMarcadorConNota = async () => {
        try {
            const { data } = await api.post(`/api/audiencias/${audienciaId}/marcadores`, {
                timestamp: elapsedSeconds,
                tipo: tipoSeleccionado,
                nota: nuevaNota || null,
            })
            setMarcadores((prev) => [...prev, data])
            setNuevaNota('')
            setMostrarFormulario(false)
        } catch (err) {
            console.error('Error creando marcador:', err)
        }
    }

    const eliminarMarcador = async (id: string) => {
        try {
            await api.delete(`/api/audiencias/${audienciaId}/marcadores/${id}`)
            setMarcadores((prev) => prev.filter((m) => m.id !== id))
        } catch (err) {
            console.error('Error eliminando marcador:', err)
        }
    }

    const formatearTiempo = (seg: number) => {
        const m = Math.floor(seg / 60).toString().padStart(2, '0')
        const s = Math.floor(seg % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-3">
                <h3
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                >
                    Marcadores <span style={{ color: 'var(--accent-primary)' }}>({marcadores.length})</span>
                </h3>
                <button
                    onClick={() => setMostrarFormulario(!mostrarFormulario)}
                    className="btn-secondary text-xs"
                >
                    <span style={{ fontSize: '14px', fontWeight: 300 }}>+</span>
                    Agregar
                </button>
            </div>

            {/* Formulario */}
            {mostrarFormulario && (
                <div
                    className="rounded-xl p-3 mb-3 space-y-3"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                    <div className="flex gap-2">
                        {Object.entries(TIPOS_MARCADOR).map(([tipo, config]) => (
                            <button
                                key={tipo}
                                onClick={() => setTipoSeleccionado(tipo)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                                style={{
                                    background: tipoSeleccionado === tipo ? `${config.color}15` : 'var(--bg-surface)',
                                    color: tipoSeleccionado === tipo ? config.color : 'var(--text-muted)',
                                    border: `1px solid ${tipoSeleccionado === tipo ? `${config.color}40` : 'var(--border-subtle)'}`,
                                }}
                            >
                                <MarkerShape forma={config.forma} color={tipoSeleccionado === tipo ? config.color : 'var(--text-muted)'} size={8} />
                                {config.etiqueta}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        value={nuevaNota}
                        onChange={(e) => setNuevaNota(e.target.value)}
                        placeholder="Nota opcional..."
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{
                            background: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-default)',
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && crearMarcadorConNota()}
                    />
                    <button
                        onClick={crearMarcadorConNota}
                        className="btn-primary w-full text-sm"
                    >
                        Crear marcador en {formatearTiempo(elapsedSeconds)}
                    </button>
                </div>
            )}

            {/* Lista de marcadores */}
            {marcadores.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Presiona <kbd className="px-1.5 py-0.5 rounded text-xs font-mono"
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>Ctrl+M</kbd>{' '}
                    para crear un marcador rápido.
                </p>
            ) : (
                <div className="space-y-2">
                    {marcadores.map((m) => {
                        const config = TIPOS_MARCADOR[m.tipo as keyof typeof TIPOS_MARCADOR] || TIPOS_MARCADOR.revision
                        return (
                            <div
                                key={m.id}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group"
                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
                                onClick={() => onSeekAudio?.(m.timestamp)}
                            >
                                <MarkerShape forma={config.forma} color={config.color} size={10} />
                                <span
                                    className="text-sm font-mono"
                                    style={{ color: config.color }}
                                >
                                    {formatearTiempo(m.timestamp)}
                                </span>
                                {m.nota && (
                                    <span className="text-sm truncate flex-1" style={{ color: 'var(--text-secondary)' }}>
                                        {m.nota}
                                    </span>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); eliminarMarcador(m.id) }}
                                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded transition-all"
                                    style={{ color: 'var(--text-muted)', background: 'var(--bg-elevated)' }}
                                >
                                    <span style={{ fontSize: '12px' }}>×</span>
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
