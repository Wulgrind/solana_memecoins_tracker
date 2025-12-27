import { useState, useEffect } from 'react'
import { useWebSocketStore } from '../store/websocketStore'

interface TradeFeedWidgetProps {
  tokenAddress: string
}

function TradeFeedWidget({ tokenAddress }: TradeFeedWidgetProps) {
  const allTrades = useWebSocketStore((state) => state.trades)
  const prices = useWebSocketStore((state) => state.prices)
  const subscribeToTrades = useWebSocketStore((state) => state.subscribeToTrades)
  const unsubscribeFromTrades = useWebSocketStore((state) => state.unsubscribeFromTrades)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const trades = allTrades.get(tokenAddress) || []
  const priceData = prices.get(tokenAddress) || null

  const shortenAddress = (address: string) => {
    if (address.length <= 12) return address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getDisplayTitle = () => {
    if (priceData?.name && priceData?.symbol) {
      return `${priceData.name} (${priceData.symbol})`
    }
    return shortenAddress(tokenAddress)
  }

  useEffect(() => {
    subscribeToTrades(tokenAddress)

    return () => {
      unsubscribeFromTrades(tokenAddress)
    }
  }, [tokenAddress])

  useEffect(() => {
    if (trades.length > 0) {
      setLoading(false)
      setError(null)
    } else {
      const timeout = setTimeout(() => {
        if (trades.length === 0) {
          setError('Failed to fetch trades')
          setLoading(false)
        }
      }, 10000)

      return () => clearTimeout(timeout)
    }
  }, [trades])

  if (loading && trades.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg border-2 border-[#081849] min-w-[320px] max-w-[450px] overflow-hidden">
        <div className="bg-[#081849] text-center px-6 py-4">
          <h3 className="text-xl font-bold text-white">
            {getDisplayTitle()}
          </h3>
        </div>
        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-600 mb-4">Trade Feed</h4>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg border-2 border-[#081849] min-w-[320px] max-w-[450px] overflow-hidden">
        <div className="bg-[#081849] text-center px-6 py-4">
          <h3 className="text-xl font-bold text-white">
            {getDisplayTitle()}
          </h3>
        </div>
        <div className="p-6">
          <h4 className="text-sm font-semibold text-gray-600 mb-4">Trade Feed</h4>
          <div className="text-red-600">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-[#081849] min-w-[320px] max-w-[450px] overflow-hidden">
      <div className="bg-[#081849] text-center px-6 py-4">
        <h3 className="text-xl font-bold text-white">
          {getDisplayTitle()}
        </h3>
      </div>
      <div className="p-6">
        <h4 className="text-sm font-semibold text-gray-600 mb-4">Trade Feed</h4>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {trades.length === 0 ? (
          <div className="text-sm text-gray-600">No recent trades</div>
        ) : (
          trades.map((trade) => (
            <div
              key={trade.hash}
              className={`p-3 rounded-lg border-l-4 ${
                trade.type === 'buy' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`font-bold text-sm ${
                  trade.type === 'buy' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {trade.type.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(trade.timestamp * 1000).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-800 mb-1">
                {trade.amount.toLocaleString()} tokens
              </div>
              <div className="text-xs text-gray-600 truncate">
                From: {trade.from.slice(0, 6)}...{trade.from.slice(-4)}
              </div>
              <a
                href={`https://solscan.io/tx/${trade.originalHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
              >
                View on Solscan
              </a>
            </div>
          ))
        )}
      </div>
        <div className="text-xs text-gray-500 mt-4 text-right">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

export default TradeFeedWidget
