import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { User } from '@/types'
import { apiService } from '@/services/api'
import { devLog } from '@/utils/logger'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (credentials: { username: string; password: string }) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
  setToken: (token: string) => void
  clearError: () => void
  checkAuth: () => Promise<void>
}

type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        login: async (credentials) => {
          set({ isLoading: true, error: null })

          try {
            devLog('🔐 Business Center Login:', credentials.username)

            const data = await apiService.login(credentials.username, credentials.password)

            if (!data.user?.is_admin) {
              throw new Error('Acesso restrito a administradores do sistema')
            }

            devLog('✅ Admin login successful')

            apiService.setAuthToken(data.token)
            localStorage.setItem('user', JSON.stringify(data.user))

            set({
              user: data.user,
              token: data.token,
              isAuthenticated: true,
              isLoading: false,
            })
          } catch (error) {
            console.error('❌ Login error:', error)
            set({
              error: error instanceof Error ? error.message : 'Falha no login',
              isLoading: false,
            })
            throw error
          }
        },

        logout: () => {
          apiService.setAuthToken(null)
          localStorage.removeItem('user')

          set({
            ...initialState,
          })
        },

        setUser: (user) => {
          set({ user })
        },

        setToken: (token) => {
          apiService.setAuthToken(token)
          set({ token })
        },

        clearError: () => {
          set({ error: null })
        },

        checkAuth: async () => {
          const { token } = get()

          if (!token) {
            return
          }

          set({ isLoading: true })

          try {
            const response = await fetch('/auth/me', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })

            if (!response.ok) {
              throw new Error('Authentication check failed')
            }

            const userData = await response.json()

            if (!userData.is_admin) {
              throw new Error('Access denied: Admin privileges required')
            }

            set({
              user: userData,
              isAuthenticated: true,
              isLoading: false,
            })
          } catch (error) {
            set({
              ...initialState,
              error: error instanceof Error ? error.message : 'Authentication failed',
            })
          }
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({
          token: state.token,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
        onRehydrateStorage: () => (state) => {
          if (state?.token) {
            apiService.setAuthToken(state.token)
          }
        },
      }
    ),
    {
      name: 'auth-store',
    }
  )
)