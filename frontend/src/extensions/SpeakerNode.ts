/**
 * SpeakerNode — Nodo TipTap para etiquetas de hablante.
 *
 * Características:
 * - No editable (el usuario no puede modificar la etiqueta directamente)
 * - Colores por hablante
 * - Muestra rol/nombre del hablante
 */
import { Node, mergeAttributes } from '@tiptap/core'

export interface SpeakerNodeOptions {
    HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        speakerNode: {
            setSpeaker: (attributes: { speakerId: string; label: string; color: string }) => ReturnType
        }
    }
}

const SpeakerNode = Node.create<SpeakerNodeOptions>({
    name: 'speakerNode',

    group: 'block',

    atom: true, // No editable

    addOptions() {
        return {
            HTMLAttributes: {},
        }
    },

    addAttributes() {
        return {
            speakerId: {
                default: null,
            },
            label: {
                default: 'Speaker',
            },
            color: {
                default: '#2563EB',
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'speaker-label',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        const { speakerId, label, color } = HTMLAttributes
        return [
            'speaker-label',
            mergeAttributes(this.options.HTMLAttributes, {
                class: 'speaker-label',
                'data-speaker-id': speakerId,
                style: `
                    display: inline-block;
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 0.8rem;
                    letter-spacing: 0.04em;
                    padding: 3px 10px;
                    border-radius: 4px;
                    margin-top: 1rem;
                    margin-bottom: 0.5rem;
                    color: ${color};
                    background: ${color}15;
                    user-select: none;
                    cursor: default;
                `,
            }),
            label,
        ]
    },

    addCommands() {
        return {
            setSpeaker:
                (attributes) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: attributes,
                    })
                },
        }
    },
})

export default SpeakerNode
