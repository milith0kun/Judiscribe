/**
 * BookmarkNode — Nodo TipTap para marcadores en la transcripción.
 *
 * Características:
 * - Permite al usuario marcar puntos importantes (Ctrl+M)
 * - Guarda timestamp y nota opcional
 * - Visual indicator en el margen
 * - Navegación rápida entre bookmarks
 */
import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

export interface BookmarkNodeOptions {
    HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        bookmarkNode: {
            addBookmark: (attributes?: { note?: string; timestamp?: number }) => ReturnType
            removeBookmark: (id: string) => ReturnType
        }
    }
}

const BookmarkNode = Node.create<BookmarkNodeOptions>({
    name: 'bookmark',

    group: 'inline',

    inline: true,

    atom: true,

    addOptions() {
        return {
            HTMLAttributes: {},
        }
    },

    addAttributes() {
        return {
            id: {
                default: () => `bm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            },
            note: {
                default: '',
            },
            timestamp: {
                default: 0,
            },
            createdAt: {
                default: () => new Date().toISOString(),
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'bookmark-marker',
            },
        ]
    },

    renderHTML({ HTMLAttributes }) {
        const { id, note, timestamp } = HTMLAttributes
        const tooltipText = note || `Marcador @ ${Math.floor(timestamp / 60)}:${String(Math.floor(timestamp % 60)).padStart(2, '0')}`

        return [
            'bookmark-marker',
            mergeAttributes(this.options.HTMLAttributes, {
                class: 'bookmark-marker',
                'data-bookmark-id': id,
                'data-timestamp': timestamp,
                title: tooltipText,
                style: `
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 16px;
                    height: 16px;
                    background: var(--accent-primary, #2563EB);
                    border-radius: 50%;
                    margin: 0 4px;
                    cursor: pointer;
                    vertical-align: middle;
                    position: relative;
                `,
            }),
            [
                'span',
                {
                    style: `
                        width: 4px;
                        height: 4px;
                        background: white;
                        border-radius: 50%;
                    `,
                },
            ],
        ]
    },

    addCommands() {
        return {
            addBookmark:
                (attributes = {}) =>
                ({ commands, state }) => {
                    // Get current timestamp from audio if available
                    const timestamp = attributes.timestamp || 0

                    return commands.insertContent({
                        type: this.name,
                        attrs: {
                            ...attributes,
                            timestamp,
                        },
                    })
                },
            removeBookmark:
                (id) =>
                ({ tr, state }) => {
                    let found = false
                    state.doc.descendants((node, pos) => {
                        if (node.type.name === this.name && node.attrs.id === id) {
                            tr.delete(pos, pos + node.nodeSize)
                            found = true
                        }
                    })
                    return found
                },
        }
    },

    addKeyboardShortcuts() {
        return {
            'Mod-m': () => this.editor.commands.addBookmark(),
            'Mod-M': () => this.editor.commands.addBookmark(),
        }
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('bookmark-click-handler'),
                props: {
                    handleClick: (view, pos, event) => {
                        const target = event.target as HTMLElement
                        if (target.closest('bookmark-marker')) {
                            const bookmarkId = target.closest('bookmark-marker')?.getAttribute('data-bookmark-id')
                            const timestamp = parseFloat(target.closest('bookmark-marker')?.getAttribute('data-timestamp') || '0')

                            // Dispatch custom event for parent component to handle
                            const customEvent = new CustomEvent('bookmark-clicked', {
                                detail: { bookmarkId, timestamp },
                                bubbles: true,
                            })
                            view.dom.dispatchEvent(customEvent)

                            return true
                        }
                        return false
                    },
                },
            }),
        ]
    },
})

export default BookmarkNode
