// src/components/ui/EmptyState.tsx
import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && (
        <Icon className="h-16 w-16 text-neutral-600 mb-4" />
      )}
      <h3 className="text-lg font-semibold text-neutral-50 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-400 max-w-xs mb-6">{description}</p>
      )}
      {children}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-gold-400 text-base-dark font-medium rounded-lg hover:bg-gold-500 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
