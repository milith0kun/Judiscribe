/**
 * LowConfidenceMark — Mark TipTap para palabras de baja confianza.
 *
 * Características:
 * - Highlight visual con underline punteado
 * - Tooltip mostrando el nivel de confianza
 * - Click para ver sugerencias alternativas (futuro)
 */
import { Mark, mergeAttributes } from '@tiptap/core'

export interface LowConfidenceMarkOptions {
    HTMLAttributes: Record<string, any>
    confidenceThreshold: number
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        lowConfidenceMark: {
            setLowConfidence: (attributes: { confidence: number; alternatives?: string[] }) => ReturnType
            clearLowConfidence: () => ReturnType
        }
    }
}

const LowConfidenceMark = Mark.create<LowConfidenceMarkOptions>({
    name: 'lowConfidence',

    addOptions() {
        return {
            HTMLAttributes: {},
            confidenceThreshold: 0.7,
        }
    },

    addAttributes() {
        return {
            confidence: {
                default: 0,
            },
            alternatives: {
                default: [],
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-low-confidence]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        const { confidence, alternatives } = HTMLAttributes
        const confidencePercent = Math.round(confidence * 100)
        const altText = alternatives?.length > 0 ? ` | Alternativas: ${alternatives.join(', ')}` : ''

        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, {
                class: 'text-low-confidence',
                'data-low-confidence': 'true',
                'data-confidence': confidence,
                title: `Confianza: ${confidencePercent}%${altText}`,
                style: `
                    background: rgba(217, 119, 6, 0.1);
                    border-bottom: 2px dotted #D97706;
                    cursor: help;
                    padding: 0 2px;
                `,
            }),
            0,
        ]
    },

    addCommands() {
        return {
            setLowConfidence:
                (attributes) =>
                ({ commands }) => {
                    return commands.setMark(this.name, attributes)
                },
            clearLowConfidence:
                () =>
                ({ commands }) => {
                    return commands.unsetMark(this.name)
                },
        }
    },
})

export default LowConfidenceMark
