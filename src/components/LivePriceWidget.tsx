import { useState, useEffect } from 'react'
import { useWebSocketStore } from '../store/websocketStore'

interface LivePriceWidgetProps {
  tokenAddress: string
  title: string
}

function LivePriceWidget({ tokenAddress, title }: LivePriceWidgetProps) {
  const prices = useWebSocketStore((state) => state.prices)
  const subscribeToPriceUpdates = useWebSocketStore((state) => state.subscribeToPriceUpdates)
  const unsubscribeFromPriceUpdates = useWebSocketStore((state) => state.unsubscribeFromPriceUpdates)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const priceData = prices.get(tokenAddress) || null

  useEffect(() => {
    subscribeToPriceUpdates(tokenAddress)

    return () => {
      unsubscribeFromPriceUpdates(tokenAddress)
    }
  }, [tokenAddress])

  useEffect(() => {
    if (priceData) {
      setLoading(false)
      setError(null)
    } else {
      const timeout = setTimeout(() => {
        if (!priceData) {
          setError('Failed to fetch price data')
          setLoading(false)
        }
      }, 10000)

      return () => clearTimeout(timeout)
    }
  }, [priceData])

  if (loading && !priceData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-[#081849]">
        <h3 className="text-xl font-bold text-[#081849] mb-4">{title}</h3>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error || !priceData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-[#081849]">
        <h3 className="text-xl font-bold text-[#081849] mb-4">{title}</h3>
        <div className="text-red-600">{error || 'No data available'}</div>
      </div>
    )
  }

  const priceChangeColor = priceData.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
  const priceChangeSymbol = priceData.priceChange24h >= 0 ? '+' : ''

  const displayAddress = tokenAddress.length > 20
    ? `${tokenAddress.slice(0, 8)}...${tokenAddress.slice(-8)}`
    : tokenAddress

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-[#081849] min-w-[320px] max-w-[450px] overflow-hidden">
      <div className="bg-[#081849] text-center px-6 py-4">
        <h3 className="text-xl font-bold text-white">
          {priceData.name} ({priceData.symbol})
        </h3>
      </div>

      <div className="p-6">
        <div className="mb-4 pb-3 border-b border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Contract</div>
          <div className="text-sm font-mono text-gray-700 break-all">{displayAddress}</div>
        </div>

        <div className="mb-4 pb-4 border-b border-gray-200">
          <div className="mb-3 overflow-x-auto">
            <div className="text-5xl font-bold text-[#081849] whitespace-nowrap">
              ${priceData.price.toLocaleString(undefined, {
                minimumFractionDigits: 4,
                maximumFractionDigits: 8
              })}
            </div>
          </div>

        <div className="mt-3">
          <div className="overflow-x-auto">
            <div className="text-3xl font-semibold text-purple-600 whitespace-nowrap">
              ◎ {priceData.priceSol ? priceData.priceSol.toLocaleString(undefined, {
                minimumFractionDigits: 4,
                maximumFractionDigits: 8
              }) : 'N/A'}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-1">Price in SOL</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-1">24h Change</div>
        <div className={`text-2xl font-bold ${priceChangeColor}`}>
          {priceChangeSymbol}{priceData.priceChange24h.toFixed(2)}%
        </div>
      </div>

        <div className="text-xs text-gray-400 mt-4 pt-3 border-t border-gray-100">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}

export default LivePriceWidget
