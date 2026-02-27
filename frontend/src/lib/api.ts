/**
 * Axios instance configured for JudiScribe API.
 * En cliente usa apiBaseUrl() para soportar acceso desde otras PCs (Dokploy).
 */
import axios from 'axios'
import { apiBaseUrl } from '@/lib/urls'

const api = axios.create({
    baseURL: typeof window !== 'undefined' ? apiBaseUrl() : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'),
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor — baseURL en cliente (por si se hidrata después) y JWT
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        config.baseURL = apiBaseUrl()
        const token = localStorage.getItem('access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
    }
    return config
})

// Response interceptor — handle 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Could implement refresh token logic here
            if (typeof window !== 'undefined') {
                localStorage.removeItem('access_token')
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default api
