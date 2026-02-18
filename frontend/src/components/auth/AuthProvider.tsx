'use client'

/**
 * AuthProvider — Inicializa el estado de autenticación al cargar la app.
 * Debe envolver la aplicación en el layout.
 */
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const initialize = useAuthStore((state) => state.initialize)

    useEffect(() => {
        initialize()
    }, [initialize])

    return <>{children}</>
}
