/**
 * useAudioCapture — captures audio from browser using MediaRecorder API.
 * Sends PCM 16kHz mono chunks every 250ms via callback.
 */
'use client'

import { useRef, useCallback, useState } from 'react'

interface AudioCaptureOptions {
    onAudioChunk: (base64Data: string, sequence: number) => void
    sampleRate?: number
    chunkIntervalMs?: number
}

export function useAudioCapture({
    onAudioChunk,
    sampleRate = 16000,
    chunkIntervalMs = 250,
}: AudioCaptureOptions) {
    const [isCapturing, setIsCapturing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

    const mediaStreamRef = useRef<MediaStream | null>(null)
    const processorRef = useRef<ScriptProcessorNode | null>(null)
    const contextRef = useRef<AudioContext | null>(null)
    const sequenceRef = useRef(0)
    const bufferRef = useRef<Float32Array[]>([])
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    const listDevices = useCallback(async () => {
        try {
            const deviceList = await navigator.mediaDevices.enumerateDevices()
            const audioInputs = deviceList.filter((d) => d.kind === 'audioinput')
            setDevices(audioInputs)
            return audioInputs
        } catch (err) {
            setError('No se pueden listar dispositivos de audio')
            return []
        }
    }, [])

    const startCapture = useCallback(
        async (source: 'microphone' | 'system' | string) => {
            try {
                setError(null)
                let stream: MediaStream

                if (source === 'system') {
                    // Capture system audio via getDisplayMedia
                    stream = await navigator.mediaDevices.getDisplayMedia({
                        audio: true,
                        video: false,
                    } as any)
                } else if (source === 'microphone') {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            sampleRate,
                            channelCount: 1,
                            echoCancellation: true,
                            noiseSuppression: true,
                        },
                    })
                } else {
                    // Specific device ID
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: { deviceId: { exact: source } },
                    })
                }

                mediaStreamRef.current = stream

                // Create AudioContext for PCM conversion
                const audioContext = new AudioContext({ sampleRate })
                contextRef.current = audioContext

                const sourceNode = audioContext.createMediaStreamSource(stream)
                const processor = audioContext.createScriptProcessor(4096, 1, 1)
                processorRef.current = processor

                processor.onaudioprocess = (e) => {
                    const float32Data = e.inputBuffer.getChannelData(0)
                    bufferRef.current.push(new Float32Array(float32Data))
                }

                sourceNode.connect(processor)
                processor.connect(audioContext.destination)

                // Flush buffer every chunkIntervalMs
                intervalRef.current = setInterval(() => {
                    if (bufferRef.current.length === 0) return

                    // Concatenate all buffered chunks
                    const totalLength = bufferRef.current.reduce((acc, b) => acc + b.length, 0)
                    const merged = new Float32Array(totalLength)
                    let offset = 0
                    for (const chunk of bufferRef.current) {
                        merged.set(chunk, offset)
                        offset += chunk.length
                    }
                    bufferRef.current = []

                    // Convert float32 to int16 PCM
                    const int16 = new Int16Array(merged.length)
                    for (let i = 0; i < merged.length; i++) {
                        const s = Math.max(-1, Math.min(1, merged[i]))
                        int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
                    }

                    // Convert to base64
                    const bytes = new Uint8Array(int16.buffer)
                    let binary = ''
                    for (let i = 0; i < bytes.byteLength; i++) {
                        binary += String.fromCharCode(bytes[i])
                    }
                    const base64 = btoa(binary)

                    sequenceRef.current++
                    onAudioChunk(base64, sequenceRef.current)
                }, chunkIntervalMs)

                setIsCapturing(true)
            } catch (err: any) {
                setError(err.message || 'Error al capturar audio')
                console.error('Audio capture error:', err)
            }
        },
        [onAudioChunk, sampleRate, chunkIntervalMs]
    )

    const stopCapture = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
        if (processorRef.current) {
            processorRef.current.disconnect()
            processorRef.current = null
        }
        if (contextRef.current) {
            contextRef.current.close()
            contextRef.current = null
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => t.stop())
            mediaStreamRef.current = null
        }
        bufferRef.current = []
        sequenceRef.current = 0
        setIsCapturing(false)
    }, [])

    return {
        isCapturing,
        error,
        devices,
        listDevices,
        startCapture,
        stopCapture,
    }
}
