/**
 * Auth store — manages JWT token and current user state.
 */
import { create } from 'zustand'
import api from '@/lib/api'
import type { User, LoginRequest, TokenResponse } from '@/types'

interface AuthState {
    user: User | null
    token: string | null
    isLoading: boolean
    error: string | null

    login: (credentials: LoginRequest) => Promise<boolean>
    logout: () => void
    fetchUser: () => Promise<void>
    initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: typeof window !== 'undefined' ? localStorage.getItem('access_token') : null,
    isLoading: false,
    error: null,

    login: async (credentials) => {
        set({ isLoading: true, error: null })
        try {
            const { data } = await api.post<TokenResponse>('/api/auth/login', credentials)
            localStorage.setItem('access_token', data.access_token)
            set({ token: data.access_token, isLoading: false })
            await get().fetchUser()
            return true
        } catch (err: any) {
            set({
                isLoading: false,
                error: err.response?.data?.detail || 'Error al iniciar sesión',
            })
            return false
        }
    },

    logout: () => {
        localStorage.removeItem('access_token')
        set({ user: null, token: null })
    },

    fetchUser: async () => {
        try {
            const { data } = await api.get<User>('/api/auth/me')
            set({ user: data })
        } catch {
            set({ user: null, token: null })
            localStorage.removeItem('access_token')
        }
    },

    initialize: async () => {
        const token = localStorage.getItem('access_token')
        if (token) {
            set({ token })
            await get().fetchUser()
        }
    },
}))
