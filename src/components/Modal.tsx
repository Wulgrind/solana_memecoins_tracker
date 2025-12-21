interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed w-full bg-black/40 backdrop-blur-sm top-16 left-0 right-0 bottom-0 z-50 flex justify-center items-center p-8">
      <div className="h-[85vh] bg-white w-[90vw] xl:w-[80vw] flex flex-col border-2 border-[#081849] rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex bg-gradient-to-r from-[#081849] to-[#0a2159] justify-center items-center px-6 py-6 relative">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-white">Add Widget</h2>
          </div>
          <button
            onClick={onClose}
            className="absolute right-6 text-white/80 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 flex items-center justify-center text-3xl font-bold transition-all duration-200"
          >
            ×
          </button>
        </div>
        <div className="h-full overflow-y-auto pb-20 bg-white/50">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
