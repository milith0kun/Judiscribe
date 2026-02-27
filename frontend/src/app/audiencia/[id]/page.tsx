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
import { apiBaseUrl } from '@/lib/urls'
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
        provisionalSpeaker,
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
        ? `${apiBaseUrl()}/api/audiencias/${audienciaId}/audio`
        : null

    /* ── Render ──────────────────────────────────────── */

    return (
        <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
            {/* ── Header ─────────────────────────────────── */}
            <header
                className="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 shrink-0"
                style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}
            >
                <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                    <button
                        onClick={() => router.push('/')}
                        className="text-[10px] sm:text-xs px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg transition-colors hover:brightness-110 shrink-0"
                        style={{ color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                    >
                        ← <span className="hidden sm:inline">Volver</span>
                    </button>
                    <div className="overflow-hidden">
                        <h1 className="text-xs sm:text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                            {audiencia.expediente}
                        </h1>
                        <p className="text-[10px] sm:text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {audiencia.tipo_audiencia} <span className="hidden sm:inline">— {audiencia.juzgado}</span>
                        </p>
                    </div>
                </div>

                {/* Connection status pill */}
                <div
                    className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs shrink-0"
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
                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                        style={{
                            background:
                                connectionStatus === 'connected' ? '#4ADE80'
                                    : connectionStatus === 'reconnecting' ? '#FB923C'
                                        : '#94A3B8',
                        }}
                    />
                    <span className="hidden sm:inline">
                        {connectionStatus === 'connected' ? 'Conectado'
                            : connectionStatus === 'reconnecting' ? 'Reconectando...'
                                : 'Desconectado'}
                    </span>
                    <span className="sm:hidden uppercase font-bold">
                        {connectionStatus === 'connected' ? 'OK'
                            : connectionStatus === 'reconnecting' ? '...'
                                : 'OFF'}
                    </span>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                {/* ── Canvas (Main Area) ────────────────────────── */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Audio source selector */}
                    {mostrarSelector && !isTranscribing && (
                        <div
                            className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 shrink-0"
                            style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}
                        >
                            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                Fuente de audio:
                            </span>
                            <div className="flex gap-2 w-full sm:w-auto">
                                {([
                                    { value: 'microphone' as const, label: '🎙️ Mic', desc: 'Directo' },
                                    { value: 'system' as const, label: '🖥️ Sis', desc: 'Virtual' },
                                ]).map(src => (
                                    <button
                                        key={src.value}
                                        onClick={() => setFuenteAudio(src.value)}
                                        className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs transition-all"
                                        style={{
                                            background: fuenteAudio === src.value ? 'var(--accent-gold-soft)' : 'var(--bg-surface)',
                                            border: `1px solid ${fuenteAudio === src.value ? 'rgba(212, 168, 83, 0.4)' : 'var(--border-default)'}`,
                                            color: fuenteAudio === src.value ? 'var(--accent-gold)' : 'var(--text-secondary)',
                                        }}
                                    >
                                        <span className="block font-medium">{src.label}</span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={iniciarTranscripcion}
                                className="w-full sm:w-auto sm:ml-auto px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-110"
                                style={{
                                    background: 'linear-gradient(135deg, var(--accent-gold), #C49640)',
                                    color: 'var(--bg-primary)',
                                    boxShadow: '0 4px 15px rgba(212, 168, 83, 0.25)',
                                }}
                            >
                                Iniciar Transcripción
                            </button>
                        </div>
                    )}

                    {/* Recording controls */}
                    {isTranscribing && (
                        <div
                            className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0"
                            style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 sm:w-3 sm:h-3 rounded-full animate-pulse" style={{ background: 'var(--danger)' }} />
                                <span className="text-xs font-medium" style={{ color: 'var(--danger)' }}>
                                    Grabando...
                                </span>
                            </div>
                            <button
                                onClick={detenerTranscripcion}
                                className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all"
                                style={{
                                    background: 'rgba(230, 57, 70, 0.15)',
                                    color: 'var(--danger)',
                                    border: '1px solid rgba(230, 57, 70, 0.3)',
                                }}
                            >
                                Detener
                            </button>
                        </div>
                    )}

                    {/* Canvas TipTap */}
                    <div className="flex-1 overflow-hidden relative">
                        <TranscriptionCanvas
                            ref={canvasRef}
                            soloLectura={isTranscribing}
                            hablantes={hablantesData}
                            onSegmentoEditado={handleSegmentoEditado}
                            onSeekAudio={handleSeekAudio}
                        />
                    </div>

                    {/* Status bar - Hidden or simplified on mobile */}
                    <div className="hidden sm:block">
                        <BarraEstado />
                    </div>
                </div>

                {/* ── Sidebar (Right on desktop, Bottom/Toggle on mobile) ──────────────────────────── */}
                <aside
                    className="lg:w-[320px] xl:w-[380px] shrink-0 flex flex-col overflow-hidden border-t lg:border-t-0 lg:border-l h-[300px] lg:h-full"
                    style={{
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
                                className="flex-1 py-2.5 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider transition-colors"
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
                                onHablantesCargados={setHablantesData}
                                hablandoAhora={provisionalSpeaker}
                            />
                        )}
                        {pestanaSidebar === 'marcadores' && (
                            <PanelMarcadores
                                audienciaId={audienciaId}
                                onSeekAudio={handleClickMarcador}
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
