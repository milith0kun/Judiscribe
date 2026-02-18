'use client'

/**
 * PanelHablantes — Panel lateral para gestionar los hablantes de una audiencia.
 * 
 * Muestra los speaker_id detectados automáticamente por Deepgram y permite
 * al digitador asignar roles judiciales (juez, fiscal, defensa, etc.).
 * Al cambiar el rol, la etiqueta y color se propagan al Canvas.
 */
import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'
import { SPEAKER_ROLES, type SpeakerRole } from '@/types'

interface Hablante {
    id: string
    speaker_id: string
    rol: string
    etiqueta: string
    nombre: string | null
    color: string
    orden: number
    auto_detectado: boolean
}

interface PanelHablantesProps {
    audienciaId: string
    /** IDs de speakers detectados en la sesión actual */
    speakersDetectados: string[]
    /** Callback cuando se actualiza un hablante */
    onHablanteActualizado?: (hablante: Hablante) => void
}

export default function PanelHablantes({
    audienciaId,
    speakersDetectados,
    onHablanteActualizado,
}: PanelHablantesProps) {
    const [hablantes, setHablantes] = useState<Hablante[]>([])
    const [editando, setEditando] = useState<string | null>(null)
    const [cargando, setCargando] = useState(false)

    // Cargar hablantes existentes
    useEffect(() => {
        cargarHablantes()
    }, [audienciaId])

    // Auto-crear hablantes cuando se detectan nuevos speakers
    useEffect(() => {
        const idsExistentes = hablantes.map((h) => h.speaker_id)
        const nuevos = speakersDetectados.filter((id) => !idsExistentes.includes(id))

        if (nuevos.length > 0) {
            Promise.all(
                nuevos.map((speakerId) =>
                    api.post(`/api/audiencias/${audienciaId}/hablantes`, {
                        speaker_id: speakerId,
                        rol: 'otro',
                        orden: hablantes.length + nuevos.indexOf(speakerId),
                    })
                )
            ).then(() => cargarHablantes())
        }
    }, [speakersDetectados, hablantes, audienciaId])

    const cargarHablantes = async () => {
        try {
            const { data } = await api.get(`/api/audiencias/${audienciaId}/hablantes`)
            setHablantes(data)
        } catch (err) {
            console.error('Error cargando hablantes:', err)
        }
    }

    const actualizarRol = async (hablanteId: string, nuevoRol: string) => {
        setCargando(true)
        try {
            const { data } = await api.put(
                `/api/audiencias/${audienciaId}/hablantes/${hablanteId}`,
                { rol: nuevoRol }
            )
            setHablantes((prev) =>
                prev.map((h) => (h.id === hablanteId ? data : h))
            )
            onHablanteActualizado?.(data)
            setEditando(null)
        } catch (err) {
            console.error('Error actualizando hablante:', err)
        } finally {
            setCargando(false)
        }
    }

    const actualizarNombre = async (hablanteId: string, nombre: string) => {
        try {
            const { data } = await api.put(
                `/api/audiencias/${audienciaId}/hablantes/${hablanteId}`,
                { nombre }
            )
            setHablantes((prev) =>
                prev.map((h) => (h.id === hablanteId ? data : h))
            )
        } catch (err) {
            console.error('Error actualizando nombre:', err)
        }
    }

    return (
        <div className="p-4 space-y-3">
            <h3
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--text-muted)' }}
            >
                Hablantes <span style={{ color: 'var(--accent-primary)' }}>({hablantes.length})</span>
            </h3>

            {hablantes.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Los hablantes aparecerán aquí cuando Deepgram los detecte.
                </p>
            ) : (
                <div className="space-y-2">
                    {hablantes.map((h) => (
                        <div
                            key={h.id}
                            className="rounded-xl p-3 transition-all"
                            style={{
                                background: 'var(--bg-surface)',
                                border: editando === h.id
                                    ? `1px solid ${h.color}`
                                    : '1px solid var(--border-subtle)',
                            }}
                        >
                            {/* Encabezado: color dot + speaker_id */}
                            <div className="flex items-center gap-2 mb-2">
                                <span
                                    className="w-3 h-3 rounded-full shrink-0"
                                    style={{ background: h.color }}
                                />
                                <span
                                    className="text-xs font-mono font-medium"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {h.speaker_id}
                                </span>
                                {h.auto_detectado && (
                                    <span
                                        className="text-[10px] px-1.5 py-0.5 rounded"
                                        style={{
                                            background: 'rgba(212, 168, 83, 0.1)',
                                            color: 'var(--accent-gold)',
                                        }}
                                    >
                                        auto
                                    </span>
                                )}
                            </div>

                            {/* Selector de rol */}
                            <select
                                value={h.rol}
                                onChange={(e) => actualizarRol(h.id, e.target.value)}
                                onFocus={() => setEditando(h.id)}
                                onBlur={() => setEditando(null)}
                                disabled={cargando}
                                className="w-full px-2 py-1.5 rounded-lg text-xs outline-none mb-2"
                                style={{
                                    background: 'var(--bg-primary)',
                                    border: '1px solid var(--border-default)',
                                    color: 'var(--text-primary)',
                                }}
                            >
                                {SPEAKER_ROLES.map((rol) => (
                                    <option key={rol.id} value={rol.rol.toLowerCase().replace(/ /g, '_')}>
                                        {rol.rol}
                                    </option>
                                ))}
                            </select>

                            {/* Nombre (editable) */}
                            <input
                                type="text"
                                value={h.nombre || ''}
                                onChange={(e) => actualizarNombre(h.id, e.target.value)}
                                placeholder="Nombre del participante..."
                                className="w-full px-2 py-1 rounded text-xs outline-none"
                                style={{
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    borderBottom: '1px solid var(--border-subtle)',
                                }}
                            />

                            {/* Etiqueta que aparece en Canvas */}
                            <p
                                className="text-[10px] mt-1.5 font-semibold uppercase"
                                style={{ color: h.color }}
                            >
                                {h.etiqueta}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
