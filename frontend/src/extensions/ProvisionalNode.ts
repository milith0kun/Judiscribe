import { Node, mergeAttributes } from '@tiptap/core'

export interface ProvisionalNodeOptions {
    HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        provisionalNode: {
            setProvisional: (attributes: { text: string; speakerId: string; color: string }) => ReturnType
            removeProvisional: () => ReturnType
        }
    }
}

const ProvisionalNode = Node.create<ProvisionalNodeOptions>({
    name: 'provisionalNode',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            text: {
                default: '',
            },
            speakerId: {
                default: 'SPEAKER_00',
            },
            color: {
                default: '#718096',
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'div[data-provisional="true"]',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        const { text, speakerId, color } = HTMLAttributes
        return [
            'div',
            mergeAttributes(this.options.HTMLAttributes, {
                'data-provisional': 'true',
                class: 'text-provisional',
            }),
            ['span', {}, text],
            ['span', { class: 'typing-cursor' }, ''],
        ]
    },

    addCommands() {
        return {
            setProvisional:
                (attributes) =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: attributes,
                    })
                },
            removeProvisional:
                () =>
                ({ tr, state, dispatch }) => {
                    const { doc } = state
                    let foundPos = -1

                    doc.descendants((node, pos) => {
                        if (node.type.name === this.name) {
                            foundPos = pos
                        }
                    })

                    if (foundPos !== -1 && dispatch) {
                        tr.delete(foundPos, foundPos + 1)
                        return true
                    }
                    return false
                },
        }
    },
})

export default ProvisionalNode
