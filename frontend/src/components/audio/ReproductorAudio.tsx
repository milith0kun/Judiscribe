'use client'

/**
 * ReproductorAudio — wavesurfer.js para reproducir el audio grabado.
 *
 * UI Minimalista: controles CSS sin emojis, tooltips en hover.
 *
 * Permite:
 * - Reproducción completa del audio de la audiencia
 * - Click en un segmento → salta al timestamp correspondiente
 * - Visualización de la onda con marcadores temporales
 * - Control de velocidad (0.5x, 1x, 1.5x, 2x)
 */
import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'

export interface ReproductorAudioHandle {
    seekTo: (segundos: number) => void
    play: () => void
    pause: () => void
    getCurrentTime: () => number
}

interface ReproductorAudioProps {
    /** URL del archivo de audio (servido desde backend) */
    audioUrl: string | null
    /** Callback cuando cambia la posición del cursor de audio */
    onPosicionCambiada?: (segundos: number) => void
    /** Callback en cada frame de reproducción para sync con canvas */
    onTimeUpdate?: (segundos: number) => void
}

const ReproductorAudio = forwardRef<ReproductorAudioHandle, ReproductorAudioProps>(({
    audioUrl,
    onPosicionCambiada,
    onTimeUpdate,
}, ref) => {
    const contenedorRef = useRef<HTMLDivElement>(null)
    const wavesurferRef = useRef<any>(null)
    const [reproduciendo, setReproduciendo] = useState(false)
    const [posicion, setPosicion] = useState(0)
    const [duracion, setDuracion] = useState(0)
    const [velocidad, setVelocidad] = useState(1)
    const [cargado, setCargado] = useState(false)

    // Exponer métodos al componente padre
    useImperativeHandle(ref, () => ({
        seekTo: (segundos: number) => {
            if (wavesurferRef.current && duracion > 0) {
                wavesurferRef.current.seekTo(segundos / duracion)
            }
        },
        play: () => {
            wavesurferRef.current?.play()
        },
        pause: () => {
            wavesurferRef.current?.pause()
        },
        getCurrentTime: () => {
            return wavesurferRef.current?.getCurrentTime() || 0
        },
    }), [duracion])

    const blobUrlRef = useRef<string | null>(null)

    useEffect(() => {
        if (!contenedorRef.current || !audioUrl) return

        let ws: any = null

        const inicializar = async () => {
            const token =
                typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
            const headers: HeadersInit = {}
            if (token) headers['Authorization'] = `Bearer ${token}`

            let urlToLoad = audioUrl
            try {
                const res = await fetch(audioUrl, { headers })
                if (!res.ok) throw new Error('Audio no disponible')
                const blob = await res.blob()
                const blobUrl = URL.createObjectURL(blob)
                blobUrlRef.current = blobUrl
                urlToLoad = blobUrl
            } catch {
                setCargado(false)
                return
            }

            const WaveSurfer = (await import('wavesurfer.js')).default

            ws = WaveSurfer.create({
                container: contenedorRef.current!,
                waveColor: 'rgba(37, 99, 235, 0.25)',
                progressColor: '#2563EB',
                cursorColor: '#2563EB',
                barWidth: 2,
                barGap: 1,
                barRadius: 2,
                height: 56,
                normalize: true,
                backend: 'WebAudio',
            })

            ws.on('ready', () => {
                setDuracion(ws.getDuration())
                setCargado(true)
            })

            ws.on('audioprocess', () => {
                const tiempo = ws.getCurrentTime()
                setPosicion(tiempo)
                onPosicionCambiada?.(tiempo)
                onTimeUpdate?.(tiempo)
            })

            ws.on('play', () => setReproduciendo(true))
            ws.on('pause', () => setReproduciendo(false))
            ws.on('finish', () => setReproduciendo(false))

            ws.load(urlToLoad)
            wavesurferRef.current = ws
        }

        inicializar()

        return () => {
            ws?.destroy()
            wavesurferRef.current = null
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current)
                blobUrlRef.current = null
            }
        }
    }, [audioUrl])

    const toggleReproduccion = useCallback(() => {
        wavesurferRef.current?.playPause()
    }, [])

    const saltarA = useCallback((segundos: number) => {
        wavesurferRef.current?.seekTo(segundos / duracion)
    }, [duracion])

    const cambiarVelocidad = useCallback(() => {
        const velocidades = [0.5, 0.75, 1, 1.25, 1.5, 2]
        const indice = velocidades.indexOf(velocidad)
        const nueva = velocidades[(indice + 1) % velocidades.length]
        setVelocidad(nueva)
        wavesurferRef.current?.setPlaybackRate(nueva)
    }, [velocidad])

    const formatearTiempo = (seg: number) => {
        const min = Math.floor(seg / 60).toString().padStart(2, '0')
        const s = Math.floor(seg % 60).toString().padStart(2, '0')
        return `${min}:${s}`
    }

    if (!audioUrl) {
        return (
            <div
                className="px-4 py-4 text-sm text-center"
                style={{ color: 'var(--text-muted)' }}
            >
                El audio estará disponible al finalizar la grabación.
            </div>
        )
    }

        return (

            <div className="px-3 sm:px-4 py-3 sm:py-4">

                <h3

                    className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3"

                    style={{ color: 'var(--text-muted)' }}

                >

                    Audio

                </h3>

    

                {/* Onda de audio */}

                <div

                    ref={contenedorRef}

                    className="rounded-lg overflow-hidden mb-3 sm:mb-4"

                    style={{ background: 'var(--bg-secondary)' }}

                />

    

                {/* Controles */}

                <div className="flex items-center gap-3 sm:gap-4">

                    {/* Botón Play/Pause con forma CSS */}

                    <button

                        onClick={toggleReproduccion}

                        disabled={!cargado}

                        className={`audio-control shrink-0 ${reproduciendo ? 'audio-control--pause' : 'audio-control--play'}`}

                        data-tooltip={reproduciendo ? 'Pausar' : 'Reproducir'}

                        style={{

                            color: reproduciendo ? 'var(--danger)' : 'var(--accent-primary)',

                            borderColor: reproduciendo ? 'rgba(220, 38, 38, 0.3)' : 'var(--border-default)',

                            width: '32px',

                            height: '32px'

                        }}

                    />

    

                    {/* Tiempo */}

                    <span

                        className="text-xs sm:text-sm font-mono tabular-nums shrink-0"

                        style={{ color: 'var(--text-secondary)' }}

                    >

                        {formatearTiempo(posicion)} <span className="hidden xs:inline">/ {formatearTiempo(duracion)}</span>

                    </span>

    

                    {/* Slider de velocidad */}

                    <div className="speed-slider ml-auto gap-1 sm:gap-2 px-2 sm:px-3 py-1">

                        <span className="text-[10px] sm:text-xs font-bold">{velocidad.toFixed(1)}x</span>

                        <input

                            type="range"

                            min="0.5"

                            max="2"

                            step="0.25"

                            value={velocidad}

                            onChange={(e) => {

                                const nueva = parseFloat(e.target.value)

                                setVelocidad(nueva)

                                wavesurferRef.current?.setPlaybackRate(nueva)

                            }}

                            className="w-10 sm:w-16"

                            title="Velocidad de reproducción"

                        />

                    </div>

                </div>

            </div>

        )

    }

    )

ReproductorAudio.displayName = 'ReproductorAudio'

export default ReproductorAudio
