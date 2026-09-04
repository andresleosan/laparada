import React from 'react';
import { Button } from '../ui/Button';
import { EstadoDomicilio } from '../../types';
import { ChefHat, Truck, CheckCircle } from 'lucide-react';
import { getAllowedDeliveryTransitions } from '@/utils/deliveryTransitions';

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
  const labels: Record<EstadoDomicilio, string> = {
    pendiente: 'Pendiente',
    en_preparacion: 'Iniciar preparación',
    en_camino: 'Enviar a domicilio',
    entregado: 'Marcar entregado',
  };
  const icons: Record<EstadoDomicilio, React.ReactNode> = {
    pendiente: null,
    en_preparacion: <ChefHat size={16} aria-hidden="true" />,
    en_camino: <Truck size={16} aria-hidden="true" />,
    entregado: <CheckCircle size={16} aria-hidden="true" />,
  };
  const buttonOptions = getAllowedDeliveryTransitions(estado).map((nuevoEstado) => ({
    label: labels[nuevoEstado],
    icon: icons[nuevoEstado],
    nuevoEstado,
  }));

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
        <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-900/20 px-3 py-2 text-center text-sm font-semibold text-green-400">
          <CheckCircle size={16} aria-hidden="true" /> Entregado
        </div>
      )}
    </div>
  );
};
