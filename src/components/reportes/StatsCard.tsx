import React from 'react';
import { Card } from '@/components/ui/Card';

type Props = {
  title: string;
  value: string;
  subtitle?: string;
};

export function StatsCard({ title, value, subtitle }: Props) {
  return (
    <Card className="p-4">
      <div>
        <p className="text-xs text-neutral-400">{title}</p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
    </Card>
  );
}
