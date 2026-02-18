import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  modalOpen: Record<string, boolean>
  openModal: (key: string) => void
  closeModal: (key: string) => void
  toggleModal: (key: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  modalOpen: {},
  openModal: (key) =>
    set((s) => ({ modalOpen: { ...s.modalOpen, [key]: true } })),
  closeModal: (key) =>
    set((s) => ({ modalOpen: { ...s.modalOpen, [key]: false } })),
  toggleModal: (key) =>
    set((s) => ({
      modalOpen: { ...s.modalOpen, [key]: !s.modalOpen[key] },
    })),
}))
