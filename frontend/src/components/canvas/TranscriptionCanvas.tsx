'use client'

/**
 * TranscriptionCanvas — Editor TipTap para transcripción en tiempo real.
 *
 * Sprint 2 Features:
 * - Edición completa con regla de no-sobreescritura
 * - SpeakerNode con etiquetas del PJ + colores por rol
 * - SegmentMark para click-to-play y tracking de ediciones
 * - Texto provisional (gris → negro) con transición suave
 * - Auto-scroll inteligente (se desactiva con scroll manual, Ctrl+J reactiva)
 * - Debounced API saves para ediciones del usuario
 * - Highlight del segmento activo durante reproducción de audio
 */
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback, useMemo } from 'react'
import { useCanvasStore } from '@/stores/canvasStore'
import { SpeakerNode, SegmentMark, LowConfidenceMark, BookmarkNode } from '@/extensions'
import type { Segmento } from '@/types'

/* ── Types ──────────────────────────────────────────── */

export interface TranscriptionCanvasHandle {
    insertContent: (text: string) => void
    getEditor: () => ReturnType<typeof useEditor>
    scrollToEnd: () => void
    scrollToSegment: (segmentId: string) => void
}

interface HablanteInfo {
    speaker_id: string
    etiqueta: string
    color: string
    nombre?: string | null
}

interface DocumentInfo {
    expediente?: string
    tipo?: string
    juzgado?: string
    fecha?: string
}

interface CanvasProps {
    /** Si true, el Canvas está en modo solo-lectura (grabación activa). */
    soloLectura: boolean
    /** Lookup de hablantes con rol/etiqueta/color asignado. */
    hablantes?: HablanteInfo[]
    /** Callback cuando el digitador edita un segmento manualmente. */
    onSegmentoEditado?: (segmentoId: string, textoNuevo: string) => void
    /** Callback para saltar a un timestamp en el audio. */
    onSeekAudio?: (timestamp: number) => void
    /** Timestamp actual del audio para highlight. */
    currentAudioTime?: number
    /** Document header info for the Word-like view. */
    documentInfo?: DocumentInfo
}

/* ── Debounce util ──────────────────────────────────── */

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T & { cancel: () => void } {
    let timer: ReturnType<typeof setTimeout> | null = null
    const debounced = (...args: any[]) => {
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => fn(...args), ms)
    }
    debounced.cancel = () => { if (timer) clearTimeout(timer) }
    return debounced as T & { cancel: () => void }
}

/* ── Component ──────────────────────────────────────── */

const TranscriptionCanvas = forwardRef<TranscriptionCanvasHandle, CanvasProps>(({
    soloLectura,
    hablantes = [],
    onSegmentoEditado,
    onSeekAudio,
    currentAudioTime = 0,
    documentInfo,
}, ref) => {
    const {
        segments,
        provisionalText,
        provisionalSpeaker,
        activeSegmentId,
        editedSegmentIds,
        updateSegment,
    } = useCanvasStore()

    const prevSegmentCountRef = useRef(0)
    const autoScrollRef = useRef(true)
    const containerRef = useRef<HTMLDivElement>(null)

    // Build speaker lookup map for O(1) access
    const speakerMap = useMemo(() => {
        const map = new Map<string, HablanteInfo>()
        hablantes.forEach(h => map.set(h.speaker_id, h))
        return map
    }, [hablantes])

    // Debounced save — fires 800ms after user stops editing
    const debouncedSave = useMemo(
        () =>
            debounce((segId: string, text: string) => {
                onSegmentoEditado?.(segId, text)
            }, 800),
        [onSegmentoEditado]
    )

    // Cleanup debounce on unmount
    useEffect(() => () => debouncedSave.cancel(), [debouncedSave])

    // Get speaker label and color from the lookup map (or fallback to defaults)
    const getSpeakerInfo = useCallback((speakerId: string) => {
        const info = speakerMap.get(speakerId)
        if (info) return { etiqueta: info.etiqueta, color: info.color }
        // Fallback: cycle through a palette
        const colors = ['#1B3A5C', '#2D6A4F', '#9B2226', '#BC6C25', '#6B21A8', '#0E7490', '#64748B', '#DB2777']
        const idx = parseInt(speakerId.replace(/\D/g, ''), 10) || 0
        return { etiqueta: speakerId.toUpperCase() + ':', color: colors[idx % colors.length] }
    }, [speakerMap])

    /* ── TipTap editor ──────────────────────────────── */

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: false }),
            Placeholder.configure({
                placeholder: soloLectura
                    ? 'Iniciando transcripción...'
                    : 'La transcripción aparecerá aquí. Puedes editar el texto libremente.',
            }),
            SpeakerNode,
            SegmentMark,
            LowConfidenceMark,
            BookmarkNode,
        ],
        editable: !soloLectura,
        content: '',
        editorProps: {
            attributes: {
                class: 'prose max-w-none focus:outline-none min-h-[200px]',
            },
            handleClick: (_view, _pos, event) => {
                const target = event.target as HTMLElement
                const segmentEl = target.closest('[data-segment-id]') as HTMLElement
                if (segmentEl && onSeekAudio) {
                    const timestamp = parseFloat(segmentEl.getAttribute('data-timestamp') || '0')
                    if (timestamp > 0) {
                        onSeekAudio(timestamp)
                        return true
                    }
                }
                return false
            },
        },
        onUpdate: ({ editor: ed }) => {
            if (soloLectura || !onSegmentoEditado) return

            // Find which segment the cursor is currently inside
            const { from } = ed.state.selection
            let editedSegmentId: string | null = null

            ed.state.doc.nodesBetween(Math.max(0, from - 1), from + 1, (node) => {
                if (node.marks) {
                    node.marks.forEach((mark) => {
                        if (mark.type.name === 'segment' && mark.attrs.segmentId) {
                            editedSegmentId = mark.attrs.segmentId
                        }
                    })
                }
            })

            if (editedSegmentId) {
                // Extract text within this specific segment mark
                let segText = ''
                ed.state.doc.descendants((node) => {
                    if (node.isText) {
                        const hasMark = node.marks.some(
                            m => m.type.name === 'segment' && m.attrs.segmentId === editedSegmentId
                        )
                        if (hasMark) segText += node.text
                    }
                })

                // Update store (marks as editado_por_usuario)
                updateSegment(editedSegmentId, segText.trim())

                // Mark the segment in TipTap as edited
                ed.commands.markAsEdited(editedSegmentId)

                // Debounced API save
                debouncedSave(editedSegmentId, segText.trim())
            }
        },
    })

    // Update editable when soloLectura changes
    useEffect(() => {
        if (editor) editor.setEditable(!soloLectura)
    }, [editor, soloLectura])

    /* ── Imperative handle ──────────────────────────── */

    useImperativeHandle(ref, () => ({
        insertContent: (text: string) => {
            if (editor) {
                editor.chain().focus().insertContent(` ${text} `).run()
            }
        },
        getEditor: () => editor,
        scrollToEnd: () => {
            if (editor) {
                const el = editor.view.dom
                el.scrollTop = el.scrollHeight
                autoScrollRef.current = true
            }
        },
        scrollToSegment: (segmentId: string) => {
            if (editor) {
                const target = editor.view.dom.querySelector(`[data-segment-id="${segmentId}"]`)
                target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        },
    }))

    /* ── Append new segments ────────────────────────── */

    useEffect(() => {
        if (!editor || segments.length === 0) return
        if (segments.length <= prevSegmentCountRef.current) return

        const nuevos = segments.slice(prevSegmentCountRef.current)
        prevSegmentCountRef.current = segments.length

        const html = nuevos
            .map((seg, idx) => {
                // Show speaker label if different from previous
                const globalIdx = segments.indexOf(seg)
                const prevSeg = globalIdx > 0 ? segments[globalIdx - 1] : null
                const showLabel = !prevSeg || prevSeg.speaker_id !== seg.speaker_id
                const { etiqueta, color } = getSpeakerInfo(seg.speaker_id)
                const texto = seg.texto_editado || seg.texto_ia
                const isEdited = editedSegmentIds.has(seg.id)
                const timestamp = seg.timestamp_inicio || 0

                const classes = ['segment-clickable']
                if (seg.confianza < 0.7) classes.push('text-low-confidence')
                if (isEdited) classes.push('segment-edited')

                let fragment = ''
                if (showLabel) {
                    fragment += `<speaker-label data-speaker-id="${seg.speaker_id}" style="display:inline-block;font-weight:700;text-transform:uppercase;font-size:0.75rem;letter-spacing:0.05em;padding:2px 8px;border-radius:4px;margin-top:0.75rem;margin-bottom:0.25rem;color:${color};background:${color}12;border-left:3px solid ${color};user-select:none;cursor:default;">${etiqueta}</speaker-label><br/>`
                }
                fragment += `<span class="${classes.join(' ')}" data-segment-id="${seg.id}" data-timestamp="${timestamp}" data-edited="${isEdited}" style="cursor:pointer;">${texto}</span> `
                return fragment
            })
            .join('')

        editor.chain().focus('end').insertContent(html).run()

        // Auto-scroll to bottom
        if (autoScrollRef.current) {
            requestAnimationFrame(() => {
                const el = editor.view.dom
                el.scrollTop = el.scrollHeight
            })
        }
    }, [editor, segments, editedSegmentIds, getSpeakerInfo])

    /* ── Active segment highlighting during playback ── */

    useEffect(() => {
        if (!editor) return

        // Clear previous
        editor.view.dom.querySelectorAll('.segment-active').forEach(el =>
            el.classList.remove('segment-active')
        )

        if (activeSegmentId) {
            const el = editor.view.dom.querySelector(`[data-segment-id="${activeSegmentId}"]`)
            if (el) {
                el.classList.add('segment-active')
                // Only scroll if auto-scroll is on
                if (autoScrollRef.current) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }
            }
        }
    }, [editor, activeSegmentId])

    /* ── Provisional text (grey italic) ─────────────── */

    useEffect(() => {
        if (!editor) return

        // Remove old provisional nodes
        const { tr } = editor.state
        let modified = false
        editor.state.doc.descendants((node, pos) => {
            if (node.attrs?.['data-provisional']) {
                tr.delete(pos, pos + node.nodeSize)
                modified = true
            }
        })
        if (modified) editor.view.dispatch(tr)

        // Append new provisional
        if (provisionalText) {
            const { etiqueta, color } = getSpeakerInfo(provisionalSpeaker || 'speaker_0')
            const html = `<p data-provisional="true" style="color:${color};opacity:0.45;font-style:italic;margin:0;padding:0 0 0 11px;border-left:3px solid ${color}33;transition:opacity 0.3s;"><em>${provisionalText}</em></p>`
            editor.chain().focus('end').insertContent(html).run()

            if (autoScrollRef.current) {
                requestAnimationFrame(() => {
                    editor.view.dom.scrollTop = editor.view.dom.scrollHeight
                })
            }
        }
    }, [editor, provisionalText, provisionalSpeaker, getSpeakerInfo])

    /* ── Smart auto-scroll control ──────────────────── */

    useEffect(() => {
        const el = editor?.view.dom
        if (!el) return

        const onScroll = () => {
            const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
            autoScrollRef.current = isNearBottom
        }

        el.addEventListener('scroll', onScroll, { passive: true })
        return () => el.removeEventListener('scroll', onScroll)
    }, [editor])

    // Ctrl+J = scroll to end
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'j') {
                e.preventDefault()
                if (editor) {
                    editor.view.dom.scrollTop = editor.view.dom.scrollHeight
                    autoScrollRef.current = true
                }
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [editor])

    /* ── Render ──────────────────────────────────────── */

    const docDate = documentInfo?.fecha || new Date().toLocaleDateString('es-PE', {
        year: 'numeric', month: 'long', day: 'numeric'
    })

    return (
        <div ref={containerRef} className="canvas-page-area">
            <div className="canvas-document">
                {/* Document header — mimics official PJ header */}
                <div className="canvas-document__header">
                    <div className="canvas-document__title">
                        {documentInfo?.tipo || 'Acta de Audiencia'}
                    </div>
                    <div className="canvas-document__meta">
                        <span>{documentInfo?.juzgado || 'Juzgado Penal Unipersonal'}</span>
                        <span>{documentInfo?.expediente ? `Exp. ${documentInfo.expediente}` : ''}</span>
                        <span>{docDate}</span>
                    </div>
                </div>

                {/* TipTap editor */}
                <div className="canvas-editor">
                    <EditorContent editor={editor} />
                </div>

                {/* Scroll indicator — shows when auto-scroll is off */}
                {!autoScrollRef.current && segments.length > 3 && (
                    <button
                        onClick={() => {
                            if (editor) {
                                editor.view.dom.scrollTop = editor.view.dom.scrollHeight
                                autoScrollRef.current = true
                            }
                        }}
                        className="fixed bottom-20 right-[30%] px-3 py-1.5 rounded-full text-xs z-10 transition-all hover:brightness-110"
                        style={{
                            background: 'var(--accent-primary)',
                            color: '#FFFFFF',
                            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                        }}
                    >
                        ↓ Ir al final (Ctrl+J)
                    </button>
                )}
            </div>
        </div>
    )
})

TranscriptionCanvas.displayName = 'TranscriptionCanvas'

export default TranscriptionCanvas
