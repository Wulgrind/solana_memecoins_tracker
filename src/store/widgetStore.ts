import { create } from 'zustand'
import { urlSyncService } from '../services/urlSyncService'

export interface Widget {
  id: string
  type: string
  title: string
  tokenAddress: string
  x: number
  y: number
}

interface WidgetStore {
  widgets: Widget[]
  isModalOpen: boolean
  selectedWidgetType: { type: string; title: string } | null
  contractAddress: string

  addWidget: (type: string, title: string, tokenAddress: string) => void
  updateWidget: (id: string, updates: Partial<Widget>) => void
  updateWidgets: (widgets: Widget[]) => void
  updateWidgetPosition: (id: string, x: number, y: number) => void
  removeWidget: (id: string) => void
  openModal: () => void
  closeModal: () => void
  selectWidgetType: (type: string, title: string) => void
  setContractAddress: (address: string) => void
  resetModalState: () => void
  initializeFromURL: () => void
}

export const useWidgetStore = create<WidgetStore>((set) => ({
  widgets: [],
  isModalOpen: false,
  selectedWidgetType: null,
  contractAddress: '',

  initializeFromURL: () => {
    const widgets = urlSyncService.getWidgetsFromURL()
    if (widgets.length > 0) {
      set({ widgets })
    }
  },

  addWidget: (type, title, tokenAddress) =>
    set((state) => {
      const horizontalOffset = 480
      const verticalOffset = 500
      const maxPerRow = 3
      const widgetCount = state.widgets.length
      const row = Math.floor(widgetCount / maxPerRow)
      const col = widgetCount % maxPerRow

      const x = 50 + (col * horizontalOffset)
      const y = 50 + (row * verticalOffset)

      const newWidgets = [
        ...state.widgets,
        {
          id: `widget-${Date.now()}`,
          type,
          title,
          tokenAddress,
          x,
          y,
        },
      ]

      urlSyncService.updateURL(newWidgets)

      return {
        widgets: newWidgets,
        isModalOpen: false,
        selectedWidgetType: null,
        contractAddress: '',
      }
    }),

  updateWidget: (id, updates) =>
    set((state) => {
      const newWidgets = state.widgets.map((widget) =>
        widget.id === id ? { ...widget, ...updates } : widget
      )
      urlSyncService.updateURL(newWidgets)
      return { widgets: newWidgets }
    }),

  updateWidgets: (widgets) => {
    urlSyncService.updateURL(widgets)
    set({ widgets })
  },

  updateWidgetPosition: (id, x, y) =>
    set((state) => {
      const newWidgets = state.widgets.map((widget) =>
        widget.id === id ? { ...widget, x: Math.max(0, x), y: Math.max(0, y) } : widget
      )
      urlSyncService.updateURL(newWidgets)
      return { widgets: newWidgets }
    }),

  removeWidget: (id) =>
    set((state) => {
      const newWidgets = state.widgets.filter((widget) => widget.id !== id)
      urlSyncService.updateURL(newWidgets)
      return { widgets: newWidgets }
    }),

  openModal: () => set({ isModalOpen: true }),

  closeModal: () =>
    set({
      isModalOpen: false,
      selectedWidgetType: null,
      contractAddress: '',
    }),

  selectWidgetType: (type, title) =>
    set({ selectedWidgetType: type && title ? { type, title } : null }),

  setContractAddress: (address) => set({ contractAddress: address }),

  resetModalState: () =>
    set({
      selectedWidgetType: null,
      contractAddress: '',
    }),
}))
