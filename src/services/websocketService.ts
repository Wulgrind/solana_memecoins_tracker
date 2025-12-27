const API_KEY = import.meta.env.VITE_MOBULA_KEY
const WS_URL = 'wss://api.mobula.io'
const API_BASE = 'https://api.mobula.io/api/1'

const SOLANA_ADDRESS_MAP: Record<string, string> = {
  'solana': 'So11111111111111111111111111111111111111112',
  'sol': 'So11111111111111111111111111111111111111112',
}

function normalizeSolanaAddress(input: string): string {
  const normalized = input.toLowerCase().trim()
  return SOLANA_ADDRESS_MAP[normalized] || input
}

export interface TokenPrice {
  price: number
  priceChange24h: number
  symbol: string
  name: string
  priceSol?: number
  tokenAddress?: string
}

export interface Trade {
  hash: string
  originalHash: string
  from: string
  to: string
  amount: number
  timestamp: number
  type: 'buy' | 'sell'
}

interface WebSocketCallbacks {
  onPriceUpdate: (tokenAddress: string, price: TokenPrice) => void
  onTradeUpdate: (tokenAddress: string, trade: Trade) => void
}

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectTimeout: number | null = null
  private pingInterval: number | null = null
  private poolSubscriptions = new Map<string, { blockchain: string; address: string }>()
  private tokenToPool = new Map<string, string>()
  private initialized = false
  private callbacks: WebSocketCallbacks | null = null

  async fetchSolanaPrice(): Promise<number> {
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

  async fetchInitialTokenData(tokenAddress: string): Promise<TokenPrice | null> {
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

      if (data.data) {
        const isSolana = data.data.symbol?.toUpperCase() === 'SOL' || data.data.name?.toLowerCase() === 'solana'

        let priceSol = 1
        if (!isSolana) {
          const solPrice = await this.fetchSolanaPrice()
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

  async fetchInitialTrades(tokenAddress: string): Promise<Trade[]> {
    try {
      const normalizedAddress = normalizeSolanaAddress(tokenAddress)
      const response = await fetch(`https://api.mobula.io/api/2/token/trades?blockchain=solana&address=${normalizedAddress}&limit=20&mode=asset`, {
        headers: {
          'Authorization': API_KEY
        }
      })

      if (!response.ok) {
        console.warn('Could not fetch initial trades for token:', tokenAddress)
        return []
      }

      const data = await response.json()

      if (data.data && Array.isArray(data.data)) {
        return data.data.map((trade: any, index: number) => {
          const originalHash = trade.transactionHash || trade.hash || `tx-${Date.now()}-${Math.random()}`
          return {
            hash: `${originalHash}-${index}`,
            originalHash: originalHash,
            from: trade.swapSenderAddress || trade.from || 'Unknown',
            to: trade.to || trade.receiver || 'Unknown',
            amount: parseFloat(trade.baseTokenAmount || trade.amount || 0),
            timestamp: trade.date ? new Date(trade.date).getTime() / 1000 : Date.now() / 1000,
            type: trade.type === 'sell' ? 'sell' : 'buy'
          }
        })
      }

      return []
    } catch (error) {
      console.error('Error fetching initial trades:', error)
      return []
    }
  }

  private async getPoolsForToken(tokenAddress: string): Promise<{ blockchain: string; address: string }[]> {
    try {
      const normalizedAddress = normalizeSolanaAddress(tokenAddress)

      const response = await fetch(`${API_BASE}/market/pairs?asset=${normalizedAddress}&blockchain=Solana`, {
        headers: {
          'Authorization': API_KEY
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

      if (data.data && data.data.pairs && Array.isArray(data.data.pairs) && data.data.pairs.length > 0) {
        if (normalizedAddress === 'So11111111111111111111111111111111111111112') {
          const sortedPools = [...data.data.pairs].sort((a: any, b: any) => {
            const liquidityA = parseFloat(a.liquidity || 0)
            const liquidityB = parseFloat(b.liquidity || 0)
            return liquidityB - liquidityA
          })

          return sortedPools.slice(0, 1).map((pair: any) => ({
            blockchain: pair.blockchain || 'Solana',
            address: pair.address
          }))
        }
        
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

  setCallbacks(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks
  }

  private connect() {
    if (this.ws || this.initialized) {
      return
    }

    this.initialized = true
    this.ws = new WebSocket(WS_URL)

    this.ws.onopen = () => {
      if (this.poolSubscriptions.size > 0) {
        const pools = Array.from(this.poolSubscriptions.values())
        this.ws?.send(JSON.stringify({
          type: 'market-details',
          authorization: API_KEY,
          payload: {
            pools: pools,
            subscriptionTracking: true
          }
        }))
      }

      if (this.pingInterval) {
        clearInterval(this.pingInterval)
      }
      this.pingInterval = window.setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ event: 'ping' }))
        }
      }, 30000)
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('WebSocket message received:', message)

        if (message && message.pairData) {
          const pairData = message.pairData
          const poolAddress = message.pair

          let tokenAddress = poolAddress
          for (const [token, pool] of this.tokenToPool.entries()) {
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
              symbol: isSolana ? 'SOL' : pairData.base.symbol,
              name: isSolana ? 'Solana' : pairData.base.name,
              priceSol: isSolana ? 1 : parseFloat(pairData.base.priceToken),
              tokenAddress: tokenAddress
            }

            this.callbacks?.onPriceUpdate(tokenAddress, priceData)
          }

          if (message.hash && message.type && message.token_amount) {
            const newTrade: Trade = {
              hash: `${message.hash}-${Date.now()}`,
              originalHash: message.hash,
              from: message.sender || 'Unknown',
              to: message.swapRecipient || 'Unknown',
              amount: parseFloat(message.token_amount || 0),
              timestamp: message.date ? message.date / 1000 : Date.now() / 1000,
              type: message.type === 'sell' ? 'sell' : 'buy'
            }

            this.callbacks?.onTradeUpdate(tokenAddress, newTrade)
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = () => {
      this.ws = null
      this.initialized = false

      if (this.pingInterval) {
        clearInterval(this.pingInterval)
        this.pingInterval = null
      }

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
      }
      this.reconnectTimeout = window.setTimeout(() => {
        this.connect()
      }, 3000)
    }
  }

  async subscribe(tokenAddress: string) {
    const pools = await this.getPoolsForToken(tokenAddress)

    if (pools.length === 0) {
      console.error('No pools found for token:', tokenAddress)
      return
    }

    const pool = pools[0]
    this.poolSubscriptions.set(tokenAddress, pool)
    this.tokenToPool.set(tokenAddress, pool.address)

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'market-details',
        authorization: API_KEY,
        payload: {
          pools: Array.from(this.poolSubscriptions.values()),
          subscriptionTracking: true
        }
      }))
    } else if (!this.ws) {
      this.connect()
    }
  }

  unsubscribe(tokenAddress: string) {
    const pool = this.poolSubscriptions.get(tokenAddress)

    if (pool && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        authorization: API_KEY,
        payload: {
          type: 'market-details',
          pools: [pool]
        }
      }))
    }

    this.poolSubscriptions.delete(tokenAddress)
    this.tokenToPool.delete(tokenAddress)
  }
}

export const websocketService = new WebSocketService()
