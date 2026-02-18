'use client'

/**
 * Página de transcripción de audiencia — Vista principal del Canvas.
 *
 * Sprint 2 — Layout 72/28:
 * - Izquierda: Canvas TipTap editable + controles + barra de estado
 * - Derecha: Info + Reproductor audio + Panel hablantes/marcadores/frases
 *
 * Wiring:
 * - Audio player → Canvas: highlight del segmento activo
 * - Canvas → Audio player: click en segmento salta al timestamp
 * - PanelHablantes → Canvas: al cambiar rol, etiqueta/color se propagan
 * - AtajosFrases → Canvas: inserción con Ctrl+[0-9]
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAudioCapture } from '@/hooks/useAudioCapture'
import { useDeepgramSocket } from '@/hooks/useDeepgramSocket'
import TranscriptionCanvas, { type TranscriptionCanvasHandle } from '@/components/canvas/TranscriptionCanvas'
import PanelHablantes from '@/components/speakers/PanelHablantes'
import ReproductorAudio, { type ReproductorAudioHandle } from '@/components/audio/ReproductorAudio'
import BarraEstado from '@/components/status/BarraEstado'
import PanelMarcadores from '@/components/markers/PanelMarcadores'
import AtajosFrases from '@/components/shortcuts/AtajosFrases'
import api from '@/lib/api'
import type { Audiencia } from '@/types'

/* ── Types ──────────────────────────────────────────── */

interface HablanteInfo {
    id: string
    speaker_id: string
    rol: string
    etiqueta: string
    nombre: string | null
    color: string
    orden: number
    auto_detectado: boolean
}

/* ── Component ──────────────────────────────────────── */

export default function PaginaTranscripcion() {
    const params = useParams()
    const router = useRouter()
    const audienciaId = params.id as string

    const [audiencia, setAudiencia] = useState<Audiencia | null>(null)
    const [fuenteAudio, setFuenteAudio] = useState<'microphone' | 'system'>('microphone')
    const [mostrarSelector, setMostrarSelector] = useState(true)
    const [pestanaSidebar, setPestanaSidebar] = useState<'hablantes' | 'marcadores' | 'frases'>('hablantes')
    const [hablantesData, setHablantesData] = useState<HablanteInfo[]>([])

    const {
        segments,
        isTranscribing,
        connectionStatus,
        setTranscribing,
        setElapsedSeconds,
        setCurrentAudioTime,
        setConnectionStatus,
        reset,
    } = useCanvasStore()

    const { isConnected, connect, sendAudio, stop, disconnect } = useDeepgramSocket(audienciaId)
    const { isCapturing, startCapture, stopCapture, error: errorAudio } = useAudioCapture({
        onAudioChunk: sendAudio,
    })

    const canvasRef = useRef<TranscriptionCanvasHandle>(null)
    const reproductorRef = useRef<ReproductorAudioHandle>(null)
    const temporizadorRef = useRef<NodeJS.Timeout | null>(null)

    /* ── Load audiencia ─────────────────────────────── */

    useEffect(() => {
        const cargar = async () => {
            try {
                const { data } = await api.get<Audiencia>(`/api/audiencias/${audienciaId}`)
                setAudiencia(data)
            } catch {
                router.push('/')
            }
        }
        cargar()
        return () => {
            reset()
            if (temporizadorRef.current) clearInterval(temporizadorRef.current)
        }
    }, [audienciaId, router, reset])

    /* ── Timer ──────────────────────────────────────── */

    useEffect(() => {
        if (isTranscribing) {
            temporizadorRef.current = setInterval(() => {
                setElapsedSeconds(useCanvasStore.getState().elapsedSeconds + 1)
            }, 1000)
        } else {
            if (temporizadorRef.current) clearInterval(temporizadorRef.current)
        }
        return () => {
            if (temporizadorRef.current) clearInterval(temporizadorRef.current)
        }
    }, [isTranscribing, setElapsedSeconds])

    /* ── Speaker IDs detected ──────────────────────── */

    const speakersDetectados = Array.from(new Set(segments.map(s => s.speaker_id)))

    /* ── Start/Stop transcription ──────────────────── */

    const iniciarTranscripcion = useCallback(async () => {
        setMostrarSelector(false)
        connect()
        setTimeout(async () => {
            await startCapture(fuenteAudio)
            setTranscribing(true)
        }, 500)
    }, [connect, startCapture, fuenteAudio, setTranscribing])

    const detenerTranscripcion = useCallback(() => {
        stopCapture()
        stop()
        setTranscribing(false)
    }, [stopCapture, stop, setTranscribing])

    /* ── Canvas ↔ Audio sync ───────────────────────── */

    // Canvas segment click → seek audio player
    const handleSeekAudio = useCallback((timestamp: number) => {
        reproductorRef.current?.seekTo(timestamp)
        reproductorRef.current?.play()
    }, [])

    // Audio player time update → highlight active segment in canvas
    const handleAudioTimeUpdate = useCallback((segundos: number) => {
        setCurrentAudioTime(segundos)
    }, [setCurrentAudioTime])

    // Debounced segment edit → save to API
    const handleSegmentoEditado = useCallback(async (id: string, texto: string) => {
        try {
            await api.put(`/api/audiencias/${audienciaId}/segmentos/${id}`, {
                texto_editado: texto,
            })
        } catch (error) {
            console.error('Error guardando segmento:', error)
        }
    }, [audienciaId])

    // PanelHablantes update → refresh labels in Canvas via re-render
    const handleHablanteActualizado = useCallback((hablante: HablanteInfo) => {
        setHablantesData(prev =>
            prev.map(h => (h.id === hablante.id ? hablante : h))
        )
    }, [])

    // Insert frase from sidebar
    const insertarFraseEnCanvas = useCallback((texto: string) => {
        canvasRef.current?.insertContent(texto)
    }, [])

    // Bookmark click → seek audio + scroll canvas
    const handleClickMarcador = useCallback((timestamp: number) => {
        reproductorRef.current?.seekTo(timestamp)
        reproductorRef.current?.play()
    }, [])

    /* ── Loading ────────────────────────────────────── */

    if (!audiencia) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
                <div
                    className="w-10 h-10 border-3 rounded-full animate-spin"
                    style={{ borderColor: 'var(--accent-gold)', borderTopColor: 'transparent' }}
                />
            </div>
        )
    }

    const audioUrl = audiencia.audio_path
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/audiencias/${audienciaId}/audio`
        : null

    /* ── Render ──────────────────────────────────────── */

    return (
        <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
            {/* ── Header ─────────────────────────────────── */}
            <header
                className="flex items-center justify-between px-6 py-3 shrink-0"
                style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}
            >
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/')}
                        className="text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:brightness-110"
                        style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                    >
                        ← Volver
                    </button>
                    <div>
                        <h1 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            {audiencia.expediente}
                        </h1>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {audiencia.tipo_audiencia} — {audiencia.juzgado}
                        </p>
                    </div>
                </div>

                {/* Connection status pill */}
                <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                    style={{
                        background:
                            connectionStatus === 'connected' ? 'rgba(34, 197, 94, 0.1)'
                                : connectionStatus === 'reconnecting' ? 'rgba(249, 115, 22, 0.1)'
                                    : 'rgba(148, 163, 184, 0.1)',
                        color:
                            connectionStatus === 'connected' ? '#4ADE80'
                                : connectionStatus === 'reconnecting' ? '#FB923C'
                                    : '#94A3B8',
                    }}
                >
                    <span
                        className="w-2 h-2 rounded-full"
                        style={{
                            background:
                                connectionStatus === 'connected' ? '#4ADE80'
                                    : connectionStatus === 'reconnecting' ? '#FB923C'
                                        : '#94A3B8',
                        }}
                    />
                    {connectionStatus === 'connected' ? 'Conectado'
                        : connectionStatus === 'reconnecting' ? 'Reconectando...'
                            : 'Desconectado'}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* ── Canvas (72%) ────────────────────────── */}
                <div className="flex-1 flex flex-col" style={{ width: '72%' }}>
                    {/* Audio source selector */}
                    {mostrarSelector && !isTranscribing && (
                        <div
                            className="px-6 py-4 flex items-center gap-4 shrink-0"
                            style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}
                        >
                            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                Fuente de audio:
                            </span>
                            <div className="flex gap-2">
                                {([
                                    { value: 'microphone' as const, label: '🎙️ Micrófono', desc: 'Audio directo' },
                                    { value: 'system' as const, label: '🖥️ Sistema', desc: 'Google Meet / consola' },
                                ]).map(src => (
                                    <button
                                        key={src.value}
                                        onClick={() => setFuenteAudio(src.value)}
                                        className="px-4 py-2.5 rounded-xl text-xs transition-all"
                                        style={{
                                            background: fuenteAudio === src.value ? 'var(--accent-gold-soft)' : 'var(--bg-surface)',
                                            border: `1px solid ${fuenteAudio === src.value ? 'rgba(212, 168, 83, 0.4)' : 'var(--border-default)'}`,
                                            color: fuenteAudio === src.value ? 'var(--accent-gold)' : 'var(--text-secondary)',
                                        }}
                                    >
                                        <span className="block font-medium">{src.label}</span>
                                        <span className="block mt-0.5 opacity-60">{src.desc}</span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={iniciarTranscripcion}
                                className="ml-auto px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
                                style={{
                                    background: 'linear-gradient(135deg, var(--accent-gold), #C49640)',
                                    color: 'var(--bg-primary)',
                                    boxShadow: '0 4px 15px rgba(212, 168, 83, 0.25)',
                                }}
                            >
                                ▶ Iniciar Transcripción
                            </button>
                        </div>
                    )}

                    {/* Recording controls */}
                    {isTranscribing && (
                        <div
                            className="px-6 py-3 flex items-center gap-4 shrink-0"
                            style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: 'var(--danger)' }} />
                                <span className="text-xs font-medium" style={{ color: 'var(--danger)' }}>
                                    Grabando...
                                </span>
                            </div>
                            <button
                                onClick={detenerTranscripcion}
                                className="ml-auto px-5 py-2 rounded-xl text-xs font-semibold transition-all"
                                style={{
                                    background: 'rgba(230, 57, 70, 0.15)',
                                    color: 'var(--danger)',
                                    border: '1px solid rgba(230, 57, 70, 0.3)',
                                }}
                            >
                                ⏹ Detener
                            </button>
                        </div>
                    )}

                    {/* Canvas TipTap */}
                    <TranscriptionCanvas
                        ref={canvasRef}
                        soloLectura={isTranscribing}
                        hablantes={hablantesData}
                        onSegmentoEditado={handleSegmentoEditado}
                        onSeekAudio={handleSeekAudio}
                    />

                    {/* Status bar */}
                    <BarraEstado />
                </div>

                {/* ── Sidebar (28%) ──────────────────────────── */}
                <aside
                    className="shrink-0 flex flex-col overflow-hidden"
                    style={{
                        width: '28%',
                        borderLeft: '1px solid var(--border-subtle)',
                        background: 'var(--bg-secondary)',
                    }}
                >
                    {/* Tabs */}
                    <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        {([
                            { id: 'hablantes' as const, label: 'Hablantes' },
                            { id: 'marcadores' as const, label: 'Marcadores' },
                            { id: 'frases' as const, label: 'Frases' },
                        ]).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setPestanaSidebar(tab.id)}
                                className="flex-1 py-2.5 text-[10px] font-medium uppercase tracking-wider transition-colors"
                                style={{
                                    color: pestanaSidebar === tab.id ? 'var(--accent-gold)' : 'var(--text-muted)',
                                    borderBottom: pestanaSidebar === tab.id ? '2px solid var(--accent-gold)' : '2px solid transparent',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Sidebar content */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Audiencia info (always visible) */}
                        <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <h3
                                className="text-xs font-semibold uppercase tracking-wider mb-2"
                                style={{ color: 'var(--accent-gold)' }}
                            >
                                Información
                            </h3>
                            <div className="space-y-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--text-muted)' }}>Expediente</span>
                                    <span className="font-medium">{audiencia.expediente}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--text-muted)' }}>Tipo</span>
                                    <span>{audiencia.tipo_audiencia}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--text-muted)' }}>Fecha</span>
                                    <span>{audiencia.fecha}</span>
                                </div>
                                {audiencia.delito && (
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Delito</span>
                                        <span>{audiencia.delito}</span>
                                    </div>
                                )}
                                {audiencia.imputado_nombre && (
                                    <div className="flex justify-between">
                                        <span style={{ color: 'var(--text-muted)' }}>Imputado</span>
                                        <span>{audiencia.imputado_nombre}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Audio player (always visible) */}
                        <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <ReproductorAudio
                                ref={reproductorRef}
                                audioUrl={audioUrl}
                                onPosicionCambiada={handleAudioTimeUpdate}
                                onTimeUpdate={handleAudioTimeUpdate}
                            />
                        </div>

                        {/* Active panel */}
                        {pestanaSidebar === 'hablantes' && (
                            <PanelHablantes
                                audienciaId={audienciaId}
                                speakersDetectados={speakersDetectados}
                                onHablanteActualizado={handleHablanteActualizado}
                            />
                        )}
                        {pestanaSidebar === 'marcadores' && (
                            <PanelMarcadores
                                audienciaId={audienciaId}
                                onClickMarcador={handleClickMarcador}
                            />
                        )}
                        {pestanaSidebar === 'frases' && (
                            <AtajosFrases
                                onInsertarFrase={insertarFraseEnCanvas}
                                habilitado={true}
                            />
                        )}
                    </div>
                </aside>
            </div>
        </div>
    )
}
