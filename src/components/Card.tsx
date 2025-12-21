interface CardProps {
  image: string
  title: string
  description: string
}

function Card({ image, title, description }: CardProps) {
  return (
    <div className="relative bg-white w-[35vw] min-w-[280px] rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-[#081849]">
      <div className="relative overflow-hidden">
        <img
          src={image}
          alt={title}
          className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
      <div className="p-6 bg-gradient-to-b from-white to-gray-50">
        <h3 className="text-2xl font-bold text-[#081849] mb-3 group-hover:text-green-600 transition-colors duration-200">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
        <div className="mt-4 pt-4 border-t border-gray-200">
        </div>
      </div>
    </div>
  )
}

export default Card
