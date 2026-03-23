import { create } from 'zustand'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent?: string
  risk_level?: number
  therapeutic_approach?: string
  safety_flags?: string[]
  crisis_escalated?: boolean
  timestamp: Date
}

interface ChatState {
  messages: Message[]
  sessionId: string | null
  isConnected: boolean
  isThinking: boolean
  addMessage: (msg: Message) => void
  setSession: (id: string) => void
  setConnected: (v: boolean) => void
  setThinking: (v: boolean) => void
  reset: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  sessionId: null,
  isConnected: false,
  isThinking: false,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setSession: (id) => set({ sessionId: id }),
  setConnected: (v) => set({ isConnected: v }),
  setThinking: (v) => set({ isThinking: v }),
  reset: () => set({ messages: [], sessionId: null, isConnected: false, isThinking: false }),
}))
