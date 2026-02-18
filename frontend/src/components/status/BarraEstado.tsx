'use client'

/**
 * BarraEstado — Barra inferior del Canvas con métricas en tiempo real.
 *
 * Muestra: palabras, tiempo transcurrido, segmentos, estado de conexión,
 * fuente de audio, y confianza promedio.
 */
import { useCanvasStore } from '@/stores/canvasStore'

export default function BarraEstado() {
    const {
        wordCount,
        elapsedSeconds,
        segmentCount,
        connectionStatus,
        isTranscribing,
        segments,
    } = useCanvasStore()

    // Confianza promedio
    const confianzaPromedio =
        segments.length > 0
            ? segments.reduce((acc, s) => acc + s.confianza, 0) / segments.length
            : 0

    const formatearTiempo = (seg: number) => {
        const h = Math.floor(seg / 3600).toString().padStart(2, '0')
        const m = Math.floor((seg % 3600) / 60).toString().padStart(2, '0')
        const s = (seg % 60).toString().padStart(2, '0')
        return `${h}:${m}:${s}`
    }

    const colorConexion = {
        connected: '#059669',
        reconnecting: '#D97706',
        disconnected: '#718096',
    }[connectionStatus]

    const textoConexion = {
        connected: 'Conectado',
        reconnecting: 'Reconectando...',
        disconnected: 'Desconectado',
    }[connectionStatus]

    return (
        <div
            className="px-6 py-2 flex items-center gap-6 shrink-0 text-xs select-none"
            style={{
                borderTop: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-muted)',
            }}
        >
            {/* Indicador de grabación */}
            {isTranscribing && (
                <div className="flex items-center gap-1.5">
                    <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: 'var(--danger)' }}
                    />
                    <span style={{ color: 'var(--danger)' }}>REC</span>
                </div>
            )}

            {/* Tiempo */}
            <span className="font-mono tabular-nums">{formatearTiempo(elapsedSeconds)}</span>

            {/* Separador */}
            <span style={{ opacity: 0.3 }}>│</span>

            {/* Palabras */}
            <span>{wordCount.toLocaleString()} palabras</span>

            {/* Separador */}
            <span style={{ opacity: 0.3 }}>│</span>

            {/* Segmentos */}
            <span>{segmentCount} segmentos</span>

            {/* Separador */}
            <span style={{ opacity: 0.3 }}>│</span>

            {/* Precisión promedio con barra visual */}
            <div className="confidence-meter">
                <span>Precisión:</span>
                <div className="confidence-meter__bar">
                    <div
                        className={`confidence-meter__fill ${confianzaPromedio >= 0.85
                                ? 'confidence-meter__fill--high'
                                : confianzaPromedio >= 0.7
                                    ? 'confidence-meter__fill--medium'
                                    : 'confidence-meter__fill--low'
                            }`}
                        style={{ width: `${confianzaPromedio * 100}%` }}
                    />
                </div>
                <span
                    style={{
                        color:
                            confianzaPromedio >= 0.85
                                ? '#059669'
                                : confianzaPromedio >= 0.7
                                    ? '#D97706'
                                    : '#DC2626',
                    }}
                >
                    {(confianzaPromedio * 100).toFixed(1)}%
                </span>
            </div>

            {/* Espaciador */}
            <div className="flex-1" />

            {/* Estado de conexión */}
            <div className="flex items-center gap-1.5">
                <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: colorConexion }}
                />
                <span>{textoConexion}</span>
            </div>
        </div>
    )
}
