import WebSocket, { WebSocketServer } from 'ws'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const MOBULA_API_KEY = process.env.VITE_MOBULA_KEY
const BASE_URL = 'https://api.mobula.io/api/1'
const PORT = 8080

const wss = new WebSocketServer({ port: PORT })

const priceSubscriptions = new Map()
const tradeSubscriptions = new Map()

async function getSolPrice() {
  try {
    const response = await fetch(`${BASE_URL}/market/data?asset=solana`, {
      headers: {
        'Authorization': MOBULA_API_KEY || ''
      }
    })
    if (!response.ok) return 0
    const data = await response.json()
    return data.data.price || 0
  } catch {
    return 0
  }
}

async function getTokenPrice(tokenAddress) {
  try {
    const response = await fetch(`${BASE_URL}/market/data?asset=${tokenAddress}`, {
      headers: {
        'Authorization': MOBULA_API_KEY || ''
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error (${response.status}):`, errorText)
      throw new Error(`Failed to fetch token price: ${response.status}`)
    }

    const data = await response.json()
    const tokenPriceUSD = data.data.price || 0

    let priceSol = 0
    const solPriceUSD = await getSolPrice()
    if (solPriceUSD > 0) {
      priceSol = tokenPriceUSD / solPriceUSD
    }

    const priceChange24h = data.data.price_change_24h || 0
    const priceChange24hRounded = Math.round(priceChange24h * 100) / 100

    return {
      price: tokenPriceUSD,
      priceChange24h: priceChange24hRounded,
      symbol: data.data.symbol || '',
      name: data.data.name || '',
      priceSol: priceSol,
      tokenAddress
    }
  } catch (error) {
    console.error(`Error fetching price for ${tokenAddress}:`, error)
    return null
  }
}

async function getRecentTrades(tokenAddress, limit = 20) {
  try {
    const response = await fetch(`${BASE_URL}/market/history?asset=${tokenAddress}`, {
      headers: {
        'Authorization': MOBULA_API_KEY || ''
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error for trades (${response.status}):`, errorText)
      throw new Error(`Failed to fetch trades: ${response.status}`)
    }

    const data = await response.json()

    if (data.data && Array.isArray(data.data)) {
      return data.data.slice(0, limit).map((trade) => ({
        hash: trade.hash || trade.tx_hash || `tx-${Date.now()}-${Math.random()}`,
        from: trade.from || trade.maker || 'Unknown',
        to: trade.to || trade.taker || 'Unknown',
        amount: trade.amount || trade.volume || 0,
        timestamp: trade.timestamp || trade.date || Date.now() / 1000,
        type: trade.type || (trade.side === 'buy' ? 'buy' : 'sell')
      }))
    }

    return []
  } catch (error) {
    console.error(`Error fetching trades for ${tokenAddress}:`, error)
    return []
  }
}

async function fetchAndBroadcastPrices() {
  for (const [tokenAddress, clients] of priceSubscriptions.entries()) {
    if (clients.size === 0) {
      priceSubscriptions.delete(tokenAddress)
      continue
    }

    const priceData = await getTokenPrice(tokenAddress)
    if (!priceData) continue

    const message = JSON.stringify({
      type: 'price_update',
      data: priceData
    })

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }
}

async function fetchAndBroadcastTrades() {
  for (const [tokenAddress, clients] of tradeSubscriptions.entries()) {
    if (clients.size === 0) {
      tradeSubscriptions.delete(tokenAddress)
      continue
    }

    const trades = await getRecentTrades(tokenAddress)
    if (trades.length === 0) continue

    const message = JSON.stringify({
      type: 'trades_update',
      data: trades
    })

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }
}

setInterval(fetchAndBroadcastPrices, 1000)

setInterval(fetchAndBroadcastTrades, 1000)

wss.on('connection', (ws) => {
  console.log('Client connected')

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())

      if (data.type === 'subscribe') {
        const tokenAddress = data.tokenAddress

        if (!priceSubscriptions.has(tokenAddress)) {
          priceSubscriptions.set(tokenAddress, new Set())
        }

        priceSubscriptions.get(tokenAddress).add(ws)
        console.log(`Client subscribed to prices for ${tokenAddress}`)

        getTokenPrice(tokenAddress).then(priceData => {
          if (priceData && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'price_update',
              data: priceData
            }))
          }
        })
      }

      if (data.type === 'unsubscribe') {
        const tokenAddress = data.tokenAddress

        if (priceSubscriptions.has(tokenAddress)) {
          priceSubscriptions.get(tokenAddress).delete(ws)
          console.log(`Client unsubscribed from prices for ${tokenAddress}`)
        }
      }

      if (data.type === 'subscribe_trades') {
        const tokenAddress = data.tokenAddress

        if (!tradeSubscriptions.has(tokenAddress)) {
          tradeSubscriptions.set(tokenAddress, new Set())
        }

        tradeSubscriptions.get(tokenAddress).add(ws)
        console.log(`Client subscribed to trades for ${tokenAddress}`)

        getRecentTrades(tokenAddress).then(trades => {
          if (trades.length > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'trades_update',
              data: trades
            }))
          }
        })
      }

      if (data.type === 'unsubscribe_trades') {
        const tokenAddress = data.tokenAddress

        if (tradeSubscriptions.has(tokenAddress)) {
          tradeSubscriptions.get(tokenAddress).delete(ws)
          console.log(`Client unsubscribed from trades for ${tokenAddress}`)
        }
      }
    } catch (error) {
      console.error('Error handling message:', error)
    }
  })

  ws.on('close', () => {
    for (const clients of priceSubscriptions.values()) {
      clients.delete(ws)
    }
    for (const clients of tradeSubscriptions.values()) {
      clients.delete(ws)
    }
    console.log('Client disconnected')
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

console.log(`WebSocket server running on ws://localhost:${PORT}`)
