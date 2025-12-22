import { create } from 'zustand'

const WS_URL = import.meta.env.VITE_WS_URL

interface WebSocketStore {
  prices: Map<string, TokenPrice>
  trades: Map<string, Trade[]>
  subscribeToPriceUpdates: (tokenAddress: string) => void
  unsubscribeFromPriceUpdates: (tokenAddress: string) => void
  subscribeToTrades: (tokenAddress: string) => void
  unsubscribeFromTrades: (tokenAddress: string) => void
}

interface TokenPrice {
  price: number
  priceChange5m: number
  symbol: string
  name: string
  priceSol?: number
  tokenAddress?: string
}

interface Trade {
  hash: string
  from: string
  to: string
  amount: number
  timestamp: number
  type: 'buy' | 'sell'
}



let ws: WebSocket | null = null
let reconnectTimeout: number | null = null
const priceSubscriptions = new Set<string>()
const tradeSubscriptions = new Set<string>()
let storeInitialized = false

function connectWebSocket(set: (fn: (state: WebSocketStore) => Partial<WebSocketStore>) => void) {
  if (ws || storeInitialized) {
    return
  }

  storeInitialized = true
  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.log('WebSocket connected')

    priceSubscriptions.forEach(tokenAddress => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          tokenAddress
        }))
      }
    })

    tradeSubscriptions.forEach(tokenAddress => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'subscribe_trades',
          tokenAddress
        }))
      }
    })
  }

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data)

      if (message.type === 'price_update') {
        const priceData: TokenPrice = message.data
        set((state) => {
          const newPrices = new Map(state.prices)
          newPrices.set(priceData.tokenAddress || '', priceData)
          return { prices: newPrices }
        })
      }

      if (message.type === 'trades_update') {
        const trades: Trade[] = message.data
        if (trades.length > 0) {
          tradeSubscriptions.forEach(tokenAddress => {
            set((state) => {
              const newTrades = new Map(state.trades)
              newTrades.set(tokenAddress, trades)
              return { trades: newTrades }
            })
          })
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
  }

  ws.onclose = () => {
    console.log('WebSocket disconnected, reconnecting in 3s...')
    ws = null
    storeInitialized = false

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
    }
    reconnectTimeout = window.setTimeout(() => {
      if (storeSetFn) {
        connectWebSocket(storeSetFn)
      }
    }, 3000)
  }
}

let storeSetFn: ((fn: (state: WebSocketStore) => Partial<WebSocketStore>) => void) | null = null

export const useWebSocketStore = create<WebSocketStore>((set) => {
  storeSetFn = set

  return {
    prices: new Map(),
    trades: new Map(),

    subscribeToPriceUpdates: (tokenAddress: string) => {
      priceSubscriptions.add(tokenAddress)

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          tokenAddress
        }))
      } else if (!ws && storeSetFn) {
        connectWebSocket(storeSetFn)
      }
    },

    unsubscribeFromPriceUpdates: (tokenAddress: string) => {
      priceSubscriptions.delete(tokenAddress)

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'unsubscribe',
          tokenAddress
        }))
      }
    },

    subscribeToTrades: (tokenAddress: string) => {
      tradeSubscriptions.add(tokenAddress)

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'subscribe_trades',
          tokenAddress
        }))
      } else if (!ws && storeSetFn) {
        connectWebSocket(storeSetFn)
      }
    },

    unsubscribeFromTrades: (tokenAddress: string) => {
      tradeSubscriptions.delete(tokenAddress)

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'unsubscribe_trades',
          tokenAddress
        }))
      }
    }
  }
})
