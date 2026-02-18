/**
 * useDeepgramSocket — WebSocket connection to backend for real-time transcription.
 * Sends audio chunks and receives transcript messages.
 */
'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { useCanvasStore } from '@/stores/canvasStore'
import type { TranscriptMessage, Segmento } from '@/types'

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'

export function useDeepgramSocket(audienciaId: string) {
    const [isConnected, setIsConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectAttemptsRef = useRef(0)
    const maxReconnectAttempts = 10
    const reconnectIntervalMs = 2000

    const {
        addSegment,
        updateProvisional,
        setConnectionStatus,
        setTranscribing,
    } = useCanvasStore()

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return

        const url = `${WS_BASE}/ws/transcripcion/${audienciaId}`
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
            setIsConnected(true)
            setError(null)
            setConnectionStatus('connected')
            reconnectAttemptsRef.current = 0
            console.log('WebSocket connected')
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)

                switch (data.type) {
                    case 'transcript': {
                        const msg = data as TranscriptMessage
                        if (msg.is_final) {
                            // Confirmed segment — add to store
                            // Usar texto mejorado si está disponible, sino el original
                            const textoFinal = msg.texto_mejorado || msg.text
                            
                            const segment: Segmento = {
                                id: crypto.randomUUID(),
                                audiencia_id: audienciaId,
                                speaker_id: msg.speaker,
                                texto_ia: msg.text,
                                texto_editado: null,
                                texto_mejorado: msg.texto_mejorado,
                                timestamp_inicio: msg.start,
                                timestamp_fin: msg.end,
                                confianza: msg.confidence,
                                es_provisional: false,
                                editado_por_usuario: false,
                                fuente: 'streaming',
                                orden: useCanvasStore.getState().segmentCount + 1,
                                palabras_json: msg.words,
                            }
                            addSegment(segment)
                        } else {
                            // Provisional — update the floating text
                            updateProvisional(msg.text, msg.speaker)
                        }
                        break
                    }

                    case 'status':
                        if (data.status === 'connected') {
                            setConnectionStatus('connected')
                        }
                        break

                    case 'speech_started':
                        // Could show "speaking now" indicator
                        break

                    case 'utterance_end':
                        // End of utterance — handled by segment ordering
                        break

                    case 'error':
                        setError(data.message)
                        break
                }
            } catch (e) {
                console.error('Error parsing WebSocket message:', e)
            }
        }

        ws.onclose = () => {
            setIsConnected(false)
            setConnectionStatus('disconnected')
            console.log('WebSocket closed')

            // Auto-reconnect
            if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current++
                setConnectionStatus('reconnecting')
                setTimeout(connect, reconnectIntervalMs)
            }
        }

        ws.onerror = (e) => {
            console.error('WebSocket error:', e)
            setError('Error de conexión WebSocket')
        }
    }, [audienciaId, addSegment, updateProvisional, setConnectionStatus])

    const sendAudio = useCallback(
        (base64Data: string, sequence: number) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                    JSON.stringify({
                        type: 'audio_chunk',
                        data: base64Data,
                        sequence,
                        timestamp: Date.now() / 1000,
                    })
                )
            }
        },
        []
    )

    const stop = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stop' }))
        }
        setTranscribing(false)
    }, [setTranscribing])

    const disconnect = useCallback(() => {
        reconnectAttemptsRef.current = maxReconnectAttempts // Prevent reconnection
        wsRef.current?.close()
        wsRef.current = null
        setIsConnected(false)
        setConnectionStatus('disconnected')
    }, [setConnectionStatus])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            reconnectAttemptsRef.current = maxReconnectAttempts
            wsRef.current?.close()
        }
    }, [])

    return {
        isConnected,
        error,
        connect,
        sendAudio,
        stop,
        disconnect,
    }
}
