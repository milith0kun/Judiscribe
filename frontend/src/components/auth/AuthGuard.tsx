'use client'

/**
 * AuthGuard — Protege rutas que requieren autenticación.
 * Redirige a /login si no hay usuario autenticado.
 */
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

interface AuthGuardProps {
    children: React.ReactNode
    requiredRole?: 'admin' | 'transcriptor' | 'supervisor'
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { user, token, isLoading } = useAuthStore()
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        const checkAuth = async () => {
            // Si no hay token, redirigir a login
            if (!token) {
                router.push(`/login?redirect=${encodeURIComponent(pathname)}`)
                return
            }

            // Si no hay usuario pero hay token, esperar a que se cargue
            if (!user && token) {
                // El authStore ya está intentando cargar el usuario
                await new Promise((resolve) => setTimeout(resolve, 100))
                setIsChecking(false)
                return
            }

            // Si hay usuario, verificar el rol
            if (user && requiredRole && user.rol !== requiredRole && user.rol !== 'admin') {
                router.push('/')
                return
            }

            setIsChecking(false)
        }

        checkAuth()
    }, [token, user, router, pathname, requiredRole])

    // Mostrar loading mientras se verifica
    if (isChecking || isLoading || (token && !user)) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
                <div className="text-center">
                    <div className="logo-monogram mx-auto mb-4 animate-pulse" style={{ width: '48px', height: '48px', fontSize: '20px' }}>
                        J
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Verificando acceso...</p>
                </div>
            </div>
        )
    }

    // Si no hay usuario después de verificar, no mostrar nada (ya redirigió)
    if (!user) {
        return null
    }

    return <>{children}</>
}
