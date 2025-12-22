import { create } from 'zustand'

const WS_URL = import.meta.env.VITE_WS_URL
const API_KEY = import.meta.env.VITE_MOBULA_KEY
const API_BASE = 'https://api.mobula.io/api/1'

interface WebSocketStore {
  prices: Map<string, TokenPrice>
  trades: Map<string, Trade[]>
  subscribeToPriceUpdates: (tokenAddress: string, blockchain?: string) => void
  unsubscribeFromPriceUpdates: (tokenAddress: string) => void
  subscribeToTrades: (tokenAddress: string, blockchain?: string) => void
  unsubscribeFromTrades: (tokenAddress: string) => void
}

interface TokenPrice {
  price: number
  priceChange24h: number
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
let pingInterval: number | null = null
const poolSubscriptions = new Map<string, { blockchain: string; address: string }>()
const tokenToPool = new Map<string, string>()
let storeInitialized = false

async function fetchSolanaPrice(): Promise<number> {
  try {
    const response = await fetch(`${API_BASE}/market/data?asset=So11111111111111111111111111111111111111112`, {
      headers: {
        'Authorization': API_KEY
      }
    })

    if (!response.ok) {
      console.warn('Could not fetch Solana price')
      return 0
    }

    const data = await response.json()
    return parseFloat(data.data?.price) || 0
  } catch (error) {
    console.error('Error fetching Solana price:', error)
    return 0
  }
}

async function fetchInitialTokenData(tokenAddress: string): Promise<TokenPrice | null> {
  try {
    const response = await fetch(`${API_BASE}/market/data?asset=${tokenAddress}`, {
      headers: {
        'Authorization': API_KEY
      }
    })

    if (!response.ok) {
      console.warn('Could not fetch initial data for token:', tokenAddress)
      return null
    }

    const data = await response.json()
    console.log('Initial data for', tokenAddress, ':', data)

    if (data.data) {
      const isSolana = data.data.symbol?.toUpperCase() === 'SOL' || data.data.name?.toLowerCase() === 'solana'

      let priceSol = 1
      if (!isSolana) {
        const solPrice = await fetchSolanaPrice()
        const tokenPriceUSD = parseFloat(data.data.price) || 0
        priceSol = solPrice > 0 ? tokenPriceUSD / solPrice : 0
      }

      return {
        price: parseFloat(data.data.price) || 0,
        priceChange24h: parseFloat(data.data.price_change_24h),
        symbol: data.data.symbol,
        name: data.data.name,
        priceSol: priceSol,
        tokenAddress: tokenAddress
      }
    }

    return null
  } catch (error) {
    console.error('Error fetching initial token data:', error)
    return null
  }
}

async function getPoolsForToken(tokenAddress: string): Promise<{ blockchain: string; address: string }[]> {
  try {
    const response = await fetch(`${API_BASE}/market/pairs?asset=${tokenAddress}&blockchain=Solana`, {
      headers: {
        'Authorization': API_KEY || ''
      }
    })

    if (!response.ok) {
      console.warn('Could not fetch pairs for token, using token address directly:', tokenAddress)
      return [{
        blockchain: 'Solana',
        address: tokenAddress
      }]
    }

    const data = await response.json()
    console.log('Pools response for', tokenAddress, ':', data)

    if (data.data && data.data.pairs && Array.isArray(data.data.pairs) && data.data.pairs.length > 0) {
      return data.data.pairs.slice(0, 3).map((pair: any) => ({
        blockchain: pair.blockchain || 'Solana',
        address: pair.address
      }))
    }

    console.warn('No pairs found in API response, using token address directly')
    return [{
      blockchain: 'Solana',
      address: tokenAddress
    }]
  } catch (error) {
    console.error('Error fetching pools, using token address directly:', error)
    return [{
      blockchain: 'Solana',
      address: tokenAddress
    }]
  }
}

function connectWebSocket(set: (fn: (state: WebSocketStore) => Partial<WebSocketStore>) => void) {
  if (ws || storeInitialized) {
    return
  }

  storeInitialized = true
  ws = new WebSocket(WS_URL)

  ws.onopen = () => {
    console.log('WebSocket connected to Mobula')

    if (poolSubscriptions.size > 0) {
      const pools = Array.from(poolSubscriptions.values())
      ws?.send(JSON.stringify({
        type: 'market-details',
        authorization: API_KEY,
        payload: {
          pools: pools,
          subscriptionTracking: true
        }
      }))
      console.log('Subscribed to pools:', pools)
    }

    if (pingInterval) {
      clearInterval(pingInterval)
    }
    pingInterval = window.setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event: 'ping' }))
      }
    }, 30000)
  }

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data)
      console.log('Received message:', JSON.stringify(message, null, 2))

      if (message && message.pairData) {
        const pairData = message.pairData
        const poolAddress = message.pair

        let tokenAddress = poolAddress
        for (const [token, pool] of tokenToPool.entries()) {
          if (pool === poolAddress) {
            tokenAddress = token
            break
          }
        }

        if (pairData.base) {
          const isSolana = pairData.base.symbol?.toUpperCase() === 'SOL' || pairData.base.name?.toLowerCase() === 'solana'

          const priceData: TokenPrice = {
            price: parseFloat(pairData.base.priceUSD) || 0,
            priceChange24h: parseFloat(pairData.priceChange24hPercentage || 0),
            symbol: pairData.base.symbol,
            name: pairData.base.name ,
            priceSol: isSolana ? 1 : parseFloat(pairData.base.priceToken),
            tokenAddress: tokenAddress
          }

          console.log('Setting price data:', priceData)
          set((state) => {
            const newPrices = new Map(state.prices)
            newPrices.set(tokenAddress, priceData)
            return { prices: newPrices }
          })
        }

        if (message.trade) {
          const trade = message.trade
          const newTrade: Trade = {
            hash: trade.txHash || `tx-${Date.now()}`,
            from: trade.sender || 'Unknown',
            to: trade.maker || 'Unknown',
            amount: parseFloat(trade.amountToken0 || trade.amountToken1 || 0),
            timestamp: trade.timestamp || Date.now() / 1000,
            type: trade.type === 'buy' ? 'buy' : 'sell'
          }

          set((state) => {
            const newTrades = new Map(state.trades)
            const existingTrades = newTrades.get(tokenAddress) || []
            newTrades.set(tokenAddress, [newTrade, ...existingTrades.slice(0, 19)])
            return { trades: newTrades }
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

    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }

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

    subscribeToPriceUpdates: async (tokenAddress: string) => {
      const initialData = await fetchInitialTokenData(tokenAddress)
      if (initialData) {
        set((state) => {
          const newPrices = new Map(state.prices)
          newPrices.set(tokenAddress, initialData)
          return { prices: newPrices }
        })
      }

      const pools = await getPoolsForToken(tokenAddress)

      if (pools.length === 0) {
        console.error('No pools found for token:', tokenAddress)
        return
      }

      const pool = pools[0]
      poolSubscriptions.set(tokenAddress, pool)
      tokenToPool.set(tokenAddress, pool.address)
      console.log(Array.from(poolSubscriptions.values()))
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'market-details',
          authorization: API_KEY,
          payload: {
            pools: Array.from(poolSubscriptions.values()),
            subscriptionTracking: true
          }
        }))
        console.log('Subscribed to pool:', pool)
      } else if (!ws && storeSetFn) {
        connectWebSocket(storeSetFn)
      }
    },

    unsubscribeFromPriceUpdates: (tokenAddress: string) => {
      const pool = poolSubscriptions.get(tokenAddress)

      if (pool && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'unsubscribe',
          authorization: API_KEY,
          payload: {
            type: 'market-details',
            pools: [pool]
          }
        }))
      }

      poolSubscriptions.delete(tokenAddress)
      tokenToPool.delete(tokenAddress)
    },

    subscribeToTrades: async (tokenAddress: string) => {
      const pools = await getPoolsForToken(tokenAddress)

      if (pools.length === 0) {
        console.error('No pools found for token:', tokenAddress)
        return
      }

      const pool = pools[0]
      poolSubscriptions.set(tokenAddress, pool)
      tokenToPool.set(tokenAddress, pool.address)

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'market-details',
          authorization: API_KEY,
          payload: {
            pools: Array.from(poolSubscriptions.values()),
            subscriptionTracking: true
          }
        }))
        console.log('Subscribed to trades for pool:', pool)
      } else if (!ws && storeSetFn) {
        connectWebSocket(storeSetFn)
      }
    },

    unsubscribeFromTrades: (tokenAddress: string) => {
      const pool = poolSubscriptions.get(tokenAddress)

      if (pool && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'unsubscribe',
          authorization: API_KEY,
          payload: {
            type: 'market-details',
            pools: [pool]
          }
        }))
      }

      poolSubscriptions.delete(tokenAddress)
      tokenToPool.delete(tokenAddress)
    }
  }
})
