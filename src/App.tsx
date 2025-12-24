import Navbar from './components/Navbar'
import Modal from './components/Modal'
import Card from './components/Card'
import WidgetGrid from './components/WidgetGrid'
import { useWidgetStore } from './store/widgetStore'
import first_img from './assets/indicators.webp'
import second_img from './assets/bullvsbear.webp'

function App() {
  const {
    isModalOpen,
    selectedWidgetType,
    contractAddress,
    openModal,
    closeModal,
    selectWidgetType,
    setContractAddress,
    addWidget,
  } = useWidgetStore()

  const handleWidgetTypeSelect = (type: string, title: string) => {
    selectWidgetType(type, title)
  }

  const handleContractSubmit = () => {
    if (!selectedWidgetType || !contractAddress.trim()) return
    addWidget(selectedWidgetType.type, selectedWidgetType.title, contractAddress.trim())
  }

  return (
    <div className="min-h-screen">
      <Navbar onAddWidget={openModal} />
      <WidgetGrid />

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        {!selectedWidgetType ? (
          <div className="h-full flex flex-col md:flex-row items-center">
            <div className="flex-1 flex items-center justify-center p-6">
              <div onClick={() => handleWidgetTypeSelect('live-price', 'Live Price Widget')}>
                <Card
                  image={first_img}
                  title="Live Price Widget"
                  description="Track real-time price updates with 5-minute change indicators and digital display"
                />
              </div>
            </div>

            <div className="hidden md:block w-0.5 h-3/4 bg-[#081849] rounded-full"></div>

            <div className="flex-1 flex items-center justify-center p-6">
              <div onClick={() => handleWidgetTypeSelect('trade-feed', 'Trade Feed Widget')}>
                <Card
                  image={second_img}
                  title="Trade Feed Widget"
                  description="View the latest 20 transactions with wallet addresses, amounts and Solscan links"
                  imageOffset="translate-y-10"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-8">
            <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-[#081849] w-full max-w-md">
              <h2 className="text-2xl font-bold text-[#081849] mb-6 text-center">
                {selectedWidgetType.title}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contract Address
                  </label>
                  <input
                    type="text"
                    value={contractAddress}
                    onChange={(e) => setContractAddress(e.target.value)}
                    placeholder="Enter token contract address"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#081849] transition-colors text-gray-900 bg-white"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => selectWidgetType('', '')}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleContractSubmit}
                    disabled={!contractAddress.trim()}
                    className="flex-1 px-4 py-3 bg-[#081849] text-white rounded-lg hover:bg-[#0a1f5c] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Create Widget
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default App
