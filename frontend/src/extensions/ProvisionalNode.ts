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
        const { text } = HTMLAttributes
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

    /**
     * NodeView to render innerHTML — needed because renderHTML escapes HTML tags.
     * This allows <span class="provisional-word"> to render as actual DOM elements
     * for the word-by-word animation effect.
     */
    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement('div')
            dom.setAttribute('data-provisional', 'true')
            dom.classList.add('text-provisional')

            const contentSpan = document.createElement('span')
            contentSpan.innerHTML = node.attrs.text || ''
            dom.appendChild(contentSpan)

            const cursor = document.createElement('span')
            cursor.classList.add('typing-cursor')
            dom.appendChild(cursor)

            return {
                dom,
                update(updatedNode) {
                    if (updatedNode.type.name !== 'provisionalNode') return false
                    contentSpan.innerHTML = updatedNode.attrs.text || ''
                    return true
                },
            }
        }
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

