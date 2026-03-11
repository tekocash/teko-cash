import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus } from 'lucide-react';

export default function FloatingActionButton() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAddExpense = () => {
    navigate('/transactions?type=expense');
    setIsOpen(false);
  };

  const handleAddIncome = () => {
    navigate('/transactions?type=income');
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-50">
      {/* Menú de opciones con animación */}
      <div className="relative">
        {/* Opciones que aparecen con animación */}
        <div className={`absolute bottom-16 right-0 transition-all duration-300 flex flex-col items-end space-y-2 ${isOpen ? 'opacity-100 transform translate-y-0' : 'opacity-0 pointer-events-none transform translate-y-4'}`}>
          <button
            onClick={handleAddIncome}
            className="flex items-center rounded-full py-2 pl-4 pr-2 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:brightness-110"
          >
            <span className="mr-2 font-medium">Ingreso</span>
            <div className="w-8 h-8 flex items-center justify-center bg-white bg-opacity-20 rounded-full">
              <Plus size={18} strokeWidth={2.5} className="text-white" />
            </div>
          </button>
          
          <button
            onClick={handleAddExpense}
            className="flex items-center rounded-full py-2 pl-4 pr-2 bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:brightness-110"
          >
            <span className="mr-2 font-medium">Gasto</span>
            <div className="w-8 h-8 flex items-center justify-center bg-white bg-opacity-20 rounded-full">
              <Minus size={18} strokeWidth={2.5} className="text-white" />
            </div>
          </button>
        </div>
        
        {/* Botón principal con animación */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-300 transform ${
            isOpen 
              ? 'bg-gray-700 rotate-45 shadow-xl'
              : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:shadow-xl hover:brightness-110'
          }`}
        >
          <Plus 
            size={28} 
            strokeWidth={2.5} 
            className={`transition-transform duration-300 ${isOpen ? 'transform rotate-45' : ''}`} 
          />
        </button>
      </div>
    </div>
  );
}