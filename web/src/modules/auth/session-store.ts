import { create } from 'zustand'

export type CurrentUser = {
  id: number
  username: string
  displayName: string
  enabled: boolean
  roles: string[]
}

type SessionState = {
  initialized: boolean
  user: CurrentUser | null
  setInitialized: (initialized: boolean) => void
  setUser: (user: CurrentUser | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  initialized: false,
  user: null,
  setInitialized: (initialized) => set({ initialized }),
  setUser: (user) => set({ user }),
}))

export function clearSession() {
  useSessionStore.setState({ initialized: true, user: null })
}
