import { create } from 'zustand'
import { websocketService } from '../services/websocketService'
import type { TokenPrice, Trade } from '../services/websocketService'

interface WebSocketStore {
  prices: Map<string, TokenPrice>
  trades: Map<string, Trade[]>
  setPriceData: (tokenAddress: string, price: TokenPrice) => void
  setTradeData: (tokenAddress: string, trade: Trade) => void
  subscribeToPriceUpdates: (tokenAddress: string) => Promise<void>
  unsubscribeFromPriceUpdates: (tokenAddress: string) => void
  subscribeToTrades: (tokenAddress: string) => Promise<void>
  unsubscribeFromTrades: (tokenAddress: string) => void
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

    setPriceData: (tokenAddress: string, price: TokenPrice) => {
      set((state) => {
        const newPrices = new Map(state.prices)
        newPrices.set(tokenAddress, price)
        return { prices: newPrices }
      })
    },

    setTradeData: (tokenAddress: string, trade: Trade) => {
      set((state) => {
        const newTrades = new Map(state.trades)
        const existingTrades = newTrades.get(tokenAddress) || []

        const tradeExists = existingTrades.some(t => t.originalHash === trade.originalHash)

        if (!tradeExists) {
          newTrades.set(tokenAddress, [trade, ...existingTrades.slice(0, 19)])
        }

        return { trades: newTrades }
      })
    },

    subscribeToPriceUpdates: async (tokenAddress: string) => {
      const initialData = await websocketService.fetchInitialTokenData(tokenAddress)
      if (initialData) {
        set((state) => {
          const newPrices = new Map(state.prices)
          newPrices.set(tokenAddress, initialData)
          return { prices: newPrices }
        })
      }
      await websocketService.subscribe(tokenAddress)
    },

    unsubscribeFromPriceUpdates: (tokenAddress: string) => {
      websocketService.unsubscribe(tokenAddress)
    },

    subscribeToTrades: async (tokenAddress: string) => {
      const initialTrades = await websocketService.fetchInitialTrades(tokenAddress)
      if (initialTrades.length > 0) {
        set((state) => {
          const newTrades = new Map(state.trades)
          newTrades.set(tokenAddress, initialTrades)
          return { trades: newTrades }
        })
      }
      await websocketService.subscribe(tokenAddress)
    },

    unsubscribeFromTrades: (tokenAddress: string) => {
      websocketService.unsubscribe(tokenAddress)
    }
  }
})
