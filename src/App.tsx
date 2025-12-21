import { useState } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import Modal from './components/Modal'
import Card from './components/Card'
import WidgetGrid from './components/WidgetGrid'

interface Widget {
  id: string
  type: string
  title: string
  x: number
  y: number
}

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [widgets, setWidgets] = useState<Widget[]>([])

  const handleAddWidget = (type: string, title: string) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      type,
      title,
      x: 50,
      y: 50
    }
    setWidgets([...widgets, newWidget])
    setIsModalOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#ecdfd2]">
      <Navbar onAddWidget={() => setIsModalOpen(true)} />
      <WidgetGrid widgets={widgets} onUpdateWidgets={setWidgets} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="h-full flex flex-col md:flex-row items-center">
          <div className="flex-1 flex items-center justify-center p-6">
            <div onClick={() => handleAddWidget('live-price', 'Live Price Widget')}>
              <Card
                image="https://via.placeholder.com/400x300"
                title="Live Price Widget"
                description="Track real-time price updates with 5-minute change indicators and digital display"
              />
            </div>
          </div>

          <div className="w-0.5 h-3/4 bg-[#081849] rounded-full"></div>

          <div className="flex-1 flex items-center justify-center p-6">
            <div onClick={() => handleAddWidget('trade-feed', 'Trade Feed Widget')}>
              <Card
                image="https://via.placeholder.com/400x300"
                title="Trade Feed Widget"
                description="View the latest 20 transactions with wallet addresses, amounts and Solscan links"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default App
