const MOBULA_API_KEY = import.meta.env.MOBULA_KEY

const BASE_URL = 'https://api.mobula.io/api/1'

export interface TokenPrice {
  price: number
  priceChange5m: number
  symbol: string
  name: string
}

export interface Trade {
  hash: string
  from: string
  to: string
  amount: number
  timestamp: number
  type: 'buy' | 'sell'
}

export const mobulaService = {
  async getTokenPrice(tokenAddress: string): Promise<TokenPrice> {
    const response = await fetch(
      `${BASE_URL}/market/data?asset=${tokenAddress}`,
      {
        headers: {
          'Authorization': MOBULA_API_KEY || ''
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch token price')
    }

    const data = await response.json()
    return {
      price: data.data.price || 0,
      priceChange5m: data.data.price_change_5m || 0,
      symbol: data.data.symbol || '',
      name: data.data.name || ''
    }
  },

  async getRecentTrades(tokenAddress: string, limit: number = 20): Promise<Trade[]> {
    const response = await fetch(
      `${BASE_URL}/market/trades?asset=${tokenAddress}&limit=${limit}`,
      {
        headers: {
          'Authorization': MOBULA_API_KEY || ''
        }
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch trades')
    }

    const data = await response.json()
    return data.data.trades || []
  }
}
