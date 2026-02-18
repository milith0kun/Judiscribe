'use client'

/**
 * Página principal — Dashboard simplificado sin autenticación.
 * Lista audiencias y permite crear/acceder al Canvas directamente.
 *
 * UI Minimalista: sin emojis, tipografía como jerarquía.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import type { Audiencia } from '@/types'

const ESTADO_COLORS: Record<string, { bg: string; text: string; label: string }> = {
    pendiente: { bg: 'rgba(113, 128, 150, 0.1)', text: '#718096', label: 'Pendiente' },
    en_curso: { bg: 'rgba(37, 99, 235, 0.1)', text: '#2563EB', label: 'En curso' },
    transcrita: { bg: 'rgba(217, 119, 6, 0.1)', text: '#D97706', label: 'Transcrita' },
    en_revision: { bg: 'rgba(234, 88, 12, 0.1)', text: '#EA580C', label: 'En revisión' },
    finalizada: { bg: 'rgba(5, 150, 105, 0.1)', text: '#059669', label: 'Finalizada' },
}

export default function DashboardPage() {
    const router = useRouter()
    const [audiencias, setAudiencias] = useState<Audiencia[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchAudiencias()
    }, [])

    const fetchAudiencias = async () => {
        try {
            const { data } = await api.get('/api/audiencias')
            setAudiencias(data.items || [])
        } catch (err) {
            console.error('Error fetching audiencias:', err)
            setAudiencias([])
        } finally {
            setLoading(false)
        }
    }

    // Stats
    const hoy = new Date().toISOString().split('T')[0]
    const audienciasHoy = audiencias.filter((a) => a.fecha === hoy).length
    const pendientes = audiencias.filter((a) => a.estado === 'pendiente' || a.estado === 'en_curso').length
    const enRevision = audiencias.filter((a) => a.estado === 'en_revision').length

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
            {/* Header */}
            <header className="px-8 py-6 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-4">
                    <div className="logo-monogram">J</div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                            JudiScribe
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sistema de Transcripción Judicial</p>
                    </div>
                </div>
                <button
                    onClick={() => router.push('/audiencia/demo')}
                    className="btn-primary">
                    Iniciar
                </button>
            </header>

            <main className="max-w-6xl mx-auto px-8 py-10">
                {/* Stats - Números grandes minimalistas */}
                <div className="grid grid-cols-3 gap-6 mb-10">
                    {[
                        { label: 'Hoy', value: audienciasHoy },
                        { label: 'Pendientes', value: pendientes },
                        { label: 'En revisión', value: enRevision },
                    ].map((stat) => (
                        <div key={stat.label} className="stat-card animate-fade-in">
                            <span className="stat-card__value">{stat.value}</span>
                            <span className="stat-card__label">{stat.label}</span>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Audiencias</h2>
                    <button
                        onClick={() => router.push('/audiencia/nueva')}
                        className="btn-secondary">
                        <span style={{ fontSize: '16px', fontWeight: 300 }}>+</span>
                        Nueva
                    </button>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 rounded-xl skeleton-shimmer" />
                        ))}
                    </div>
                ) : audiencias.length === 0 ? (
                    <div className="rounded-2xl p-16 text-center"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                        {/* Líneas minimalistas como empty state */}
                        <div className="empty-state-lines mb-6">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <p className="text-base font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>No hay audiencias registradas</p>
                        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Crea una nueva audiencia o inicia una transcripción rápida</p>
                        <button
                            onClick={() => router.push('/audiencia/demo')}
                            className="btn-primary">
                            Iniciar transcripción
                        </button>
                    </div>
                ) : (
                    <div className="rounded-2xl overflow-hidden"
                        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                    {['Expediente', 'Tipo', 'Juzgado', 'Fecha', 'Estado', ''].map((h) => (
                                        <th key={h} className="text-left px-5 py-3.5 text-xs font-medium uppercase tracking-wider"
                                            style={{ color: 'var(--text-muted)' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {audiencias.map((a) => {
                                    const estado = ESTADO_COLORS[a.estado] || ESTADO_COLORS.pendiente
                                    return (
                                        <tr key={a.id}
                                            className="cursor-pointer transition-colors hover:brightness-110"
                                            style={{ borderBottom: '1px solid var(--border-subtle)' }}
                                            onClick={() => router.push(`/audiencia/${a.id}`)}>
                                            <td className="px-5 py-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {a.expediente}
                                            </td>
                                            <td className="px-5 py-4" style={{ color: 'var(--text-secondary)' }}>
                                                {a.tipo_audiencia}
                                            </td>
                                            <td className="px-5 py-4 max-w-[200px] truncate" style={{ color: 'var(--text-secondary)' }}>
                                                {a.juzgado}
                                            </td>
                                            <td className="px-5 py-4" style={{ color: 'var(--text-secondary)' }}>{a.fecha}</td>
                                            <td className="px-5 py-4">
                                                <span className="px-2.5 py-1 rounded-full text-xs font-medium"
                                                    style={{ background: estado.bg, color: estado.text }}>
                                                    {estado.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span style={{ color: 'var(--text-muted)' }}>→</span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    )
}
