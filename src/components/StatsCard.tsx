import { cn } from '@/utils/helpers';
import type { ReactNode } from 'react';

interface StatsCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red';
  trend?: { value: number; label: string };
}

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    value: 'text-blue-700',
    border: 'border-blue-100'
  },
  green: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    value: 'text-emerald-700',
    border: 'border-emerald-100'
  },
  yellow: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    value: 'text-amber-700',
    border: 'border-amber-100'
  },
  red: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    value: 'text-red-700',
    border: 'border-red-100'
  }
};

export default function StatsCard({ label, value, icon, color = 'blue', trend }: StatsCardProps) {
  const c = colorMap[color];
  return (
    <div className={cn(
      'group relative overflow-hidden rounded-2xl bg-white border p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
      c.border
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-3xl font-bold tracking-tight', c.value)}>{value}</span>
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              <span className={cn(
                'font-medium',
                trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'
              )}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}
              </span>
              <span className="text-slate-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', c.bg)}>
          <div className={c.icon}>{icon}</div>
        </div>
      </div>
    </div>
  );
}
