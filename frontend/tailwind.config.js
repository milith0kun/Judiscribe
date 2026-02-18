/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // JudiScribe brand palette — inspired by Peruvian judicial formality
                judicial: {
                    50: '#f0f4f8',
                    100: '#d9e2ec',
                    200: '#bcccdc',
                    300: '#9fb3c8',
                    400: '#829ab1',
                    500: '#627d98',
                    600: '#486581',
                    700: '#334e68',
                    800: '#243b53',
                    900: '#102a43',
                },
                // Speaker role colors
                speaker: {
                    juez: '#1B3A5C',
                    fiscal: '#2D6A4F',
                    defensa: '#9B2226',
                    imputado: '#BC6C25',
                    agraviado: '#6B21A8',
                    perito: '#0E7490',
                    testigo: '#65A30D',
                    asistente: '#64748B',
                },
                // UI semantic colors
                canvas: {
                    provisional: '#F5F5F5',
                    lowconf: '#FFF3CD',
                    suggestion: '#E67E22',
                },
            },
            fontFamily: {
                sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
                display: ['var(--font-display)', 'serif'],
                mono: ['var(--font-mono)', 'monospace'],
            },
        },
    },
    plugins: [],
}
