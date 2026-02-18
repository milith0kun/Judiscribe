/**
 * TipTap Extensions para JudiScribe
 *
 * Extensiones personalizadas para el canvas de transcripción:
 * - SpeakerNode: etiquetas de hablante no editables
 * - SegmentMark: tracking de segmentos con timestamps
 * - LowConfidenceMark: highlight de palabras con baja confianza
 * - BookmarkNode: marcadores con Ctrl+M
 * - ProvisionalNode: texto temporal animado (Deepgram interim results)
 */

export { default as SpeakerNode } from './SpeakerNode'
export { default as SegmentMark } from './SegmentMark'
export { default as LowConfidenceMark } from './LowConfidenceMark'
export { default as BookmarkNode } from './BookmarkNode'
export { default as ProvisionalNode } from './ProvisionalNode'