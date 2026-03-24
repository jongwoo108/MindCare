import { create } from 'zustand'
import type { ReviewItem } from '../api/expert'

interface ExpertState {
  queue: ReviewItem[]
  pendingCount: number
  isConnected: boolean
  // 액션
  setQueue: (items: ReviewItem[]) => void
  addToQueue: (item: ReviewItem) => void
  removeFromQueue: (id: string) => void
  updateStatus: (id: string, status: ReviewItem['status']) => void
  setPendingCount: (n: number) => void
  setConnected: (v: boolean) => void
}

export const useExpertStore = create<ExpertState>((set) => ({
  queue: [],
  pendingCount: 0,
  isConnected: false,

  setQueue: (items) => set({ queue: items, pendingCount: items.filter(i => i.status === 'pending').length }),
  addToQueue: (item) => set((s) => ({
    queue: [item, ...s.queue],
    pendingCount: s.pendingCount + 1,
  })),
  removeFromQueue: (id) => set((s) => ({
    queue: s.queue.filter(i => i.id !== id),
  })),
  updateStatus: (id, status) => set((s) => ({
    queue: s.queue.map(i => i.id === id ? { ...i, status } : i),
    pendingCount: Math.max(0, s.pendingCount - 1),
  })),
  setPendingCount: (n) => set({ pendingCount: n }),
  setConnected: (v) => set({ isConnected: v }),
}))
