/**
 * Canvas store — manages transcription state, segments, and speakers.
 *
 * Incluye:
 * - Tracking de segmentos editados por el usuario
 * - Estado de seeking para sync audio-canvas
 * - Bookmarks
 */
import { create } from 'zustand'
import type { Segmento, TranscriptMessage } from '@/types'

interface Bookmark {
    id: string
    timestamp: number
    note: string
    segmentId?: string
    createdAt: string
}

interface CanvasState {
    segments: Segmento[]
    provisionalText: string | null
    provisionalSpeaker: string | null
    isTranscribing: boolean
    wordCount: number
    elapsedSeconds: number
    connectionStatus: 'disconnected' | 'connected' | 'reconnecting'
    segmentCount: number

    // Audio sync state
    currentAudioTime: number
    activeSegmentId: string | null
    isSeeking: boolean

    // Edited segments tracking
    editedSegmentIds: Set<string>

    // Bookmarks
    bookmarks: Bookmark[]

    // Actions
    addSegment: (segment: Segmento) => void
    updateSegment: (segmentId: string, newText: string) => void
    updateProvisional: (text: string, speaker: string) => void
    clearProvisional: () => void
    setTranscribing: (value: boolean) => void
    setConnectionStatus: (status: 'disconnected' | 'connected' | 'reconnecting') => void
    setElapsedSeconds: (seconds: number) => void

    // Audio sync actions
    setCurrentAudioTime: (time: number) => void
    setActiveSegmentId: (segmentId: string | null) => void
    setIsSeeking: (seeking: boolean) => void
    getSegmentAtTime: (time: number) => Segmento | null

    // Bookmark actions
    addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void
    removeBookmark: (id: string) => void

    reset: () => void
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
    segments: [],
    provisionalText: null,
    provisionalSpeaker: null,
    isTranscribing: false,
    wordCount: 0,
    elapsedSeconds: 0,
    connectionStatus: 'disconnected',
    segmentCount: 0,

    // Audio sync state
    currentAudioTime: 0,
    activeSegmentId: null,
    isSeeking: false,

    // Edited segments tracking
    editedSegmentIds: new Set<string>(),

    // Bookmarks
    bookmarks: [],

    addSegment: (segment) =>
        set((state) => {
            const newSegments = [...state.segments, segment]
            const totalWords = newSegments.reduce(
                (acc, s) => acc + (s.texto_editado || s.texto_ia).split(/\s+/).length,
                0
            )
            return {
                segments: newSegments,
                segmentCount: newSegments.length,
                wordCount: totalWords,
                provisionalText: null,
                provisionalSpeaker: null,
            }
        }),

    updateSegment: (segmentId, newText) =>
        set((state) => {
            const newSegments = state.segments.map((seg) => {
                if (seg.id === segmentId) {
                    return { ...seg, texto_editado: newText }
                }
                return seg
            })

            // Track this segment as edited by user
            const newEditedIds = new Set(state.editedSegmentIds)
            newEditedIds.add(segmentId)

            const totalWords = newSegments.reduce(
                (acc, s) => acc + (s.texto_editado || s.texto_ia).split(/\s+/).length,
                0
            )

            return {
                segments: newSegments,
                editedSegmentIds: newEditedIds,
                wordCount: totalWords,
            }
        }),

    updateProvisional: (text, speaker) =>
        set({ provisionalText: text, provisionalSpeaker: speaker }),

    clearProvisional: () =>
        set({ provisionalText: null, provisionalSpeaker: null }),

    setTranscribing: (value) => set({ isTranscribing: value }),

    setConnectionStatus: (status) => set({ connectionStatus: status }),

    setElapsedSeconds: (seconds) => set({ elapsedSeconds: seconds }),

    // Audio sync actions
    setCurrentAudioTime: (time) => {
        const state = get()
        const activeSegment = state.getSegmentAtTime(time)
        set({
            currentAudioTime: time,
            activeSegmentId: activeSegment?.id || null,
        })
    },

    setActiveSegmentId: (segmentId) => set({ activeSegmentId: segmentId }),

    setIsSeeking: (seeking) => set({ isSeeking: seeking }),

    getSegmentAtTime: (time) => {
        const { segments } = get()
        // Find segment that contains this timestamp
        return segments.find((seg) => {
            const start = seg.timestamp_inicio || 0
            const end = seg.timestamp_fin || start + 5 // Default 5 second segments if no end
            return time >= start && time < end
        }) || null
    },

    // Bookmark actions
    addBookmark: (bookmark) =>
        set((state) => ({
            bookmarks: [
                ...state.bookmarks,
                {
                    ...bookmark,
                    id: `bm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    createdAt: new Date().toISOString(),
                },
            ],
        })),

    removeBookmark: (id) =>
        set((state) => ({
            bookmarks: state.bookmarks.filter((b) => b.id !== id),
        })),

    reset: () =>
        set({
            segments: [],
            provisionalText: null,
            provisionalSpeaker: null,
            isTranscribing: false,
            wordCount: 0,
            elapsedSeconds: 0,
            connectionStatus: 'disconnected',
            segmentCount: 0,
            currentAudioTime: 0,
            activeSegmentId: null,
            isSeeking: false,
            editedSegmentIds: new Set<string>(),
            bookmarks: [],
        }),
}))
