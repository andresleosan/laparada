import React from 'react';
import { Button } from '../ui/Button';
import { EstadoDomicilio } from '../../types';
import { ChefHat, Truck, CheckCircle } from 'lucide-react';

export interface EstadoButtonProps {
  estado: EstadoDomicilio;
  onEstadoChange: (nuevoEstado: EstadoDomicilio) => Promise<void>;
  isLoading?: boolean;
}

export const EstadoButton: React.FC<EstadoButtonProps> = ({
  estado,
  onEstadoChange,
  isLoading = false,
}) => {
  // Definir transiciones permitidas según estado actual
  const transiciones: Record<EstadoDomicilio, { label: string; icon: React.ReactNode; nuevoEstado: EstadoDomicilio }[]> = {
    pendiente: [
      { label: '📋 En Prep', icon: <ChefHat size={16} />, nuevoEstado: 'en_preparacion' },
    ],
    en_preparacion: [
      { label: '🚗 En Camino', icon: <Truck size={16} />, nuevoEstado: 'en_camino' },
    ],
    en_camino: [
      { label: '✅ Entregado', icon: <CheckCircle size={16} />, nuevoEstado: 'entregado' },
    ],
    entregado: [
      // Sin transiciones desde entregado
    ],
  };

  const buttonOptions = transiciones[estado] || [];

  const handleClick = async (nuevoEstado: EstadoDomicilio) => {
    try {
      await onEstadoChange(nuevoEstado);
    } catch (err) {
      console.error('Error changing estado:', err);
    }
  };

  return (
    <div className="flex w-full gap-2">
      {buttonOptions.map((option) => (
        <Button
          key={option.nuevoEstado}
          onClick={() => handleClick(option.nuevoEstado)}
          disabled={isLoading}
          loading={isLoading}
          variant="secondary"
          className="flex flex-1 items-center justify-center gap-2 text-sm"
        >
          {option.icon}
          {option.label}
        </Button>
      ))}

      {buttonOptions.length === 0 && estado === 'entregado' && (
        <div className="w-full rounded-lg bg-green-900/20 px-3 py-2 text-center text-sm text-green-400">
          ✅ Entregado
        </div>
      )}
    </div>
  );
};
