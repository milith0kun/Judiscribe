'use client'

/**
 * Página Demo del Canvas — transcripción directa sin crear audiencia.
 * 
 * Sprint 2: Usa TranscriptionCanvas TipTap + paneles laterales
 * en layout 72/28, con aspecto Word-like.
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCanvasStore } from '@/stores/canvasStore'
import { useAudioCapture } from '@/hooks/useAudioCapture'
import { useDeepgramSocket } from '@/hooks/useDeepgramSocket'
import TranscriptionCanvas, { TranscriptionCanvasHandle } from '@/components/canvas/TranscriptionCanvas'
import ReproductorAudio, { ReproductorAudioHandle } from '@/components/audio/ReproductorAudio'
import PanelHablantes from '@/components/speakers/PanelHablantes'
import BarraEstado from '@/components/status/BarraEstado'
import AtajosFrases from '@/components/shortcuts/AtajosFrases'
import PanelMarcadores from '@/components/markers/PanelMarcadores'

const DEMO_ID = '00000000-0000-0000-0000-000000000000'

/* ── Speaker colors ─────────────────── */
const SPEAKER_COLORS = [
    '#2563EB', '#059669', '#DC2626', '#D97706',
    '#7C3AED', '#0891B2', '#4F46E5', '#BE185D',
]

const speakerColor = (id: string) => {
    const idx = parseInt(id.replace(/\D/g, ''), 10) || 0
    return SPEAKER_COLORS[idx % SPEAKER_COLORS.length]
}

export default function DemoCanvasPage() {
    const router = useRouter()
    const [fuenteAudio, setFuenteAudio] = useState<'microphone' | 'system'>('microphone')
    const [audioUrl, setAudioUrl] = useState<string | null>(null)

    const canvasRef = useRef<TranscriptionCanvasHandle>(null)
    const audioPlayerRef = useRef<ReproductorAudioHandle>(null)

    const {
        segments,
        isTranscribing,
        connectionStatus,
        elapsedSeconds,
        setTranscribing,
        setElapsedSeconds,
        setCurrentAudioTime,
        reset,
    } = useCanvasStore()

    const { isConnected, connect, sendAudio, stop, disconnect, error: wsError } = useDeepgramSocket(DEMO_ID)

    const { isCapturing, startCapture, stopCapture, error: audioError } = useAudioCapture({
        onAudioChunk: sendAudio,
    })

    const temporizadorRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Build hablantes list from detected speakers
    const hablantes = Array.from(new Set(segments.map(s => s.speaker_id))).map((spk, i) => ({
        speaker_id: spk,
        etiqueta: spk,
        color: speakerColor(spk),
        nombre: null,
    }))

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            reset()
            if (temporizadorRef.current) clearInterval(temporizadorRef.current)
        }
    }, [reset])

    // Timer
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

    const iniciarTranscripcion = useCallback(async () => {
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

    // Audio player → Canvas sync
    const handleAudioTimeUpdate = useCallback((seconds: number) => {
        setCurrentAudioTime(seconds)
    }, [setCurrentAudioTime])

    // Canvas → Audio player seek
    const handleSeekAudio = useCallback((timestamp: number) => {
        audioPlayerRef.current?.seekTo(timestamp)
        audioPlayerRef.current?.play()
    }, [])

    // Canvas → API save (noop for demo)
    const handleSegmentoEditado = useCallback((segmentoId: string, textoNuevo: string) => {
        // In demo mode we just update the store (no API)
        useCanvasStore.getState().updateSegment(segmentoId, textoNuevo)
    }, [])

    // Phrase shortcut → insert into Canvas
    const handleInsertarFrase = useCallback((texto: string) => {
        canvasRef.current?.insertContent(texto)
    }, [])

    return (
        <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
            {/* ── Header ──────────────────────────── */}
            <header className="flex items-center justify-between px-6 py-3 shrink-0"
                style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/')} className="btn-secondary text-xs">
                        Volver
                    </button>
                    <div>
                        <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                            Demo — Transcripción en Tiempo Real
                        </h1>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Canvas Sprint 2 · Deepgram Nova-3 · 100+ keyterms jurídicos
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className={`connection-indicator ${connectionStatus === 'connected' ? 'connection-indicator--connected' : 'connection-indicator--disconnected'}`}>
                        <span className="connection-indicator__dot" />
                        {connectionStatus === 'connected' ? 'Conectado' : 'Desconectado'}
                    </div>
                </div>
            </header>

            {/* ── Controls ──────────────────────────── */}
            {!isTranscribing ? (
                <div className="px-6 py-3 flex items-center gap-6 shrink-0"
                    style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Fuente:</span>
                    <div className="flex gap-2">
                        {[
                            { value: 'microphone' as const, label: 'Micrófono', desc: 'Audio directo' },
                            { value: 'system' as const, label: 'Sistema', desc: 'Meet / consola' },
                        ].map((src) => (
                            <button key={src.value}
                                onClick={() => setFuenteAudio(src.value)}
                                className="px-4 py-2 rounded-lg text-sm transition-all"
                                style={{
                                    background: fuenteAudio === src.value ? 'var(--accent-soft)' : 'var(--bg-surface)',
                                    border: `1px solid ${fuenteAudio === src.value ? 'var(--accent-primary)' : 'var(--border-default)'}`,
                                    color: fuenteAudio === src.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                }}>
                                <span className="block font-medium">{src.label}</span>
                                <span className="block mt-0.5 text-xs opacity-60">{src.desc}</span>
                            </button>
                        ))}
                    </div>
                    <button onClick={iniciarTranscripcion} className="ml-auto btn-primary">
                        Iniciar Transcripción
                    </button>
                </div>
            ) : (
                <div className="px-6 py-2.5 flex items-center gap-4 shrink-0"
                    style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--danger)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--danger)' }}>Grabando</span>
                    </div>
                    <button onClick={detenerTranscripcion}
                        className="ml-auto btn-secondary"
                        style={{ background: 'rgba(220, 38, 38, 0.1)', color: 'var(--danger)', borderColor: 'rgba(220, 38, 38, 0.3)' }}>
                        Detener
                    </button>
                </div>
            )}

            {/* Errors */}
            {(wsError || audioError) && (
                <div className="px-6 py-2.5 text-sm flex items-center gap-2"
                    style={{ background: 'rgba(220, 38, 38, 0.08)', color: 'var(--danger)', borderBottom: '1px solid rgba(220, 38, 38, 0.2)' }}>
                    <span style={{ fontWeight: 600 }}>Error:</span> {wsError || audioError}
                </div>
            )}

            {/* ── Main content: 72/28 layout ──────────── */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT: Canvas (72%) */}
                <div className="flex flex-col" style={{ width: '72%' }}>
                    {segments.length === 0 && !isTranscribing ? (
                        /* Empty state */
                        <div className="canvas-page-area">
                            <div className="canvas-document">
                                <div className="canvas-document__header">
                                    <div className="canvas-document__title">Acta de Audiencia</div>
                                    <div className="canvas-document__meta">
                                        <span>Juzgado Penal Unipersonal</span>
                                        <span>Demo</span>
                                        <span>{new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center justify-center" style={{ flex: 1, padding: '80px 64px' }}>
                                    <div className="empty-state-lines mb-6">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                    <p className="text-base mb-1" style={{ color: 'var(--text-secondary)' }}>
                                        Presiona &quot;Iniciar Transcripción&quot; para comenzar
                                    </p>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                        El texto aparecerá aquí en tiempo real como un documento Word
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Active canvas */
                        <TranscriptionCanvas
                            ref={canvasRef}
                            soloLectura={false}
                            hablantes={hablantes}
                            onSegmentoEditado={handleSegmentoEditado}
                            onSeekAudio={handleSeekAudio}
                            documentInfo={{
                                tipo: 'Acta de Audiencia — Demo',
                                juzgado: 'Juzgado Penal Unipersonal de Cusco',
                            }}
                        />
                    )}
                </div>

                {/* RIGHT: Panels (28%) */}
                <div className="flex flex-col overflow-y-auto"
                    style={{
                        width: '28%',
                        borderLeft: '1px solid var(--border-subtle)',
                        background: 'var(--bg-secondary)',
                    }}>
                    {/* Audio player */}
                    <ReproductorAudio
                        ref={audioPlayerRef}
                        audioUrl={audioUrl}
                        onTimeUpdate={handleAudioTimeUpdate}
                    />

                    {/* Divider */}
                    <div style={{ height: 1, background: 'var(--border-subtle)' }} />

                    {/* Speakers panel */}
                    <PanelHablantes
                        audienciaId={DEMO_ID}
                        speakersDetectados={[]}
                        modoDemo={true}
                        hablantesIniciales={hablantes.map((h, i) => ({
                            id: `demo-${i}`,
                            speaker_id: h.speaker_id,
                            rol: 'participante',
                            etiqueta: h.etiqueta,
                            nombre: null,
                            color: h.color,
                            orden: i,
                            auto_detectado: true,
                        }))}
                        onHablanteActualizado={() => { }}
                    />

                    {/* Divider */}
                    <div style={{ height: 1, background: 'var(--border-subtle)' }} />

                    {/* Phrase shortcuts */}
                    <AtajosFrases
                        onInsertarFrase={handleInsertarFrase}
                        modoDemo={true}
                        frasesIniciales={[
                            { id: '1', numero_atajo: 1, codigo: 'INST', texto: 'Se da por instalada la audiencia.', categoria: 'Apertura' },
                            { id: '2', numero_atajo: 2, codigo: 'TRAS', texto: 'Se corre traslado a las partes.', categoria: 'Debate' },
                            { id: '3', numero_atajo: 3, codigo: 'MINP', texto: 'Se concede el uso de la palabra al Ministerio Público.', categoria: 'Intervención' },
                            { id: '4', numero_atajo: 4, codigo: 'DEF', texto: 'Se concede el uso de la palabra a la Defensa Técnica.', categoria: 'Intervención' },
                            { id: '5', numero_atajo: 5, codigo: 'CONC', texto: 'Se da por concluida la presente audiencia siendo las {HORA}.', categoria: 'Cierre' },
                        ]}
                    />

                    {/* Divider */}
                    <div style={{ height: 1, background: 'var(--border-subtle)' }} />

                    {/* Bookmarks */}
                    <PanelMarcadores
                        audienciaId={DEMO_ID}
                        onSeekAudio={handleSeekAudio}
                    />
                </div>
            </div>

            {/* ── Status bar ──────────────────────────── */}
            <BarraEstado />
        </div>
    )
}
