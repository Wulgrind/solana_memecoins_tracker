import { useState } from 'react'
import LivePriceWidget from './LivePriceWidget'
import TradeFeedWidget from './TradeFeedWidget'
import { useWidgetStore } from '../store/widgetStore'
import { useWebSocketStore } from '../store/websocketStore'
import type { Widget } from '../store/widgetStore'

function WidgetGrid() {
  const { widgets, updateWidgetPosition, removeWidget } = useWidgetStore()
  const { unsubscribeFromPriceUpdates } = useWebSocketStore()
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleDragStart = (e: React.DragEvent, widget: Widget) => {
    setDraggedWidget(widget.id)
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedWidget) return

    const gridRect = e.currentTarget.getBoundingClientRect()
    const newX = e.clientX - gridRect.left - dragOffset.x
    const newY = e.clientY - gridRect.top - dragOffset.y

    updateWidgetPosition(draggedWidget, newX, newY)
    setDraggedWidget(null)
  }

  const handleRemoveWidget = (widgetId: string, tokenAddress: string) => {
    unsubscribeFromPriceUpdates(tokenAddress)
    removeWidget(widgetId)
  }

  const renderWidget = (widget: Widget) => {
    switch (widget.type) {
      case 'live-price':
        return <LivePriceWidget tokenAddress={widget.tokenAddress} title={widget.title} />
      case 'trade-feed':
        return <TradeFeedWidget tokenAddress={widget.tokenAddress} title={widget.title} />
      default:
        return (
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-[#081849]">
            <h3 className="text-xl font-bold text-[#081849]">{widget.title}</h3>
          </div>
        )
    }
  }

  return (
    <>
      <div
        className="hidden md:block relative w-full min-h-[calc(100vh-4rem)]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {widgets.map(widget => (
          <div
            key={widget.id}
            draggable
            onDragStart={(e) => handleDragStart(e, widget)}
            style={{
              position: 'absolute',
              left: `${widget.x}px`,
              top: `${widget.y}px`,
              cursor: draggedWidget === widget.id ? 'grabbing' : 'grab'
            }}
            className="transition-opacity duration-200 hover:opacity-90 relative group"
          >
            <button
              onClick={() => handleRemoveWidget(widget.id, widget.tokenAddress)}
              className="absolute -top-2 -right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg transition-opacity duration-200"
              title="Remove widget"
            >
              ×
            </button>
            {renderWidget(widget)}
          </div>
        ))}

        {widgets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-700 mb-2">No widgets yet</h2>
              <p className="text-gray-500">Click "+ Add Widget" to get started</p>
            </div>
          </div>
        )}
      </div>

      <div className="md:hidden w-full min-h-[calc(100vh-4rem)] p-4">
        {widgets.length === 0 ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-700 mb-2">No widgets yet</h2>
              <p className="text-gray-500 text-sm">Click "+ Add" to get started</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {widgets.map(widget => (
              <div key={widget.id} className="w-full relative group overflow-visible">
                <button
                  onClick={() => handleRemoveWidget(widget.id, widget.tokenAddress)}
                  className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg text-lg font-bold"
                  title="Remove widget"
                >
                  ×
                </button>
                {renderWidget(widget)}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default WidgetGrid
