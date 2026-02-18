/**
 * InlineSuggestion Extension para TipTap
 *
 * Muestra sugerencias de autocompletado como "ghost text" (texto fantasma)
 * similar a GitHub Copilot, Cursor, etc.
 *
 * Funcionalidades:
 * - Prediccion de texto basada en contexto judicial
 * - Aceptar sugerencia con Tab
 * - Cancelar con Escape
 * - Debounce para evitar llamadas excesivas a la API
 */
import { Extension, Editor } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface InlineSuggestionOptions {
    /**
     * Funcion que obtiene la sugerencia de autocompletado
     * @param context - Contexto actual (texto antes del cursor)
     * @returns Promise con la sugerencia o null
     */
    fetchSuggestion: (context: string) => Promise<string | null>

    /**
     * Tiempo de espera despues de escribir antes de buscar sugerencia (ms)
     */
    debounceMs?: number

    /**
     * Minimo de caracteres antes de buscar sugerencias
     */
    minChars?: number

    /**
     * Clase CSS para el ghost text
     */
    suggestionClass?: string
}

export interface InlineSuggestionStorage {
    suggestion: string | null
    isLoading: boolean
    debounceTimer: ReturnType<typeof setTimeout> | null
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        inlineSuggestion: {
            /**
             * Acepta la sugerencia actual
             */
            acceptSuggestion: () => ReturnType
            /**
             * Rechaza/oculta la sugerencia actual
             */
            dismissSuggestion: () => ReturnType
        }
    }
}

const SUGGESTION_PLUGIN_KEY = new PluginKey('inlineSuggestion')

/**
 * Helper para disparar la busqueda de sugerencias
 */
function triggerFetch(
    editor: Editor,
    options: InlineSuggestionOptions,
    storage: InlineSuggestionStorage
): void {
    const { selection, doc } = editor.state
    const pos = selection.to

    // Obtener texto antes del cursor (contexto)
    const textBefore = doc.textBetween(
        Math.max(0, pos - 500), // Ultimos 500 caracteres maximo
        pos,
        ' '
    )

    if (textBefore.length < (options.minChars || 3)) {
        return
    }

    // Evitar busqueda si ya hay una en progreso
    if (storage.isLoading) {
        return
    }

    storage.isLoading = true

    options
        .fetchSuggestion(textBefore)
        .then((suggestion) => {
            storage.suggestion = suggestion
            storage.isLoading = false
            // Forzar re-render
            editor.view.dispatch(editor.state.tr)
        })
        .catch(() => {
            storage.isLoading = false
        })
}

export const InlineSuggestion = Extension.create<InlineSuggestionOptions, InlineSuggestionStorage>({
    name: 'inlineSuggestion',

    addOptions() {
        return {
            fetchSuggestion: async () => null,
            debounceMs: 300,
            minChars: 3,
            suggestionClass: 'inline-suggestion',
        }
    },

    addStorage() {
        return {
            suggestion: null,
            isLoading: false,
            debounceTimer: null,
        }
    },

    addCommands() {
        return {
            acceptSuggestion:
                () =>
                    ({ editor, tr, dispatch }) => {
                        const suggestion = this.storage.suggestion
                        if (!suggestion) return false

                        if (dispatch) {
                            const { selection } = tr
                            tr.insertText(suggestion, selection.to)
                            this.storage.suggestion = null
                        }
                        return true
                    },

            dismissSuggestion:
                () =>
                    () => {
                        if (this.storage.suggestion) {
                            this.storage.suggestion = null
                            return true
                        }
                        return false
                    },
        }
    },

    addKeyboardShortcuts() {
        return {
            Tab: ({ editor }) => {
                if (this.storage.suggestion) {
                    editor.commands.acceptSuggestion()
                    return true
                }
                return false
            },
            Escape: ({ editor }) => {
                if (this.storage.suggestion) {
                    editor.commands.dismissSuggestion()
                    return true
                }
                return false
            },
        }
    },

    addProseMirrorPlugins() {
        // Capture references directly instead of aliasing 'this' (no-this-alias rule)
        const storage = this.storage
        const options = this.options
        const getEditor = () => this.editor

        return [
            new Plugin({
                key: SUGGESTION_PLUGIN_KEY,

                state: {
                    init() {
                        return DecorationSet.empty
                    },
                    apply(_tr, _oldState, _oldEditorState, newEditorState) {
                        const suggestion = storage.suggestion
                        if (!suggestion) {
                            return DecorationSet.empty
                        }

                        const { selection } = newEditorState
                        if (!selection.empty) {
                            return DecorationSet.empty
                        }

                        // Crear decoracion de ghost text como widget
                        const widget = Decoration.widget(
                            selection.to,
                            () => {
                                const span = document.createElement('span')
                                span.className = options.suggestionClass || 'inline-suggestion'
                                span.textContent = suggestion
                                span.setAttribute('data-suggestion', 'true')
                                return span
                            },
                            { side: 1 }
                        )

                        return DecorationSet.create(newEditorState.doc, [widget])
                    },
                },

                props: {
                    decorations(state) {
                        return this.getState(state)
                    },
                },

                view: () => ({
                    update: (view, prevState) => {
                        // Solo buscar sugerencia si el documento cambio
                        if (view.state.doc.eq(prevState.doc)) {
                            return
                        }

                        // Limpiar sugerencia anterior cuando se escribe
                        storage.suggestion = null

                        // Debounce para nueva sugerencia
                        if (storage.debounceTimer) {
                            clearTimeout(storage.debounceTimer)
                        }

                        storage.debounceTimer = setTimeout(() => {
                            const currentEditor = getEditor()
                            if (currentEditor) {
                                triggerFetch(
                                    currentEditor,
                                    options,
                                    storage
                                )
                            }
                        }, options.debounceMs)
                    },
                }),
            }),
        ]
    },
})

export default InlineSuggestion
