import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'JudiScribe — Transcripción Judicial Inteligente',
    description: 'Sistema de transcripción en tiempo real para audiencias judiciales del Distrito Judicial de Cusco, Perú.',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="es">
            <body>
                {children}
            </body>
        </html>
    )
}
