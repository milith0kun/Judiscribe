/**
 * SegmentMark — Mark TipTap para tracking de segmentos de transcripción.
 *
 * Características:
 * - Asocia texto con un segmento de la transcripción
 * - Trackea si fue editado por el usuario
 * - Almacena timestamp para click-to-play
 * - Visual indicator para segmentos editados
 */
import { Mark, mergeAttributes } from '@tiptap/core'

export interface SegmentMarkOptions {
    HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        segmentMark: {
            setSegment: (attributes: {
                segmentId: string
                timestamp: number
                editedByUser?: boolean
            }) => ReturnType
            markAsEdited: (segmentId: string) => ReturnType
        }
    }
}

const SegmentMark = Mark.create<SegmentMarkOptions>({
    name: 'segment',

    addOptions() {
        return {
            HTMLAttributes: {},
        }
    },

    addAttributes() {
        return {
            segmentId: {
                default: null,
            },
            timestamp: {
                default: 0,
            },
            editedByUser: {
                default: false,
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-segment-id]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        const { segmentId, timestamp, editedByUser } = HTMLAttributes
        const classes = ['segment-text', 'segment-clickable']
        if (editedByUser) {
            classes.push('segment-edited')
        }

        return [
            'span',
            mergeAttributes(this.options.HTMLAttributes, {
                class: classes.join(' '),
                'data-segment-id': segmentId,
                'data-timestamp': timestamp,
                'data-edited': editedByUser ? 'true' : 'false',
            }),
            0,
        ]
    },

    addCommands() {
        return {
            setSegment:
                (attributes) =>
                ({ commands }) => {
                    return commands.setMark(this.name, attributes)
                },
            markAsEdited:
                (segmentId) =>
                ({ tr, state }) => {
                    let found = false
                    state.doc.descendants((node, pos) => {
                        if (node.isText) {
                            const marks = node.marks
                            marks.forEach((mark) => {
                                if (mark.type.name === this.name && mark.attrs.segmentId === segmentId) {
                                    const newMark = mark.type.create({
                                        ...mark.attrs,
                                        editedByUser: true,
                                    })
                                    tr.removeMark(pos, pos + node.nodeSize, mark)
                                    tr.addMark(pos, pos + node.nodeSize, newMark)
                                    found = true
                                }
                            })
                        }
                    })
                    return found
                },
        }
    },
})

export default SegmentMark
