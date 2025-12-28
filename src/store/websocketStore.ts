import { create } from 'zustand'
import { websocketService } from '../services/websocketService'
import { useWidgetStore } from './widgetStore'
import type { TokenPrice, Trade } from '../services/websocketService'

interface WebSocketStore {
  prices: Map<string, TokenPrice>
  trades: Map<string, Trade[]>
  subscribe: (tokenAddress: string) => Promise<void>
  unsubscribe: (tokenAddress: string) => void
}

export const useWebSocketStore = create<WebSocketStore>((set) => {
  websocketService.setCallbacks({
    onPriceUpdate: (tokenAddress: string, price: TokenPrice) => {
      set((state) => {
        const newPrices = new Map(state.prices)
        newPrices.set(tokenAddress, price)
        return { prices: newPrices }
      })
    },
    onTradeUpdate: (tokenAddress: string, trade: Trade) => {
      set((state) => {
        const newTrades = new Map(state.trades)
        const existingTrades = newTrades.get(tokenAddress) || []

        const tradeExists = existingTrades.some(t => t.originalHash === trade.originalHash)

        if (!tradeExists) {
          newTrades.set(tokenAddress, [trade, ...existingTrades.slice(0, 19)])
        }

        return { trades: newTrades }
      })
    }
  })

  return {
    prices: new Map(),
    trades: new Map(),

    subscribe: async (tokenAddress: string) => {
      const [initialData, initialTrades] = await Promise.all([
        websocketService.fetchInitialTokenData(tokenAddress),
        websocketService.fetchInitialTrades(tokenAddress)
      ])

      set((state) => {
        const newPrices = new Map(state.prices)
        const newTrades = new Map(state.trades)

        if (initialData) {
          newPrices.set(tokenAddress, initialData)
        }

        if (initialTrades.length > 0) {
          newTrades.set(tokenAddress, initialTrades)
        }

        return { prices: newPrices, trades: newTrades }
      })

      await websocketService.subscribe(tokenAddress)
    },

    unsubscribe: (tokenAddress: string) => {
      const widgets = useWidgetStore.getState().widgets
      const widgetsWithSameToken = widgets.filter(w => w.tokenAddress === tokenAddress)

      if (widgetsWithSameToken.length === 0) {
        websocketService.unsubscribe(tokenAddress)
      }
    }
  }
})
