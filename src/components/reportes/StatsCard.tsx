import React from 'react';
import { Card } from '@/components/ui/Card';

type Props = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
};

export function StatsCard({ title, value, subtitle, icon, trend }: Props) {
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-neutral-500';

  return (
    <Card className="relative overflow-hidden p-4 bg-gradient-to-br from-neutral-800 to-neutral-900">
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-neutral-400 uppercase">{title}</p>
          {icon && <div className="text-xl opacity-50">{icon}</div>}
        </div>
        <p className="mt-2 text-3xl font-bold text-gold">{value}</p>
        {subtitle && <p className={`mt-1 text-xs ${trendColor}`}>{subtitle}</p>}
      </div>
      {/* Background accent */}
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold opacity-5" />
    </Card>
  );
}
