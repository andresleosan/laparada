// src/components/ui/Badge.tsx
import React from 'react';
import type { EstadoDomicilio } from '@/types';

interface BadgeProps {
  variant?: 'pendiente' | 'en_preparacion' | 'en_camino' | 'entregado' | 'default' | 'outline' | 'disponible' | 'no-disponible' | 'secondary';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variantStyles = {
    pendiente: 'bg-yellow-500 text-black',
    en_preparacion: 'bg-orange-500 text-black',
    en_camino: 'bg-blue-500 text-white',
    entregado: 'bg-green-500 text-white',
    default: 'bg-neutral-600 text-neutral-50',
    outline: 'border border-neutral-600 text-neutral-300 bg-transparent',
    disponible: 'bg-green-600 hover:bg-green-700 text-white font-semibold',
    'no-disponible': 'bg-red-600 hover:bg-red-700 text-white font-semibold',
    secondary: 'bg-neutral-700 hover:bg-neutral-800 text-neutral-100',
  };

  return (
    <span
      className={`
        inline-block px-3 py-1 text-xs font-semibold rounded-full
        ${variantStyles[variant]}
        ${className || ''}
      `}
    >
      {children}
    </span>
  );
}

/**
 * Badge específico para estados de domicilio con ícono visual
 */
interface BadgeEstadoProps {
  estado: EstadoDomicilio;
  animate?: boolean;
}

export function BadgeEstado({ estado, animate = false }: BadgeEstadoProps) {
  const icons: Record<EstadoDomicilio, string> = {
    pendiente: '⏳',
    en_preparacion: '👨‍🍳',
    en_camino: '🚚',
    entregado: '✅',
  };

  const textos: Record<EstadoDomicilio, string> = {
    pendiente: 'Pendiente',
    en_preparacion: 'En Prep.',
    en_camino: 'En Camino',
    entregado: 'Entregado',
  };

  return (
    <Badge
      variant={estado}
      className={animate && estado === 'pendiente' ? 'animate-pulse-subtle' : ''}
    >
      <span className="mr-1">{icons[estado]}</span>
      {textos[estado]}
    </Badge>
  );
}
