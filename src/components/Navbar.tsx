interface NavbarProps {
  onAddWidget: () => void
}

function Navbar({ onAddWidget }: NavbarProps) {
  return (
    <nav className="bg-[#081849] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold">Solana Meme Coin Tracker</h1>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={onAddWidget}
              className="bg-white text-gray-800 hover:bg-green-500 hover:text-white px-4 py-1 sm:py-2 rounded-full font-medium transition-colors duration-200"
            >
              + Add Widget
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
